import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  getCategories,
  getCuratedHomeSections,
  getHomepageCollections,
  getHomepageHotDeals,
  getHotProductsFromSearchKeywords,
  getHotItems,
  getItemDetail,
  getVendorInfo,
  getTrendingSearchKeywords,
  logSearchKeyword,
  searchByKeyword,
  searchByVendorId,
} from '../modules/shopping/shopping.service.js';
import { getHotItemsSchema, searchByKeywordSchema } from '../modules/shopping/shopping.schemas.js';

function isDatabaseUnavailable(error: any): boolean {
  const message = String(error?.message || '');
  return (
    error?.name === 'PrismaClientInitializationError' ||
    message.includes("Can't reach database server") ||
    message.includes('P1001') ||
    message.includes('P1017')
  );
}

let shoppingDbAvailable = true;

function getClientIp(request: FastifyRequest): string {
  const cfConnectingIp = request.headers['cf-connecting-ip'];
  if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) return cfConnectingIp.trim();

  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.ip;
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token) return false;

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: ip,
    }),
  });

  if (!res.ok) return false;
  const data = await res.json() as { success?: boolean };
  return data.success === true;
}

async function requireTurnstile(request: FastifyRequest, reply: FastifyReply, token: string | undefined): Promise<boolean> {
  const verified = await verifyTurnstile(token, getClientIp(request));
  if (!verified) {
    reply.status(403).send({ error: 'Human verification failed. Please refresh and try again.' });
    return false;
  }
  return true;
}

function buildHomepageVisualMenuSections(rows: any[]) {
  const sections = new Map<string, any>();
  for (const row of rows) {
    const sectionKey = String(row.section_key || '').trim();
    if (!sectionKey) continue;
    if (!sections.has(sectionKey)) {
      sections.set(sectionKey, {
        sectionKey,
        sectionLabel: row.section_label || sectionKey,
        sectionSortOrder: row.section_sort_order ?? 0,
        items: [],
      });
    }
    sections.get(sectionKey).items.push({
      id: row.id,
      title: row.title,
      searchKeyword: row.search_keyword,
      imageUrl: row.image_url,
      imageAlt: row.image_alt || row.title,
      sortOrder: row.sort_order ?? 0,
    });
  }

  return Array.from(sections.values())
    .sort((a, b) => a.sectionSortOrder - b.sectionSortOrder || String(a.sectionLabel).localeCompare(String(b.sectionLabel)))
    .map((section) => ({
      ...section,
      items: section.items
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder || String(a.title).localeCompare(String(b.title)))
        .slice(0, 8),
    }));
}

