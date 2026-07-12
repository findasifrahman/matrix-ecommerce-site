import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { deleteFromR2, getPublicUrl, uploadToR2 } from '../utils/r2.js';
import { syncProductSearchVector } from '../modules/shopping/shopping.service.js';
import { z } from 'zod';

const auth = [async (request: FastifyRequest, reply: FastifyReply) => {
  const fastify = request.server as FastifyInstance & { authenticate?: any };
  if (!fastify.authenticate) {
    reply.status(500).send({ error: 'Authentication not configured' });
    return;
  }
  await fastify.authenticate(request, reply);
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const req = request as any;
  if (!req.user?.roles?.includes('ADMIN')) {
    reply.status(403).send({ error: 'Forbidden' });
  }
}];

const mediaUploadSchema = z.object({
  category: z.string().optional(),
  tags: z.string().optional(),
});

const parseList = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

const parseJsonMaybe = (value: unknown) => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return value;
};

const parseStringArray = (value: unknown) => parseList(value).filter(Boolean);

const normalizeSpecifications = (value: unknown) => {
  const parsed = parseJsonMaybe(value);
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  return [parsed];
};

const normalizeDetailPoints = (value: unknown) => {
  const parsed = parseJsonMaybe(value);
  if (!parsed) return [];
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => {
      if (typeof entry === 'string') {
        return { text: entry.trim(), depth: 0 };
      }
      if (entry && typeof entry === 'object') {
        return {
          text: String((entry as any).text || '').trim(),
          depth: Math.max(0, Math.min(4, Number((entry as any).depth || 0))),
        };
      }
      return null;
    })
    .filter((entry): entry is { text: string; depth: number } => Boolean(entry?.text));
};

const nullableId = z.string().min(1).optional().nullable();

const slugifySku = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40);

async function generateUniqueProductSku(preferredSku: string | null | undefined, title: string) {
  const base = slugifySku(preferredSku?.trim() || title || 'product') || 'product';
  let candidate = base;
  let attempt = 0;

  while (await prisma.product.findFirst({ where: { sku: candidate }, select: { id: true } })) {
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }

  if (!candidate || candidate.length < 3) {
    return `prod-${randomUUID().slice(0, 8)}`;
  }

  return candidate;
}

function toAdminProductSaveError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (error instanceof Prisma.PrismaClientValidationError) {
    if (message.includes('Argument `category` is missing')) {
      return 'Product save failed because the Prisma client is not aligned with the current schema. Run `pnpm --filter @matrix-ecommerce/api db:generate` and restart the API server.';
    }
    return message;
  }
  if (message) {
    return message;
  }
  return 'Failed to save product';
}

const normalizeCouponCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');

const couponSchema = z.object({
  code: z.string().min(2).max(64).transform(normalizeCouponCode),
  title: z.string().optional(),
  description: z.string().optional(),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.number().positive(),
  max_discount_amount: z.number().min(0).optional().nullable(),
  min_order_amount: z.number().min(0).default(0),
  currency: z.string().min(1).default('BDT'),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  usage_limit: z.number().int().positive().optional().nullable(),
  per_user_limit: z.number().int().positive().default(1),
  is_active: z.boolean().default(true),
});

const shippingChargeSchema = z.object({
  delivery_area: z.string().trim().min(2).max(120),
  cost: z.number().min(0),
  is_active: z.boolean().default(true),
});

function parseCouponDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid coupon date');
  }
  return date;
}

function buildCategoryTree(rows: any[]) {
  const nodes = rows.map((row) => ({ ...row, children: [] as any[] }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: any[] = [];
  for (const node of nodes) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (items: any[]) => items
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name).localeCompare(String(b.name)))
    .map((item) => ({ ...item, children: sortNodes(item.children || []) }));
  return sortNodes(roots);
}