export default async function publicShoppingRoutes(fastify: FastifyInstance) {
  fastify.get('/blog', async () => {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content_md: true,
        published_at: true,
        created_at: true,
      },
      orderBy: [{ published_at: 'desc' }, { created_at: 'desc' }],
      take: 24,
    });

    return posts.map((post) => ({
      ...post,
      readingTimeMinutes: Math.max(2, Math.ceil(String(post.content_md || '').split(/\s+/).filter(Boolean).length / 180)),
    }));
  });

  fastify.get('/shopping/categories', async () => getCategories());

  fastify.get('/shopping/home-visual-menu', async () => {
    const items = await prisma.homepageVisualMenuItem.findMany({
      where: { is_active: true },
      orderBy: [{ section_sort_order: 'asc' }, { sort_order: 'asc' }, { created_at: 'asc' }],
    });
    return buildHomepageVisualMenuSections(items);
  });

  fastify.get('/shopping/hot', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = getHotItemsSchema.parse(request.query);
      return getHotItems(query.category, query.page, query.pageSize);
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack, query: request.query }, '[Public Shopping Route] /shopping/hot error');
      reply.status(400).send({ error: error.message || 'Invalid query parameters' });
    }
  });

  fastify.get('/shopping/home-curated', async () => {
    return getCuratedHomeSections();
  });

  fastify.get('/shipping-charges', async () => {
    const defaults = [
      { delivery_area: 'inside_dhaka', cost: 50, per_kg_charge: 30, is_active: true },
      { delivery_area: 'outside_dhaka', cost: 100, per_kg_charge: 30, is_active: true },
    ] as const;
    for (const row of defaults) {
      await prisma.shippingCharge.upsert({
        where: { delivery_area: row.delivery_area },
        update: {},
        create: row,
      });
    }

    return prisma.shippingCharge.findMany({
      where: { is_active: true, delivery_area: { in: ['inside_dhaka', 'outside_dhaka'] } },
      orderBy: [{ delivery_area: 'asc' }],
      select: {
        id: true,
        delivery_area: true,
        cost: true,
        per_kg_charge: true,
      },
    });
  });

  fastify.get('/shopping/home-collections', async () => {
    return getHomepageCollections();
  });

  fastify.get('/shopping/hot-deals', async () => {
    return getHomepageHotDeals();
  });

  fastify.get('/shopping/hot-products', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = getHotItemsSchema.parse(request.query);
      return getHotProductsFromSearchKeywords(query.pageSize || 6);
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Public Shopping Route] /shopping/hot-products error');
      reply.status(400).send({ error: error.message || 'Invalid query parameters' });
    }
  });

  fastify.get('/shopping/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
      const query = searchByKeywordSchema.parse(request.query);
      if (!(await requireTurnstile(request, reply, query.turnstileToken))) return;

      const keyword = query.keyword || query.category;
      const result = await searchByKeyword(keyword, {
        category: query.category,
        mainCategory: query.mainCategory,
        brandId: query.brandId,
        brandModelId: query.brandModelId,
        productTypeId: query.productTypeId,
        vendorId: query.vendorId,
        page: query.page,
        pageSize: query.pageSize,
      });
      if (keyword?.trim()) {
        await logSearchKeyword(keyword, Number(result.totalCount || 0));
      }
      return result;
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack, query: request.query }, '[Public Shopping Route] /shopping/search error');
      reply.status(400).send({ error: error.message || 'Invalid query parameters' });
    }
  });

  fastify.get('/shopping/vendor/:vendorId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { vendorId } = request.params as { vendorId: string };
      const query = request.query as {
        page?: string;
        pageSize?: string;
        keyword?: string;
        q?: string;
        category?: string;
        mainCategory?: string;
        brandId?: string;
        brandModelId?: string;
        productTypeId?: string;
      };
      const page = parseInt(query.page || '1', 10);
      const pageSize = parseInt(query.pageSize || '20', 10);
      const keyword = String(query.keyword || query.q || '').trim();

      const [vendor, products] = await Promise.all([
        getVendorInfo(vendorId),
        searchByVendorId(vendorId, {
          category: query.category || undefined,
          mainCategory: query.mainCategory || undefined,
          brandId: query.brandId || undefined,
          brandModelId: query.brandModelId || undefined,
          productTypeId: query.productTypeId || undefined,
          page,
          pageSize,
        }),
      ]);

      return {
        vendor,
        products: products.items,
        totalCount: products.totalCount,
        page: products.page,
        pageSize: products.pageSize,
        keyword,
        category: query.category || undefined,
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[Public Shopping Route] /shopping/vendor/:vendorId error');
      reply.status(400).send({ error: error.message || 'Invalid query parameters' });
    }
  });

  fastify.get('/shopping/premium-products', async (request: FastifyRequest) => {
    const query = request.query as { category?: string; limit?: string };
    const limit = Math.max(1, Math.min(20, parseInt(query.limit || '4', 10)));
    return getHotItems(query.category, 1, limit);
  });

  fastify.get('/shopping/settings', async () => {
    return {
      defaultCurrency: 'BDT',
      localCatalogOnly: true,
    };
  });

  fastify.get('/shopping/taxonomy', async () => {
    const mainCategories = await prisma.mainCategory.findMany({
      where: { is_active: true },
      include: {
        productTypes: {
          where: { is_active: true },
          orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
        },
        brandLinks: {
          orderBy: [{ sort_order: 'asc' }],
          include: {
            brand: {
              include: {
                models: {
                  where: { is_active: true },
                  orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
                },
              },
            },
          },
        },
      },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });

    return mainCategories.map((category) => ({
      ...category,
      brands: category.brandLinks
        .map((link) => link.brand)
        .filter((brand) => brand.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)),
      brandLinks: undefined,
    }));
  });

  fastify.get('/shopping/item/:externalId', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 'public, max-age=900, stale-while-revalidate=86400');
    const { externalId } = request.params as { externalId: string };
    const item = await getItemDetail(externalId);
    if (!item) {
      reply.status(404).send({ error: 'Item not found' });
      return;
    }
    return item;
  });

  fastify.get('/shopping/recent-searches', async () => {
    const terms = await getTrendingSearchKeywords(8);
    return terms.map((term) => ({
      keyword: term.keyword,
      searchCount: term.search_count,
      lastSearchedAt: term.last_searched_at,
    }));
  });

  fastify.get('/offers', async () => {
    if (!shoppingDbAvailable) {
      return [];
    }
    try {
      const now = new Date();
      return prisma.homepageOffer.findMany({
        where: {
          is_active: true,
          OR: [
            { valid_from: null, valid_until: null },
            { valid_from: { lte: now }, valid_until: { gte: now } },
            { valid_from: { lte: now }, valid_until: null },
            { valid_from: null, valid_until: { gte: now } },
          ],
        },
        select: {
          id: true,
          offer_type: true,
          value: true,
          currency: true,
          title: true,
          subtitle: true,
          description: true,
          link: true,
          gallery_asset_ids: true,
          valid_from: true,
          valid_until: true,
          coverAsset: {
            select: {
              id: true,
              public_url: true,
              thumbnail_url: true,
              width: true,
              height: true,
            },
          },
        },
        orderBy: [
          { valid_from: 'asc' },
          { updated_at: 'desc' },
        ],
        take: 10,
      });
    } catch (error: any) {
      if (isDatabaseUnavailable(error)) {
        shoppingDbAvailable = false;
        return [];
      }
      fastify.log.error({ error, stack: error.stack }, '[Offers] Database error');
      return [];
    }
  });

  fastify.get('/homepage-banners', async () => {
    if (!shoppingDbAvailable) {
      return [];
    }
    try {
      return prisma.homepageBanner.findMany({
        where: {
          is_active: true,
        },
        select: {
          id: true,
          title: true,
          subtitle: true,
          link: true,
          cta_text: true,
          sort_order: true,
          coverAsset: {
            select: {
              id: true,
              public_url: true,
              thumbnail_url: true,
              width: true,
              height: true,
            },
          },
        },
        orderBy: [
          { sort_order: 'asc' },
          { created_at: 'desc' },
        ],
        take: 12,
      });
    } catch (error: any) {
      if (isDatabaseUnavailable(error)) {
        shoppingDbAvailable = false;
        return [];
      }
      fastify.log.error({ error, stack: error.stack }, '[Homepage Banners] Database error');
      return [];
    }
  });
}