async function getDefaultSellerAndCategory() {
  const [seller, category] = await Promise.all([
    prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: { name: 'SELLER' },
          },
        },
      },
    }),
    prisma.productCategory.findFirst({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return { seller, category };
}

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard', { preHandler: auth }, async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const completedStatuses = ['received', 'completed'];
    const closedStatuses = [...completedStatuses, 'cancelled'];

    const [users, products, orders, soldThisMonth, completedOrders, pendingOrders, recentOrders, weeklySales, monthlySales] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { created_at: { gte: startOfMonth }, status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { status: { in: completedStatuses } } }),
      prisma.order.count({ where: { status: { notIn: closedStatuses } } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            include: {
              customerProfile: true,
            },
          },
          items: {
            include: {
              product: true,
              seller: {
                include: { sellerProfile: true },
              },
            },
          },
          shippingAddress: true,
          paymentProofs: true,
        },
      }),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('week', created_at) AS period, COUNT(*)::int AS orders, COALESCE(SUM(total), 0)::float AS revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('month', created_at) AS period, COUNT(*)::int AS orders, COALESCE(SUM(total), 0)::float AS revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
    ]);

    return {
      users,
      products,
      orders,
      soldThisMonth: soldThisMonth._sum.total || 0,
      completedOrders,
      pendingOrders,
      recentOrders,
      weeklySales,
      monthlySales,
    };
  });

  fastify.get('/potential-leads', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as { search?: string; page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const searchPattern = search ? `%${search}%` : null;

    const searchSql = searchPattern
      ? Prisma.sql`
          AND (
            u.email ILIKE ${searchPattern}
            OR u.phone ILIKE ${searchPattern}
            OR cp.full_name ILIKE ${searchPattern}
            OR ci.title_snapshot ILIKE ${searchPattern}
          )
        `
      : Prisma.empty;

    const baseSql = Prisma.sql`
      WITH aggregated AS (
        SELECT
          c.id AS cart_id,
          u.id AS user_id,
          u.email,
          u.phone,
          cp.full_name,
          MIN(ci.created_at) AS first_cart_item_at,
          MAX(ci.created_at) AS last_cart_item_at,
          COUNT(ci.id)::int AS item_count,
          COALESCE(SUM(ci.qty), 0)::int AS total_qty,
          COALESCE(SUM(ci.qty * ci.price_snapshot), 0)::float AS cart_value,
          COALESCE(MAX(ci.currency_snapshot), 'BDT') AS currency,
          jsonb_agg(
            jsonb_build_object(
              'id', ci.id,
              'title', COALESCE(ci.title_snapshot, p.title),
              'qty', ci.qty,
              'price', ci.price_snapshot,
              'currency', ci.currency_snapshot,
              'imageUrl', COALESCE(ci.image_url_snapshot, ma.public_url),
              'sellerId', ci.seller_id,
              'sellerEmail', seller.email,
              'sellerShop', sp.shop_name,
              'createdAt', ci.created_at
            )
            ORDER BY ci.created_at DESC
          ) AS items
        FROM carts c
        JOIN users u ON u.id = c.user_id
        JOIN cart_items ci ON ci.cart_id = c.id
        LEFT JOIN products p ON p.id = ci.product_id
        LEFT JOIN media_assets ma ON ma.id = p.cover_asset_id
        LEFT JOIN users seller ON seller.id = ci.seller_id
        LEFT JOIN seller_profiles sp ON sp.user_id = seller.id
        LEFT JOIN customer_profiles cp ON cp.user_id = u.id
        WHERE ci.created_at >= NOW() - INTERVAL '1 month'
        ${searchSql}
        GROUP BY c.id, u.id, u.email, u.phone, cp.full_name
      ),
      leads AS (
        SELECT *
        FROM aggregated a
        WHERE NOT EXISTS (
          SELECT 1
          FROM orders o
          WHERE o.user_id = a.user_id
            AND o.created_at >= a.first_cart_item_at
        )
      )
    `;

    const [countRows, leads] = await Promise.all([
      prisma.$queryRaw(Prisma.sql`
        ${baseSql}
        SELECT COUNT(*)::int AS total FROM leads
      `) as Promise<Array<{ total: number }>>,
      prisma.$queryRaw(Prisma.sql`
        ${baseSql}
        SELECT *
        FROM leads
        ORDER BY last_cart_item_at DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `) as Promise<any[]>,
    ]);

    const total = countRows[0]?.total || 0;
    return {
      leads,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/orders', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      status?: string;
      payment_status?: string;
      search?: string;
      page?: string;
      limit?: string;
      from?: string;
      to?: string;
      pending_first?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const search = query.search?.trim();
    const pendingFirst = query.pending_first !== '0';

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.payment_status) where.payment_status = query.payment_status;
    if (query.from || query.to) {
      where.created_at = {};
      if (query.from) where.created_at.gte = new Date(query.from);
      if (query.to) where.created_at.lte = new Date(query.to);
    }
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { shippingAddress: { name: { contains: search, mode: 'insensitive' } } },
        { shippingAddress: { city: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderInclude = {
      items: {
        include: {
          product: true,
          seller: {
            include: { sellerProfile: true },
          },
        },
      },
      shippingAddress: true,
      shippingUpdates: true,
      statusEvents: true,
      paymentProofs: {
        include: {
          asset: true,
          reviewer: true,
        },
      },
      user: {
        include: {
          customerProfile: true,
        },
      },
    };

    const total = await prisma.order.count({ where });
    let orders: any[] = [];
    if (pendingFirst) {
      const clauses: any[] = [];
      if (query.status) clauses.push(Prisma.sql`o.status = ${query.status}`);
      if (query.payment_status) clauses.push(Prisma.sql`o.payment_status = ${query.payment_status}`);
      if (query.from) clauses.push(Prisma.sql`o.created_at >= ${new Date(query.from)}`);
      if (query.to) clauses.push(Prisma.sql`o.created_at <= ${new Date(query.to)}`);
      if (search) {
        const searchPattern = `%${search}%`;
        clauses.push(Prisma.sql`(
          o.order_number ILIKE ${searchPattern}
          OR o.notes ILIKE ${searchPattern}
          OR u.email ILIKE ${searchPattern}
          OR u.phone ILIKE ${searchPattern}
          OR a.name ILIKE ${searchPattern}
          OR a.city ILIKE ${searchPattern}
        )`);
      }

      const whereSql = clauses.length
        ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}`
        : Prisma.empty;
      const rows = await prisma.$queryRaw(Prisma.sql`
        SELECT o.id
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN addresses a ON a.id = o.shipping_address_id
        ${whereSql}
        ORDER BY
          CASE WHEN EXISTS (
            SELECT 1
            FROM order_items oi
            WHERE oi.order_id = o.id AND oi.seller_status = 'pending_review'
          ) THEN 0 ELSE 1 END ASC,
          o.created_at DESC
        OFFSET ${(page - 1) * limit}
        LIMIT ${limit}
      `) as Array<{ id: string }>;
      const ids = rows.map((row) => row.id);
      if (ids.length > 0) {
        const fetched = await prisma.order.findMany({
          where: { id: { in: ids } },
          include: orderInclude,
        });
        const byId = new Map(fetched.map((order) => [order.id, order]));
        orders = ids.map((id) => byId.get(id)).filter(Boolean);
      }
    } else {
      orders = await prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
    }

    return {
      orders,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.patch('/orders/:id/status', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      status: z.enum(['pending_purchase', 'purchased', 'in_warehouse', 'shipped', 'received', 'cancelled']),
      note: z.string().optional(),
    }).parse(request.body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: body.status },
    });

    await prisma.orderStatusEvent.create({
      data: {
        order_id: id,
        status_from: order.status,
        status_to: body.status,
        note: body.note || null,
        created_by: req.user.id,
      },
    });

    return updated;
  });

  fastify.patch('/orders/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      customer: z.object({
        phone: z.string().trim().min(5).max(40),
        email: z.string().trim().email().nullable().optional(),
      }),
      shipping: z.object({
        name: z.string().trim().min(1).max(160),
        phone: z.string().trim().min(5).max(40),
        address_line: z.string().trim().min(3).max(1000),
        city: z.string().trim().min(1).max(160),
        postal_code: z.string().trim().max(40).nullable().optional(),
        country: z.string().trim().min(1).max(120).default('Bangladesh'),
      }),
      notes: z.string().trim().max(2000).nullable().optional(),
      shipping_fee: z.number().min(0),
      estimated_weight_kg: z.number().min(0),
      items: z.array(z.object({
        id: z.string().uuid().optional(),
        product_id: z.string().uuid(),
        qty: z.number().int().min(1).max(9999),
        price: z.number().min(0),
      })).min(1),
    }).parse(request.body);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) return reply.status(404).send({ error: 'Order not found' });

    const productIds = Array.from(new Set(body.items.map((item) => item.product_id)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        seller: { include: { sellerProfile: true } },
        coverAsset: true,
        orderItems: {
          where: { image_url_snapshot: { not: null } },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        cartItems: {
          where: { image_url_snapshot: { not: null } },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
    if (products.length !== productIds.length) {
      return reply.status(400).send({ error: 'One or more selected products no longer exist' });
    }
    const galleryAssetIds = Array.from(new Set(products.flatMap((product: any) => Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids : [])));
    const galleryAssets = galleryAssetIds.length
      ? await prisma.mediaAsset.findMany({ where: { id: { in: galleryAssetIds } } })
      : [];
    const galleryAssetById = new Map(galleryAssets.map((asset) => [asset.id, asset]));
    const productImageUrl = (product: any) => {
      const galleryIds = Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids : [];
      const galleryAsset = galleryIds.map((assetId: string) => galleryAssetById.get(assetId)).find(Boolean);
      return product.coverAsset?.thumbnail_url
        || product.coverAsset?.public_url
        || product.orderItems?.[0]?.image_url_snapshot
        || product.cartItems?.[0]?.image_url_snapshot
        || galleryAsset?.thumbnail_url
        || galleryAsset?.public_url
        || null;
    };
    const productsById = new Map<string, any>(products.map((product: any) => [product.id, product]));
    const currentById = new Map<string, any>(order.items.map((item: any) => [item.id, item]));
    for (const item of body.items) {
      if (item.id && currentById.get(item.id)?.product_id !== item.product_id) {
        return reply.status(400).send({ error: 'An order item does not match the selected product' });
      }
    }

    const subtotal = body.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const total = Math.max(0, subtotal - order.discount_amount + body.shipping_fee);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: order.user_id },
          data: { phone: body.customer.phone, email: body.customer.email || null },
        });
        await tx.address.update({
          where: { id: order.shipping_address_id },
          data: {
            name: body.shipping.name,
            phone: body.shipping.phone,
            address_line: body.shipping.address_line,
            city: body.shipping.city,
            postal_code: body.shipping.postal_code || null,
            country: body.shipping.country,
          },
        });

        const retainedIds = body.items.flatMap((item) => item.id ? [item.id] : []);
        await tx.orderItem.deleteMany({
          where: { order_id: id, ...(retainedIds.length ? { id: { notIn: retainedIds } } : {}) },
        });
        for (const item of body.items) {
          if (item.id) {
            await tx.orderItem.update({ where: { id: item.id }, data: { qty: item.qty, price_snapshot: item.price } });
            continue;
          }
          const product = productsById.get(item.product_id)!;
          await tx.orderItem.create({
            data: {
              order_id: id,
              product_id: product.id,
              seller_id: product.seller_id,
              qty: item.qty,
              price_snapshot: item.price,
              currency_snapshot: product.currency,
              title_snapshot: product.title,
              sku_details_snapshot: product.sku ? { sku: product.sku } : undefined,
              image_url_snapshot: productImageUrl(product),
              source_url_snapshot: product.source_url,
              product_url_snapshot: product.product_url,
              seller_name_snapshot: product.vendor_name || product.seller.sellerProfile?.shop_name || product.seller.email,
              vendor_id_snapshot: product.vendor_id,
              shop_url_snapshot: product.shop_url,
              estimated_weight_kg: product.weight_kg ?? 0,
            },
          });
        }
        await tx.order.update({
          where: { id },
          data: {
            notes: body.notes || null,
            shipping_fee: body.shipping_fee,
            estimated_weight_kg: body.estimated_weight_kg,
            subtotal,
            total,
          },
        });
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return reply.status(409).send({ error: 'That phone number or email is already used by another customer' });
      throw error;
    }

    return { success: true };
  });

  fastify.patch('/order-items/:id/fulfillment', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      purchase_order_no: z.string().trim().max(120).nullable().optional(),
      tracking_no: z.string().trim().max(120).nullable().optional(),
    }).parse(request.body);

    const item = await prisma.orderItem.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: 'Order item not found' });
    }

    return prisma.orderItem.update({
      where: { id },
      data: {
        purchase_order_no: body.purchase_order_no === undefined ? undefined : body.purchase_order_no || null,
        tracking_no: body.tracking_no === undefined ? undefined : body.tracking_no || null,
      },
    });
  });

  fastify.get('/payment-proofs', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as { status?: string };
    return prisma.paymentProof.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: {
        order: {
          include: {
            user: true,
            items: {
              include: {
                product: true,
                seller: {
                  include: { sellerProfile: true },
                },
              },
            },
          },
        },
        asset: true,
        reviewer: true,
      },
      orderBy: { created_at: 'desc' },
    });
  });

  fastify.patch('/payment-proofs/:id/approve', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      note: z.string().optional(),
    }).parse(request.body);

    const proof = await prisma.paymentProof.findUnique({ where: { id } });
    if (!proof) {
      return reply.status(404).send({ error: 'Payment proof not found' });
    }

    return prisma.$transaction(async (tx) => {
      const updatedProof = await tx.paymentProof.update({
        where: { id },
        data: {
          status: 'approved',
          reviewed_by: req.user.id,
          reviewed_at: new Date(),
          notes: body.note || proof.notes,
        },
      });

      const order = await tx.order.findUnique({
        where: { id: proof.order_id },
        include: { items: true },
      });

      if (order) {
        const nextStatus = order.status === 'pending_payment' || order.status === 'pending_review'
          ? 'pending_purchase'
          : order.status;
        if (nextStatus !== order.status) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: nextStatus,
              payment_status: 'approved',
            },
          });
          await tx.orderStatusEvent.create({
            data: {
              order_id: order.id,
              status_from: order.status,
              status_to: nextStatus,
              note: 'Payment proof approved',
              created_by: req.user.id,
            },
          });
        } else if (order.payment_status !== 'approved') {
          await tx.order.update({
            where: { id: order.id },
            data: { payment_status: 'approved' },
          });
        }
      }

      return updatedProof;
    });
  });

  fastify.patch('/payment-proofs/:id/reject', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      note: z.string().optional(),
    }).parse(request.body);

    const proof = await prisma.paymentProof.findUnique({ where: { id } });
    if (!proof) {
      return reply.status(404).send({ error: 'Payment proof not found' });
    }
    if (proof.status === 'approved') {
      return reply.status(409).send({ error: 'Approved payment proof cannot be rejected' });
    }

    return prisma.$transaction(async (tx) => {
      const updatedProof = await tx.paymentProof.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewed_by: req.user.id,
          reviewed_at: new Date(),
          notes: body.note || proof.notes,
        },
      });

      const approvedProof = await tx.paymentProof.findFirst({
        where: {
          order_id: proof.order_id,
          status: 'approved',
        },
        select: { id: true },
      });

      if (!approvedProof) {
        const submittedProof = await tx.paymentProof.findFirst({
          where: {
            order_id: proof.order_id,
            status: 'submitted',
          },
          select: { id: true },
        });
        await tx.order.update({
          where: { id: proof.order_id },
          data: { payment_status: submittedProof ? 'submitted' : 'rejected' },
        });
      }

      return updatedProof;
    });
  });

  fastify.get('/products', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      category_id?: string;
      main_category_id?: string;
      seller_id?: string;
      status?: string;
      source_kind?: string;
      autocomplete?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)));
    const search = query.search?.trim();
    const categoryId = query.category_id?.trim();
    const mainCategoryId = query.main_category_id?.trim();
    const sellerId = query.seller_id?.trim();
    const status = query.status?.trim();
    const sourceKind = query.source_kind?.trim();
    const autocomplete = query.autocomplete === '1' || query.autocomplete === 'true';

    const where: any = {};
    if (categoryId) {
      where.category_id = categoryId;
    }
    if (mainCategoryId) {
      where.main_category_id = mainCategoryId;
    }
    if (sellerId) {
      where.seller_id = sellerId;
    }
    if (status) {
      where.status = status;
    }
    if (sourceKind === 'all') {
      // Explicitly include every source kind.
    } else if (sourceKind) {
      where.source_kind = sourceKind;
    } else {
      where.source_kind = 'manual';
    }
    if (search && autocomplete) {
      where.OR = [
        { title: { startsWith: search, mode: 'insensitive' } },
        { sku: { startsWith: search, mode: 'insensitive' } },
        { external_id: { startsWith: search, mode: 'insensitive' } },
        { brand: { startsWith: search, mode: 'insensitive' } },
      ];
    } else if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { external_id: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { source_url: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: {
            include: {
              parent: true,
            },
          },
          mainCategory: true,
          taxonomyBrand: true,
          brandModel: true,
          productType: true,
          seller: {
            include: { sellerProfile: true },
          },
          coverAsset: true,
          orderItems: {
            where: { image_url_snapshot: { not: null } },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          cartItems: {
            where: { image_url_snapshot: { not: null } },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          videoAsset: true,
        },
        orderBy: autocomplete ? [{ title: 'asc' }] : [{ created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const galleryAssetIds = Array.from(new Set(products.flatMap((product: any) => Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids : [])));
    const galleryAssets = galleryAssetIds.length
      ? await prisma.mediaAsset.findMany({ where: { id: { in: galleryAssetIds } } })
      : [];
    const galleryAssetById = new Map(galleryAssets.map((asset) => [asset.id, asset]));
    const productImageUrl = (product: any) => {
      const galleryIds = Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids : [];
      const galleryAsset = galleryIds.map((assetId: string) => galleryAssetById.get(assetId)).find(Boolean);
      return product.coverAsset?.thumbnail_url
        || product.coverAsset?.public_url
        || product.orderItems?.[0]?.image_url_snapshot
        || product.cartItems?.[0]?.image_url_snapshot
        || galleryAsset?.thumbnail_url
        || galleryAsset?.public_url
        || null;
    };

    return {
      products: products.map((product: any) => ({
        ...product,
        image_url: productImageUrl(product),
      })),
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit,
    };
  });

  fastify.get('/shipping-charges', { preHandler: auth }, async () => {
    return prisma.shippingCharge.findMany({
      orderBy: [{ cost: 'asc' }, { delivery_area: 'asc' }],
    });
  });

  fastify.post('/shipping-charges', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = shippingChargeSchema.parse(request.body);

    try {
      const charge = await prisma.shippingCharge.create({
        data: {
          delivery_area: body.delivery_area,
          cost: Number(body.cost || 0),
          is_active: body.is_active,
        },
      });
      return reply.status(201).send(charge);
    } catch (error: any) {
      if (String(error?.message || '').includes('shipping_charges_delivery_area_key')) {
        return reply.status(409).send({ error: 'A shipping charge already exists for this delivery area.' });
      }
      throw error;
    }
  });

  fastify.patch('/shipping-charges/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = shippingChargeSchema.partial().parse(request.body);

    const existing = await prisma.shippingCharge.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Shipping charge not found' });
    }

    try {
      return await prisma.shippingCharge.update({
        where: { id },
        data: {
          delivery_area: body.delivery_area === undefined ? undefined : body.delivery_area,
          cost: body.cost === undefined ? undefined : Number(body.cost),
          is_active: body.is_active === undefined ? undefined : body.is_active,
        },
      });
    } catch (error: any) {
      if (String(error?.message || '').includes('shipping_charges_delivery_area_key')) {
        return reply.status(409).send({ error: 'A shipping charge already exists for this delivery area.' });
      }
      throw error;
    }
  });

  fastify.delete('/shipping-charges/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.shippingCharge.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Shipping charge not found' });
    }
    await prisma.shippingCharge.delete({ where: { id } });
    return { success: true };
  });

  fastify.post('/products', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      category_id: nullableId,
      main_category_id: nullableId,
      brand_id: nullableId,
      brand_model_id: nullableId,
      product_type_id: nullableId,
      title: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      original_price: z.number().positive().optional().nullable(),
      currency: z.string().optional(),
      rating: z.number().min(0).max(5).optional().nullable(),
      review_count: z.number().int().min(0).optional().nullable(),
      stock_qty: z.number().int().min(0).optional(),
      minimum_order_qty: z.number().int().min(1).optional(),
      sku: z.string().optional(),
      seller_name: z.string().optional(),
      brand: z.string().optional(),
      source_kind: z.string().optional(),
      source_url: z.string().optional(),
      product_url: z.string().optional(),
      external_id: z.string().optional(),
      vendor_id: z.string().optional(),
      vendor_name: z.string().optional(),
      shop_url: z.string().optional(),
      weight_kg: z.number().optional(),
      cover_asset_id: z.string().optional(),
      gallery_asset_ids: z.any().optional(),
      video_asset_id: z.string().optional(),
      specifications: z.any().optional(),
      detail_points: z.any().optional(),
    }).parse(request.body);
    const req = request as any;
    const sku = await generateUniqueProductSku(body.sku, body.title);

    let product;
    try {
      product = await prisma.product.create({
        data: {
          seller_id: req.user.id,
          category_id: body.category_id || null,
          main_category_id: body.main_category_id || null,
          brand_id: body.brand_id || null,
          brand_model_id: body.brand_model_id || null,
          product_type_id: body.product_type_id || null,
          title: body.title,
          description: body.description || null,
          price: body.price,
          original_price: body.original_price ?? null,
          currency: body.currency || 'BDT',
          rating: body.rating ?? null,
          review_count: body.review_count ?? 0,
          stock_qty: body.stock_qty ?? 0,
          minimum_order_qty: body.minimum_order_qty ?? 1,
          sku,
          brand: body.seller_name || body.brand || null,
          source_kind: body.source_kind || 'manual',
          source_url: body.source_url || null,
          product_url: body.product_url || body.source_url || null,
          external_id: body.external_id || null,
          vendor_id: body.vendor_id || null,
          vendor_name: body.vendor_name || body.seller_name || body.brand || null,
          shop_url: body.shop_url || null,
          weight_kg: body.weight_kg ?? null,
          cover_asset_id: body.cover_asset_id || null,
          gallery_asset_ids: parseStringArray(body.gallery_asset_ids),
          video_asset_id: body.video_asset_id || null,
          dimensions: { detailPoints: normalizeDetailPoints(body.detail_points) },
          specifications: normalizeSpecifications(body.specifications),
          status: 'published',
        },
      });
    } catch (error) {
      return reply.status(400).send({ error: toAdminProductSaveError(error) });
    }
    await syncProductSearchVector(product.id);

    return reply.status(201).send(product);
  });

  fastify.patch('/products/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        price: body.price ?? undefined,
        original_price: body.original_price ?? undefined,
        currency: body.currency ?? undefined,
        rating: body.rating ?? undefined,
        review_count: body.review_count ?? undefined,
        stock_qty: body.stock_qty ?? undefined,
        minimum_order_qty: body.minimum_order_qty ?? undefined,
        status: body.status ?? undefined,
        brand: body.seller_name ?? body.brand ?? undefined,
        source_kind: body.source_kind ?? undefined,
        source_url: body.source_url ?? undefined,
        product_url: body.product_url ?? undefined,
        external_id: body.external_id ?? undefined,
        vendor_id: body.vendor_id ?? undefined,
        vendor_name: body.vendor_name ?? undefined,
        shop_url: body.shop_url ?? undefined,
        sku: body.sku ?? undefined,
        weight_kg: body.weight_kg ?? undefined,
        cover_asset_id: body.cover_asset_id ?? undefined,
        category_id: body.category_id ?? undefined,
        main_category_id: body.main_category_id ?? undefined,
        brand_id: body.brand_id ?? undefined,
        brand_model_id: body.brand_model_id ?? undefined,
        product_type_id: body.product_type_id ?? undefined,
        gallery_asset_ids: body.gallery_asset_ids !== undefined ? parseStringArray(body.gallery_asset_ids) : undefined,
        video_asset_id: body.video_asset_id ?? undefined,
        dimensions: body.detail_points !== undefined ? { detailPoints: normalizeDetailPoints(body.detail_points) } : undefined,
        specifications: body.specifications !== undefined ? normalizeSpecifications(body.specifications) : undefined,
      },
    });
    await syncProductSearchVector(updated.id);
    return updated;
  });

  fastify.delete('/products/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    await prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  });

  fastify.get('/users', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      role?: string;
      status?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const search = query.search?.trim();
    const role = query.role?.trim().toUpperCase();
    const status = query.status?.trim().toLowerCase();

    const where: any = {};
    if (role === 'CUSTOMER' || role === 'SELLER' || role === 'ADMIN') {
      where.roles = {
        some: {
          role: { name: role },
        },
      };
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { customerProfile: { full_name: { contains: search, mode: 'insensitive' } } },
        { sellerProfile: { shop_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status === 'active' || status === 'blocked') {
      where.status = status;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          roles: { include: { role: true } },
          customerProfile: true,
          sellerProfile: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      users,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/crm/contacts', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      audience?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
    const search = query.search?.trim();
    const audience = query.audience?.trim();
    const completedStatuses = ['received', 'completed'];
    const closedStatuses = [...completedStatuses, 'cancelled'];

    const where: any = {
      roles: {
        some: {
          role: { name: 'CUSTOMER' },
        },
      },
    };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { customerProfile: { full_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (audience === 'placed-order') {
      where.orders = { some: {} };
    } else if (audience === 'remaining-order') {
      where.orders = { some: { status: { notIn: closedStatuses } } };
    } else if (audience === 'completed-order') {
      where.orders = { some: { status: { in: completedStatuses } } };
    } else if (audience === 'cancelled-order') {
      where.orders = { some: { status: 'cancelled' } };
    } else if (audience === 'created-account') {
      where.orders = { none: {} };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          customerProfile: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const userIds = users.map((user) => user.id);
    const orders = userIds.length
      ? await prisma.order.findMany({
          where: { user_id: { in: userIds } },
          select: {
            user_id: true,
            status: true,
            total: true,
            _count: { select: { items: true } },
          },
        })
      : [];
    const ordersByUser = new Map<string, typeof orders>();
    for (const order of orders) {
      if (!ordersByUser.has(order.user_id)) ordersByUser.set(order.user_id, []);
      ordersByUser.get(order.user_id)!.push(order);
    }

    const contacts = users.map((user) => {
      const userOrders = ordersByUser.get(user.id) || [];
      const placedOrders = userOrders.length;
      const completedOrders = userOrders.filter((order) => completedStatuses.includes(order.status)).length;
      const cancelledOrders = userOrders.filter((order) => order.status === 'cancelled').length;
      const remainingOrders = userOrders.filter((order) => !closedStatuses.includes(order.status)).length;
      const itemCount = userOrders.reduce((sum, order) => sum + (order._count?.items || 0), 0);
      const ltv = userOrders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + Number(order.total || 0), 0);
      const audiences = ['created-account'];
      if (placedOrders > 0) audiences.push('placed-order');
      if (remainingOrders > 0) audiences.push('remaining-order');
      if (completedOrders > 0) audiences.push('completed-order');
      if (cancelledOrders > 0) audiences.push('cancelled-order');

      return {
        id: user.id,
        name: user.customerProfile?.full_name || user.email || user.phone || 'Contact',
        phone: user.phone,
        email: user.email,
        status: user.status,
        created_at: user.created_at,
        preferred_currency: user.customerProfile?.preferred_currency || 'BDT',
        audiences,
        order_summary: {
          placed: placedOrders,
          remaining: remainingOrders,
          completed: completedOrders,
          cancelled: cancelledOrders,
          items: itemCount,
        },
        ltv,
      };
    });

    return {
      contacts,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/customers/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const customer = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        customerProfile: {
          include: {
            avatarAsset: true,
            internalNoteUpdatedBy: true,
          },
        },
        addresses: {
          orderBy: { created_at: 'desc' },
        },
        orders: {
          orderBy: { created_at: 'desc' },
          take: 20,
          include: {
            items: {
              include: {
                product: true,
              },
            },
            shippingAddress: true,
          },
        },
      },
    });

    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    return customer;
  });

  fastify.patch('/customers/:id/review', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const { id } = request.params as { id: string };
    const body = z.object({
      rating: z.number().int().min(1).max(10).optional(),
      note: z.string().optional(),
    }).parse(request.body);

    const customer = await prisma.user.findUnique({
      where: { id },
      include: { customerProfile: true },
    });

    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    await prisma.customerProfile.upsert({
      where: { user_id: id },
      update: {
        internal_rating: body.rating ?? undefined,
        internal_note: body.note ?? undefined,
        internal_note_updated_by: req.user.id,
        internal_note_updated_at: new Date(),
      },
      create: {
        user_id: id,
        internal_rating: body.rating ?? null,
        internal_note: body.note ?? null,
        internal_note_updated_by: req.user.id,
        internal_note_updated_at: new Date(),
      },
    });

    return prisma.user.findUnique({
      where: { id },
      include: {
        customerProfile: true,
      },
    });
  });

  fastify.delete('/users/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const roleNames = user.roles.map((entry) => entry.role.name);
    if (!roleNames.includes('CUSTOMER')) {
      return reply.status(400).send({ error: 'Only customer users can be deleted from this screen' });
    }

    await prisma.user.delete({ where: { id } });
    return { message: 'Customer deleted' };
  });

  fastify.get('/sellers', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
    const search = query.search?.trim();

    const where: any = {
      roles: {
        some: {
          role: {
            name: 'SELLER',
          },
        },
      },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { sellerProfile: { shop_name: { contains: search, mode: 'insensitive' } } },
        { sellerProfile: { display_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, sellers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          roles: { include: { role: true } },
          sellerProfile: true,
          products: true,
          sellerOrderItems: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      sellers,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/sellers/:id/report', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const query = request.query as {
      from?: string;
      to?: string;
    };

    const seller = await prisma.user.findUnique({
      where: { id },
      include: {
        sellerProfile: true,
      },
    });
    if (!seller) {
      return reply.status(404).send({ error: 'Seller not found' });
    }

    const dateWhere: any = { seller_id: id };
    if (query.from || query.to) {
      dateWhere.created_at = {};
      if (query.from) dateWhere.created_at.gte = new Date(query.from);
      if (query.to) dateWhere.created_at.lte = new Date(query.to);
    }

    const [items, weeklySales, monthlySales] = await Promise.all([
      prisma.orderItem.findMany({
        where: dateWhere,
        include: {
          order: {
            include: {
              user: {
                include: { customerProfile: true },
              },
              shippingAddress: true,
              paymentProofs: {
                include: { asset: true },
              },
            },
          },
          product: {
            include: { category: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 200,
      }),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('week', o.created_at) AS period,
               COUNT(*)::int AS items,
               COALESCE(SUM(oi.price_snapshot * oi.qty), 0)::float AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.seller_id = ${id} AND o.created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
      prisma.$queryRaw(Prisma.sql`
        SELECT date_trunc('month', o.created_at) AS period,
               COUNT(*)::int AS items,
               COALESCE(SUM(oi.price_snapshot * oi.qty), 0)::float AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.seller_id = ${id} AND o.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1 DESC
      `),
    ]);

    return {
      seller,
      items,
      weeklySales,
      monthlySales,
    };
  });

  fastify.patch('/users/:id/roles', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const rawBody = request.body as any;
    const body = z.object({
      roles: z.array(z.string().min(1)).min(1).optional(),
      role_ids: z.array(z.string().min(1)).min(1).optional(),
    }).parse(rawBody);
    const roleNames = body.roles || body.role_ids || [];

    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await prisma.userRole.deleteMany({ where: { user_id: id } });
    for (const roleName of roleNames) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
      await prisma.userRole.create({
        data: {
          user_id: id,
          role_id: role.id,
        },
      });
    }

    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
      },
    });
  });

  fastify.put('/users/:id/roles', { preHandler: auth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rawBody = request.body as any;
    const body = z.object({
      roles: z.array(z.string().min(1)).min(1).optional(),
      role_ids: z.array(z.string().min(1)).min(1).optional(),
    }).parse(rawBody);
    const roleNames = body.roles || body.role_ids || [];

    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await prisma.userRole.deleteMany({ where: { user_id: id } });
    for (const roleName of roleNames) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
      await prisma.userRole.create({
        data: {
          user_id: id,
          role_id: role.id,
        },
      });
    }

    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
      },
    });
  });

  fastify.get('/categories', { preHandler: auth }, async () => {
    return prisma.productCategory.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  });

  fastify.get('/categories/tree', { preHandler: auth }, async () => {
    const categories = await prisma.productCategory.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    return buildCategoryTree(categories);
  });

  fastify.get('/service-categories', { preHandler: auth }, async () => {
    return prisma.productCategory.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  });

  fastify.post('/categories', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      parent_id: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }).parse(request.body);

    const category = await prisma.productCategory.create({
      data: {
        name: body.name,
        slug: body.slug,
        parent_id: body.parent_id || null,
        description: body.description || null,
        icon: body.icon || null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      },
    });

    return reply.status(201).send(category);
  });

  fastify.patch('/categories/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const category = await prisma.productCategory.findUnique({ where: { id } });
    if (!category) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    return prisma.productCategory.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        slug: body.slug ?? undefined,
        parent_id: body.parent_id ?? undefined,
        description: body.description ?? undefined,
        icon: body.icon ?? undefined,
        sort_order: body.sort_order ?? undefined,
        is_active: body.is_active ?? undefined,
      },
    });
  });

  fastify.delete('/categories/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const category = await prisma.productCategory.findUnique({ where: { id } });
    if (!category) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    await prisma.productCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  });

  fastify.get('/taxonomy', { preHandler: auth }, async () => {
    const [mainCategories, brands, productTypes] = await Promise.all([
      prisma.mainCategory.findMany({
        include: {
          brandLinks: {
            orderBy: [{ sort_order: 'asc' }],
            include: { brand: true },
          },
          productTypes: { orderBy: [{ sort_order: 'asc' }, { name: 'asc' }] },
        },
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      }),
      prisma.brand.findMany({
        include: {
          models: { orderBy: [{ sort_order: 'asc' }, { name: 'asc' }] },
          categoryLinks: true,
        },
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      }),
      prisma.productType.findMany({
        include: { mainCategory: true },
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return { mainCategories, brands, productTypes };
  });

  const mainCategorySchema = z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
    requires_brand_model: z.boolean().optional(),
  });

  fastify.post('/taxonomy/main-categories', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = mainCategorySchema.parse(request.body);
    const record = await prisma.mainCategory.create({
      data: {
        name: body.name,
        slug: body.slug || slugifySku(body.name),
        description: body.description || null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
        requires_brand_model: body.requires_brand_model ?? false,
      },
    });
    return reply.status(201).send(record);
  });

  fastify.patch('/taxonomy/main-categories/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = mainCategorySchema.partial().parse(request.body);
    const existing = await prisma.mainCategory.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Main category not found' });
    return prisma.mainCategory.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        slug: body.slug ?? undefined,
        description: body.description ?? undefined,
        sort_order: body.sort_order ?? undefined,
        is_active: body.is_active ?? undefined,
        requires_brand_model: body.requires_brand_model ?? undefined,
      },
    });
  });

  fastify.delete('/taxonomy/main-categories/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.mainCategory.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Main category not found' });

    const productCount = await prisma.product.count({ where: { main_category_id: id } });
    if (productCount > 0) {
      return reply.status(400).send({ error: `Move or update ${productCount} linked product(s) before deleting this main category.` });
    }

    await prisma.mainCategory.delete({ where: { id } });
    return { message: 'Main category deleted' };
  });

  const brandSchema = z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
    main_category_ids: z.array(z.string().min(1)).optional(),
  });

  fastify.post('/taxonomy/brands', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = brandSchema.parse(request.body);
    const brand = await prisma.brand.create({
      data: {
        name: body.name,
        slug: body.slug || slugifySku(body.name),
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      },
    });
    if (body.main_category_ids?.length) {
      await prisma.categoryBrand.createMany({
        data: body.main_category_ids.map((mainCategoryId, index) => ({
          main_category_id: mainCategoryId,
          brand_id: brand.id,
          sort_order: index,
        })),
        skipDuplicates: true,
      });
    }
    return reply.status(201).send(brand);
  });

  fastify.patch('/taxonomy/brands/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = brandSchema.partial().parse(request.body);
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Brand not found' });
    const brand = await prisma.brand.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        slug: body.slug ?? undefined,
        sort_order: body.sort_order ?? undefined,
        is_active: body.is_active ?? undefined,
      },
    });
    if (body.main_category_ids) {
      await prisma.categoryBrand.deleteMany({ where: { brand_id: id } });
      await prisma.categoryBrand.createMany({
        data: body.main_category_ids.map((mainCategoryId, index) => ({
          main_category_id: mainCategoryId,
          brand_id: id,
          sort_order: index,
        })),
        skipDuplicates: true,
      });
    }
    return brand;
  });

  fastify.delete('/taxonomy/brands/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.brand.findUnique({
      where: { id },
      include: { models: true },
    });
    if (!existing) return reply.status(404).send({ error: 'Brand not found' });

    const modelIds = existing.models.map((model) => model.id);
    const productCount = await prisma.product.count({
      where: {
        OR: [
          { brand_id: id },
          ...(modelIds.length > 0 ? [{ brand_model_id: { in: modelIds } }] : []),
        ],
      },
    });
    if (productCount > 0) {
      return reply.status(400).send({ error: `Move or update ${productCount} linked product(s) before deleting this brand.` });
    }

    await prisma.brand.delete({ where: { id } });
    return { message: 'Brand deleted' };
  });

  const brandModelSchema = z.object({
    brand_id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
  });

  fastify.post('/taxonomy/brand-models', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = brandModelSchema.parse(request.body);
    const record = await prisma.brandModel.create({
      data: {
        brand_id: body.brand_id,
        name: body.name,
        slug: body.slug || slugifySku(body.name),
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      },
    });
    return reply.status(201).send(record);
  });

  fastify.patch('/taxonomy/brand-models/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = brandModelSchema.partial().parse(request.body);
    const existing = await prisma.brandModel.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Brand model not found' });
    return prisma.brandModel.update({
      where: { id },
      data: {
        brand_id: body.brand_id ?? undefined,
        name: body.name ?? undefined,
        slug: body.slug ?? undefined,
        sort_order: body.sort_order ?? undefined,
        is_active: body.is_active ?? undefined,
      },
    });
  });

  fastify.delete('/taxonomy/brand-models/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.brandModel.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Brand model not found' });

    const productCount = await prisma.product.count({ where: { brand_model_id: id } });
    if (productCount > 0) {
      return reply.status(400).send({ error: `Move or update ${productCount} linked product(s) before deleting this model.` });
    }

    await prisma.brandModel.delete({ where: { id } });
    return { message: 'Brand model deleted' };
  });

  const productTypeSchema = z.object({
    main_category_id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
  });

  fastify.post('/taxonomy/product-types', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = productTypeSchema.parse(request.body);
    const record = await prisma.productType.create({
      data: {
        main_category_id: body.main_category_id,
        name: body.name,
        slug: body.slug || slugifySku(body.name),
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      },
    });
    return reply.status(201).send(record);
  });

  fastify.patch('/taxonomy/product-types/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = productTypeSchema.partial().parse(request.body);
    const existing = await prisma.productType.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Product type not found' });
    return prisma.productType.update({
      where: { id },
      data: {
        main_category_id: body.main_category_id ?? undefined,
        name: body.name ?? undefined,
        slug: body.slug ?? undefined,
        sort_order: body.sort_order ?? undefined,
        is_active: body.is_active ?? undefined,
      },
    });
  });

  fastify.delete('/taxonomy/product-types/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.productType.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Product type not found' });

    const productCount = await prisma.product.count({ where: { product_type_id: id } });
    if (productCount > 0) {
      return reply.status(400).send({ error: `Move or update ${productCount} linked product(s) before deleting this product type.` });
    }

    await prisma.productType.delete({ where: { id } });
    return { message: 'Product type deleted' };
  });

  fastify.get('/coupons', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as { search?: string; active?: string };
    const filters: any[] = [];
    const search = query.search?.trim();
    if (search) {
      filters.push(Prisma.sql`("code" ILIKE ${`%${search}%`} OR "title" ILIKE ${`%${search}%`})`);
    }
    if (query.active === '1') filters.push(Prisma.sql`"is_active" = true`);
    if (query.active === '0') filters.push(Prisma.sql`"is_active" = false`);
    const whereSql = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.empty;

    return prisma.$queryRaw(Prisma.sql`
      SELECT *
      FROM "coupons"
      ${whereSql}
      ORDER BY "created_at" DESC
      LIMIT 200
    `);
  });

  fastify.post('/coupons', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = couponSchema.parse(request.body);
    const startsAt = parseCouponDate(body.starts_at);
    const endsAt = parseCouponDate(body.ends_at);
    if (startsAt && endsAt && startsAt > endsAt) {
      return reply.status(400).send({ error: 'Coupon start date must be before end date' });
    }

    try {
      const [coupon] = await prisma.$queryRaw(Prisma.sql`
        INSERT INTO "coupons" (
          "id", "code", "title", "description", "discount_type", "discount_value",
          "max_discount_amount", "min_order_amount", "currency", "starts_at", "ends_at",
          "usage_limit", "per_user_limit", "is_active", "created_by"
        )
        VALUES (
          ${randomUUID()}, ${body.code}, ${body.title || null}, ${body.description || null},
          ${body.discount_type}, ${body.discount_value}, ${body.max_discount_amount ?? null},
          ${body.min_order_amount}, ${body.currency}, ${startsAt}, ${endsAt},
          ${body.usage_limit ?? null}, ${body.per_user_limit}, ${body.is_active}, ${req.user.id}
        )
        RETURNING *
      `) as any[];
      return reply.status(201).send(coupon);
    } catch (error: any) {
      if (String(error?.message || '').includes('coupons_code_key')) {
        return reply.status(409).send({ error: 'Coupon code already exists' });
      }
      throw error;
    }
  });

  fastify.put('/coupons/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = couponSchema.partial({ code: true }).parse(request.body);
    const startsAt = parseCouponDate(body.starts_at);
    const endsAt = parseCouponDate(body.ends_at);
    if (startsAt && endsAt && startsAt > endsAt) {
      return reply.status(400).send({ error: 'Coupon start date must be before end date' });
    }

    const [coupon] = await prisma.$queryRaw(Prisma.sql`
      UPDATE "coupons"
      SET
        "code" = COALESCE(${body.code ?? null}, "code"),
        "title" = ${body.title ?? null},
        "description" = ${body.description ?? null},
        "discount_type" = COALESCE(${body.discount_type ?? null}, "discount_type"),
        "discount_value" = COALESCE(${body.discount_value ?? null}, "discount_value"),
        "max_discount_amount" = ${body.max_discount_amount ?? null},
        "min_order_amount" = COALESCE(${body.min_order_amount ?? null}, "min_order_amount"),
        "currency" = COALESCE(${body.currency ?? null}, "currency"),
        "starts_at" = ${startsAt},
        "ends_at" = ${endsAt},
        "usage_limit" = ${body.usage_limit ?? null},
        "per_user_limit" = COALESCE(${body.per_user_limit ?? null}, "per_user_limit"),
        "is_active" = COALESCE(${body.is_active ?? null}, "is_active"),
        "updated_at" = NOW()
      WHERE "id" = ${id}
      RETURNING *
    `) as any[];

    if (!coupon) return reply.status(404).send({ error: 'Coupon not found' });
    return coupon;
  });

  fastify.delete('/coupons/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const redemptions = await prisma.$queryRaw(Prisma.sql`
      SELECT "id" FROM "coupon_redemptions" WHERE "coupon_id" = ${id} LIMIT 1
    `) as any[];
    if (redemptions.length > 0) {
      const [coupon] = await prisma.$queryRaw(Prisma.sql`
        UPDATE "coupons" SET "is_active" = false, "updated_at" = NOW() WHERE "id" = ${id} RETURNING *
      `) as any[];
      return coupon || reply.status(404).send({ error: 'Coupon not found' });
    }

    const deleted = await prisma.$executeRaw(Prisma.sql`DELETE FROM "coupons" WHERE "id" = ${id}`);
    if (!deleted) return reply.status(404).send({ error: 'Coupon not found' });
    return { message: 'Coupon deleted' };
  });

  fastify.get('/blog-posts', { preHandler: auth }, async () => {
    return prisma.blogPost.findMany({
      include: {
        author: true,
        coverAsset: true,
      },
      orderBy: { created_at: 'desc' },
    });
  });

  fastify.post('/blog-posts', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      excerpt: z.string().optional(),
      content_md: z.string().min(1),
      cover_asset_id: z.string().optional(),
      status: z.string().optional(),
    }).parse(request.body);

    const post = await prisma.blogPost.create({
      data: {
        slug: body.slug,
        title: body.title,
        excerpt: body.excerpt || null,
        content_md: body.content_md,
        cover_asset_id: body.cover_asset_id || null,
        status: body.status || 'draft',
        created_by: req.user.id,
      },
    });

    return reply.status(201).send(post);
  });

  fastify.get('/homepage/offers', { preHandler: auth }, async () => {
    return prisma.homepageOffer.findMany({
      include: {
        coverAsset: true,
      },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  });

  fastify.post('/homepage/offers', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      description: z.string().optional(),
      offer_type: z.string().optional(),
      value: z.number().optional(),
      currency: z.string().optional(),
      link: z.string().optional(),
      cover_asset_id: z.string().optional(),
      is_active: z.boolean().optional(),
      sort_order: z.number().int().optional(),
      valid_from: z.string().optional(),
      valid_until: z.string().optional(),
    }).parse(request.body);

    const offer = await prisma.homepageOffer.create({
      data: {
        title: body.title,
        subtitle: body.subtitle || null,
        description: body.description || null,
        offer_type: body.offer_type || 'promotion',
        value: body.value ?? null,
        currency: body.currency || 'BDT',
        link: body.link || null,
        cover_asset_id: body.cover_asset_id || null,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
        valid_from: body.valid_from ? new Date(body.valid_from) : null,
        valid_until: body.valid_until ? new Date(body.valid_until) : null,
      },
      include: {
        coverAsset: true,
      },
    });

    return reply.status(201).send(offer);
  });

  fastify.put('/homepage/offers/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.homepageOffer.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Homepage offer not found' });
    }

    const body = request.body as any;
    return prisma.homepageOffer.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        subtitle: body.subtitle ?? undefined,
        description: body.description ?? undefined,
        offer_type: body.offer_type ?? undefined,
        value: body.value !== undefined ? Number(body.value) : undefined,
        currency: body.currency ?? undefined,
        link: body.link ?? undefined,
        cover_asset_id: body.cover_asset_id ?? undefined,
        is_active: body.is_active ?? undefined,
        sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
        valid_from: body.valid_from !== undefined ? (body.valid_from ? new Date(body.valid_from) : null) : undefined,
        valid_until: body.valid_until !== undefined ? (body.valid_until ? new Date(body.valid_until) : null) : undefined,
      },
      include: {
        coverAsset: true,
      },
    });
  });

  fastify.delete('/homepage/offers/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.homepageOffer.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Homepage offer not found' });
    }

    await prisma.homepageOffer.delete({ where: { id } });
    return { message: 'Homepage offer deleted' };
  });

  fastify.get('/homepage/hot-deals', { preHandler: auth }, async () => {
    return prisma.homepageHotDeal.findMany({
      include: {
        product: {
          include: {
            coverAsset: true,
            seller: {
              include: { sellerProfile: true },
            },
            category: true,
            mainCategory: true,
            taxonomyBrand: true,
            brandModel: true,
            productType: true,
          },
        },
      },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });
  });

  fastify.post('/homepage/hot-deals', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      product_id: z.string().min(1),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }).parse(request.body);

    const product = await prisma.product.findUnique({
      where: { id: body.product_id },
      select: { id: true },
    });
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    const shouldBeActive = body.is_active ?? true;
    if (shouldBeActive) {
      const activeCount = await prisma.homepageHotDeal.count({
        where: { is_active: true },
      });
      if (activeCount >= 2) {
        return reply.status(400).send({ error: 'You can only keep two hot items active at a time.' });
      }
    }

    try {
      const deal = await prisma.homepageHotDeal.create({
        data: {
          product_id: body.product_id,
          sort_order: body.sort_order ?? 0,
          is_active: shouldBeActive,
        },
        include: {
          product: {
            include: {
              coverAsset: true,
              seller: {
                include: { sellerProfile: true },
              },
              category: true,
              mainCategory: true,
              taxonomyBrand: true,
              brandModel: true,
              productType: true,
            },
          },
        },
      });

      return reply.status(201).send(deal);
    } catch (error: any) {
      if (String(error?.code || '') === 'P2002') {
        return reply.status(409).send({ error: 'This product is already assigned to hot items.' });
      }
      throw error;
    }
  });

  fastify.put('/homepage/hot-deals/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.homepageHotDeal.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Homepage hot item not found' });
    }

    const body = z.object({
      product_id: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }).parse(request.body);

    if (body.product_id) {
      const product = await prisma.product.findUnique({
        where: { id: body.product_id },
        select: { id: true },
      });
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' });
      }
    }

    const nextActive = body.is_active ?? existing.is_active;
    if (!existing.is_active && nextActive) {
      const activeCount = await prisma.homepageHotDeal.count({
        where: {
          is_active: true,
          NOT: { id },
        },
      });
      if (activeCount >= 2) {
        return reply.status(400).send({ error: 'You can only keep two hot items active at a time.' });
      }
    }

    try {
      return await prisma.homepageHotDeal.update({
        where: { id },
        data: {
          product_id: body.product_id ?? undefined,
          sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
          is_active: body.is_active ?? undefined,
        },
        include: {
          product: {
            include: {
              coverAsset: true,
              seller: {
                include: { sellerProfile: true },
              },
              category: true,
              mainCategory: true,
              taxonomyBrand: true,
              brandModel: true,
              productType: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (String(error?.code || '') === 'P2002') {
        return reply.status(409).send({ error: 'This product is already assigned to hot items.' });
      }
      throw error;
    }
  });

  fastify.delete('/homepage/hot-deals/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.homepageHotDeal.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Homepage hot item not found' });
    }

    await prisma.homepageHotDeal.delete({ where: { id } });
    return { message: 'Homepage hot item deleted' };
  });

  fastify.get('/homepage/visual-menu', { preHandler: auth }, async () => {
    return prisma.homepageVisualMenuItem.findMany({
      orderBy: [{ section_sort_order: 'asc' }, { sort_order: 'asc' }, { created_at: 'asc' }],
    });
  });

  fastify.post('/homepage/visual-menu', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      section_key: z.string().min(1),
      section_label: z.string().min(1),
      section_sort_order: z.number().int().optional(),
      title: z.string().min(1),
      search_keyword: z.string().min(1),
      image_url: z.string().url(),
      image_alt: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }).parse(request.body);

    const item = await prisma.homepageVisualMenuItem.create({
      data: {
        section_key: body.section_key,
        section_label: body.section_label,
        section_sort_order: body.section_sort_order ?? 0,
        title: body.title,
        search_keyword: body.search_keyword,
        image_url: body.image_url,
        image_alt: body.image_alt || null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      },
    });

    return reply.status(201).send(item);
  });

  fastify.put('/homepage/visual-menu/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.homepageVisualMenuItem.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Homepage visual menu item not found' });
    }

    const body = request.body as any;
    return prisma.homepageVisualMenuItem.update({
      where: { id },
      data: {
        section_key: body.section_key ?? undefined,
        section_label: body.section_label ?? undefined,
        section_sort_order: body.section_sort_order !== undefined ? Number(body.section_sort_order) : undefined,
        title: body.title ?? undefined,
        search_keyword: body.search_keyword ?? undefined,
        image_url: body.image_url ?? undefined,
        image_alt: body.image_alt ?? undefined,
        sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
        is_active: body.is_active ?? undefined,
      },
    });
  });

  fastify.delete('/homepage/visual-menu/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.homepageVisualMenuItem.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Homepage visual menu item not found' });
    }

    await prisma.homepageVisualMenuItem.delete({ where: { id } });
    return { message: 'Homepage visual menu item deleted' };
  });

  fastify.get('/roles', { preHandler: auth }, async () => {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  });

  fastify.get('/blog', { preHandler: auth }, async () => {
    return prisma.blogPost.findMany({
      include: {
        author: true,
        coverAsset: true,
      },
      orderBy: { created_at: 'desc' },
    });
  });

  fastify.post('/blog', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const body = z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      excerpt: z.string().optional(),
      content_md: z.string().min(1),
      cover_asset_id: z.string().optional(),
      status: z.string().optional(),
    }).parse(request.body);

    const post = await prisma.blogPost.create({
      data: {
        slug: body.slug,
        title: body.title,
        excerpt: body.excerpt || null,
        content_md: body.content_md,
        cover_asset_id: body.cover_asset_id || null,
        status: body.status || 'draft',
        created_by: req.user.id,
      },
    });

    return reply.status(201).send(post);
  });

  fastify.patch('/blog/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return reply.status(404).send({ error: 'Blog post not found' });
    }

    return prisma.blogPost.update({
      where: { id },
      data: {
        slug: body.slug ?? undefined,
        title: body.title ?? undefined,
        excerpt: body.excerpt ?? undefined,
        content_md: body.content_md ?? undefined,
        cover_asset_id: body.cover_asset_id ?? undefined,
        status: body.status ?? undefined,
      },
    });
  });

  fastify.delete('/blog/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return reply.status(404).send({ error: 'Blog post not found' });
    }

    await prisma.blogPost.delete({ where: { id } });
    return { message: 'Blog post deleted' };
  });

  fastify.get('/homepage-banners', { preHandler: auth }, async () => {
    return prisma.homepageBanner.findMany({
      include: { coverAsset: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  });

  fastify.post('/homepage-banners', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      link: z.string().optional(),
      cta_text: z.string().optional(),
      cover_asset_id: z.string().optional(),
      is_active: z.boolean().optional(),
      sort_order: z.number().int().optional(),
    }).parse(request.body);

    const banner = await prisma.homepageBanner.create({
      data: {
        title: body.title,
        subtitle: body.subtitle || null,
        link: body.link || null,
        cta_text: body.cta_text || 'Learn More',
        cover_asset_id: body.cover_asset_id || null,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
      },
    });

    return reply.status(201).send(banner);
  });

  fastify.put('/homepage-banners/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const banner = await prisma.homepageBanner.findUnique({ where: { id } });
    if (!banner) {
      return reply.status(404).send({ error: 'Homepage banner not found' });
    }

    return prisma.homepageBanner.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        subtitle: body.subtitle ?? undefined,
        link: body.link ?? undefined,
        cta_text: body.cta_text ?? undefined,
        cover_asset_id: body.cover_asset_id ?? undefined,
        is_active: body.is_active ?? undefined,
        sort_order: body.sort_order ?? undefined,
      },
    });
  });

  fastify.delete('/homepage-banners/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const banner = await prisma.homepageBanner.findUnique({ where: { id } });
    if (!banner) {
      return reply.status(404).send({ error: 'Homepage banner not found' });
    }

    await prisma.homepageBanner.delete({ where: { id } });
    return { message: 'Homepage banner deleted' };
  });

  fastify.get('/media', { preHandler: auth }, async (request: FastifyRequest) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      search_by?: string;
      category?: string;
      main_category_id?: string;
      brand_id?: string;
      brand_model_id?: string;
      product_type_id?: string;
      general?: string;
    };
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '24', 10)));
    const search = query.search?.trim();
    const searchBy = query.search_by?.trim() || 'all';
    const category = query.category?.trim();
    const mainCategoryId = query.main_category_id?.trim();
    const brandId = query.brand_id?.trim();
    const brandModelId = query.brand_model_id?.trim();
    const productTypeId = query.product_type_id?.trim();
    const generalOnly = query.general === '1';

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (mainCategoryId) {
      where.main_category_id = mainCategoryId;
    }
    if (brandId) {
      where.brand_id = brandId;
    }
    if (brandModelId) {
      where.brand_model_id = brandModelId;
    }
    if (productTypeId) {
      where.product_type_id = productTypeId;
    }
    if (generalOnly) {
      where.brand_id = null;
      where.brand_model_id = null;
    }
    if (search) {
      const searchClauses = {
        filename: [
          { r2_key: { contains: search, mode: 'insensitive' } },
          { public_url: { contains: search, mode: 'insensitive' } },
        ],
        main_category: [
          { mainCategory: { name: { contains: search, mode: 'insensitive' } } },
          { mainCategory: { slug: { contains: search, mode: 'insensitive' } } },
        ],
        brand: [
          { taxonomyBrand: { name: { contains: search, mode: 'insensitive' } } },
          { taxonomyBrand: { slug: { contains: search, mode: 'insensitive' } } },
        ],
        model: [
          { brandModel: { name: { contains: search, mode: 'insensitive' } } },
          { brandModel: { slug: { contains: search, mode: 'insensitive' } } },
        ],
        product_type: [
          { productType: { name: { contains: search, mode: 'insensitive' } } },
          { productType: { slug: { contains: search, mode: 'insensitive' } } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      } as const;

      where.OR = searchBy !== 'all' && searchBy in searchClauses
        ? [...searchClauses[searchBy as keyof typeof searchClauses]]
        : [
            { r2_key: { contains: search, mode: 'insensitive' } },
            { public_url: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
            { mainCategory: { name: { contains: search, mode: 'insensitive' } } },
            { taxonomyBrand: { name: { contains: search, mode: 'insensitive' } } },
            { brandModel: { name: { contains: search, mode: 'insensitive' } } },
            { productType: { name: { contains: search, mode: 'insensitive' } } },
          ];
    }

    const [total, media] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        include: {
          uploader: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
          mainCategory: true,
          taxonomyBrand: true,
          brandModel: true,
          productType: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const mediaWithTitles = media.map((item) => {
      const titleTag = Array.isArray(item.tags)
        ? item.tags.find((tag): tag is string => typeof tag === 'string' && tag.startsWith('title:'))
        : null;
      return {
        ...item,
        title: titleTag ? titleTag.replace('title:', '') : undefined,
      };
    });

    return {
      media: mediaWithTitles,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit,
    };
  });

  fastify.get('/media/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const item = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        mainCategory: true,
        taxonomyBrand: true,
        brandModel: true,
        productType: true,
      },
    });

    if (!item) {
      return reply.status(404).send({ error: 'Media item not found' });
    }

    const titleTag = Array.isArray(item.tags)
      ? item.tags.find((tag): tag is string => typeof tag === 'string' && tag.startsWith('title:'))
      : null;

    return {
      ...item,
      title: titleTag ? titleTag.replace('title:', '') : undefined,
    };
  });

  fastify.post('/media/upload', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;

    try {
      fastify.log.info({
        userId: req.user?.id,
        contentType: request.headers['content-type'],
      }, '[Admin Route] /media/upload started');

      if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
        return reply.status(500).send({ error: 'R2 not configured' });
      }

      const parts = request.parts();
      let fileData: any = null;
      let fileBuffer: Buffer | null = null;
      const meta: Record<string, string> = {};

      for await (const part of parts) {
        if (part.type === 'file') {
          fileData = part;
          fastify.log.info({
            filename: part.filename,
            mimetype: part.mimetype,
          }, '[Admin Route] /media/upload file part received');
          fastify.log.info('[Admin Route] /media/upload buffering file data');
          const chunks: Buffer[] = [];
          for await (const chunk of part.file as AsyncIterable<Buffer | string>) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          fileBuffer = Buffer.concat(chunks);
          fastify.log.info({
            size: fileBuffer.length,
          }, '[Admin Route] /media/upload file buffered');
        } else if (part.type === 'field') {
          meta[String(part.fieldname)] = String(part.value);
        }
      }

      if (!fileData) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: 'No file provided' });
      }
      const maxSize = 10 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        return reply.status(400).send({ error: 'File size exceeds 10MB' });
      }
      if (String(fileData.mimetype || '').startsWith('video/') && fileBuffer.length > 5 * 1024 * 1024) {
        return reply.status(400).send({ error: 'Product videos must be 5MB or smaller' });
      }

      const timestamp = Date.now();
      const sanitizedFilename = String(fileData.filename || 'upload').replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/${timestamp}-${sanitizedFilename}`;
      fastify.log.info({
        key,
        size: fileBuffer.length,
      }, '[Admin Route] /media/upload uploading to R2');
      await uploadToR2(key, fileBuffer, fileData.mimetype);
      const publicUrl = getPublicUrl(key);

      const tags = parseList(meta.tags);
      if (meta.title) {
        tags.unshift(`title:${meta.title}`);
      }

      const isGeneral = meta.product_type_id === '__GENERAL__' || meta.category === 'general';
      if (!meta.main_category_id) {
        return reply.status(400).send({ error: 'Main category is required for media uploads' });
      }
      if (!meta.product_type_id && !isGeneral) {
        return reply.status(400).send({ error: 'Product type is required for media uploads' });
      }
      if (!isGeneral && !meta.brand_id) {
        return reply.status(400).send({ error: 'Brand is required unless this media is marked as general' });
      }
      if (!isGeneral && !meta.brand_model_id) {
        return reply.status(400).send({ error: 'Model is required unless this media is marked as general' });
      }

      const asset = await prisma.mediaAsset.create({
        data: {
          r2_key: key,
          public_url: publicUrl,
          mime_type: fileData.mimetype,
          size: fileBuffer.length,
          category: isGeneral ? 'general' : (meta.category || null),
          main_category_id: meta.main_category_id || null,
          brand_id: isGeneral ? null : (meta.brand_id || null),
          brand_model_id: isGeneral ? null : (meta.brand_model_id || null),
          product_type_id: isGeneral ? null : (meta.product_type_id || null),
          tags,
          uploaded_by: req.user.id,
        },
      });

      fastify.log.info({
        id: asset.id,
        key,
      }, '[Admin Route] /media/upload completed');

      return {
        ...asset,
        title: meta.title || undefined,
      };
    } catch (error: any) {
      fastify.log.error({
        message: error?.message,
        stack: error?.stack,
      }, '[Admin Route] /media/upload error');
      return reply.status(500).send({ error: error.message || 'Failed to upload media' });
    }
  });

  fastify.put('/media/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const item = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: 'Media item not found' });
    }

    const existingTags = Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string' && !tag.startsWith('title:')) : [];
    const nextTags = Array.isArray(body.tags)
      ? body.tags
      : body.tagsText
        ? parseList(body.tagsText)
        : existingTags;
    if (body.title) {
      nextTags.unshift(`title:${body.title}`);
    }

    const isGeneral = body.product_type_id === '__GENERAL__' || body.category === 'general';

    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: {
        category: body.category ?? undefined,
        main_category_id: body.main_category_id ?? undefined,
        brand_id: isGeneral ? null : body.brand_id ?? undefined,
        brand_model_id: isGeneral ? null : body.brand_model_id ?? undefined,
        product_type_id: isGeneral ? null : body.product_type_id ?? undefined,
        tags: nextTags,
      },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        mainCategory: true,
        taxonomyBrand: true,
        brandModel: true,
        productType: true,
      },
    } as any);

    return {
      ...updated,
      title: body.title || (Array.isArray(updated.tags) ? updated.tags.find((tag) => typeof tag === 'string' && tag.startsWith('title:'))?.replace('title:', '') : undefined),
    };
  });

  fastify.delete('/media/:id', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const item = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: 'Media item not found' });
    }

    try {
      await deleteFromR2(item.r2_key);
    } catch (error) {
      fastify.log.warn({ error }, '[Admin Route] Failed to delete media from R2, deleting DB row anyway');
    }

    await prisma.mediaAsset.delete({ where: { id } });
    return { message: 'Media deleted' };
  });

  fastify.delete('/media/bulk', { preHandler: auth }, async (request: FastifyRequest) => {
    const body = z.object({
      ids: z.array(z.string().min(1)).min(1),
    }).parse(request.body);

    const items = await prisma.mediaAsset.findMany({
      where: { id: { in: body.ids } },
    });

    for (const item of items) {
      try {
        await deleteFromR2(item.r2_key);
      } catch (error) {
        fastify.log.warn({ error }, `[Admin Route] Failed to delete R2 object ${item.r2_key}`);
      }
    }

    await prisma.mediaAsset.deleteMany({
      where: { id: { in: body.ids } },
    });

    return { message: 'Media deleted' };
  });
}
