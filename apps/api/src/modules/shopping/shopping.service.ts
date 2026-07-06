import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

type ProductCard = {
  source: 'matrix_ecommerce';
  externalId: string;
  id: string;
  title: string;
  priceMin?: number;
  priceMax?: number;
  originalPrice?: number;
  currency: 'BDT';
  imageUrl?: string;
  images?: string[];
  sellerName?: string;
  vendorName?: string;
  vendorId?: string;
  shopName?: string;
  shopUrl?: string;
  productUrl?: string;
  sourceUrl?: string;
  totalSold?: number;
  minimumOrderQty?: number;
  raw?: any;
};

type ProductDetail = ProductCard & {
  description?: string;
  skus?: any[];
  detailPoints?: Array<{ text: string; depth: number }>;
  rating?: number;
  ratingCount?: number;
  availableQuantity?: number;
  totalSold?: number;
  tieredPricing?: Array<{ minQty: number; maxQty?: number; price: number }>;
  productProps?: any[];
  serviceTags?: string[];
  stock?: number;
  detailUrl?: string;
  estimatedWeightKg?: number;
  weight_kg?: number;
  shipping?: {
    currency: 'BDT';
    minimumOrderQty: number;
  };
};

function buildMediaLookup(media: any[]) {
  return new Map<string, any>((media || []).map((asset) => [asset.id, asset]));
}

const SEMANTIC_SYNONYMS: Record<string, string[]> = {
  phone: ['mobile', 'smartphone', 'iphone', 'android'],
  accessories: ['case', 'cover', 'protector', 'glass', 'charger', 'cable', 'earphone', 'adapter', 'powerbank', 'stand'],
  'phone accessories': ['phone', 'mobile', 'case', 'cover', 'screen protector', 'tempered glass', 'charger', 'cable', 'earphone'],
  case: ['cover', 'back cover', 'phone cover'],
  glass: ['screen protector', 'tempered glass', 'protector'],
  charger: ['adapter', 'charging', 'type c', 'usb c'],
  watch: ['smartwatch', 'strap', 'watch protector'],
};

function normalizeSearchText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: unknown) {
  return Array.from(new Set(normalizeSearchText(value).split(' ').filter((token) => token.length > 1)));
}

function expandSearchTerms(keyword?: string) {
  const normalized = normalizeSearchText(keyword);
  const terms = new Set(tokenize(normalized));
  for (const [phrase, synonyms] of Object.entries(SEMANTIC_SYNONYMS)) {
    if (normalized.includes(phrase)) {
      tokenize(synonyms.join(' ')).forEach((token) => terms.add(token));
      synonyms.forEach((synonym) => terms.add(synonym));
    }
  }
  return Array.from(terms);
}

function normalizeGalleryAssets(product: any, mediaById: Map<string, any>): string[] {
  const ids = Array.isArray(product.gallery_asset_ids)
    ? product.gallery_asset_ids.filter((id: any) => typeof id === 'string' && id.trim().length > 0)
    : [];

  return ids
    .map((id: string) => mediaById.get(id))
    .filter(Boolean)
    .map((asset: any) => asset?.public_url || asset?.thumbnail_url)
    .filter(Boolean);
}

function normalizeLocalCard(product: any, mediaById: Map<string, any> = new Map()): ProductCard {
  const imageUrl = product.coverAsset?.public_url || product.coverAsset?.thumbnail_url || undefined;
  const gallery = normalizeGalleryAssets(product, mediaById);
  const images = [imageUrl, ...gallery].filter(Boolean) as string[];

  return {
    source: 'matrix_ecommerce',
    externalId: product.external_id || product.id,
    id: product.id,
    title: product.title,
    priceMin: Number(product.price || 0),
    priceMax: Number(product.price || 0),
    originalPrice: product.original_price !== null && product.original_price !== undefined
      ? Number(product.original_price)
      : undefined,
    currency: 'BDT',
    imageUrl,
    images: images.length > 0 ? images : undefined,
    sellerName: product.seller?.sellerProfile?.shop_name || product.seller?.email || 'Matrix Ecommerce',
    vendorName: product.vendor_name || product.seller?.sellerProfile?.shop_name || product.seller?.email || 'Matrix Ecommerce',
    vendorId: product.seller_id,
    shopName: product.seller?.sellerProfile?.shop_name || product.seller?.email || 'Matrix Ecommerce',
    shopUrl: product.seller?.sellerProfile?.website || product.shop_url || undefined,
    productUrl: product.product_url || product.source_url || undefined,
    sourceUrl: product.source_url || undefined,
    totalSold: Number(product.review_count || 0),
    minimumOrderQty: Number(product.minimum_order_qty || 1),
    raw: product,
  };
}

function normalizeLocalDetail(product: any, mediaById: Map<string, any> = new Map()): ProductDetail {
  const card = normalizeLocalCard(product, mediaById);
  const gallery = Array.isArray(card.images) ? card.images.filter(Boolean) : [];
  const skus = (Array.isArray(product.specifications) ? product.specifications : []).map((row: any) => {
    const asset = row?.image_asset_id ? mediaById.get(String(row.image_asset_id)) : null;
    return {
      ...row,
      imageUrl: asset?.public_url || asset?.thumbnail_url || undefined,
      thumbnailUrl: asset?.thumbnail_url || asset?.public_url || undefined,
    };
  });

  return {
    ...card,
    images: gallery.length > 0 ? gallery : card.imageUrl ? [card.imageUrl] : undefined,
    description: product.description || '',
    skus,
    detailPoints: Array.isArray(product.dimensions?.detailPoints) ? product.dimensions.detailPoints : [],
    raw: product,
    rating: product.rating ?? undefined,
    ratingCount: product.review_count ?? 0,
    availableQuantity: product.stock_qty || undefined,
    stock: product.stock_qty || undefined,
    totalSold: product.review_count || undefined,
    productProps: skus,
    serviceTags: Array.isArray(product.tags) ? product.tags.filter((tag: unknown) => typeof tag === 'string') : undefined,
    detailUrl: card.productUrl || card.sourceUrl || undefined,
    estimatedWeightKg: product.weight_kg ?? undefined,
    weight_kg: product.weight_kg ?? undefined,
    shipping: {
      currency: 'BDT',
      minimumOrderQty: Number(product.minimum_order_qty || 1),
    },
  };
}

function buildSearchWhere(
  keyword?: string,
  filters: {
    category?: string;
    mainCategory?: string;
    brandId?: string;
    brandModelId?: string;
    productTypeId?: string;
    vendorId?: string;
  } = {},
) {
  const andClauses: any[] = [{ status: 'published' }];

  if (filters.vendorId) {
    andClauses.push({ seller_id: filters.vendorId });
  }

  if (filters.category) {
    andClauses.push({
      OR: [
        { mainCategory: { slug: filters.category } },
        { productType: { slug: filters.category } },
        { category: { slug: filters.category } },
        { category: { parent: { slug: filters.category } } },
      ],
    });
  }

  if (filters.mainCategory) {
    andClauses.push({ mainCategory: { slug: filters.mainCategory } });
  }
  if (filters.brandId) {
    andClauses.push({ brand_id: filters.brandId });
  }
  if (filters.brandModelId) {
    andClauses.push({ brand_model_id: filters.brandModelId });
  }
  if (filters.productTypeId) {
    andClauses.push({ product_type_id: filters.productTypeId });
  }

  const search = String(keyword || '').trim();
  if (search) {
    const terms = search
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);
    const expandedTerms = Array.from(new Set([...terms, ...expandSearchTerms(search)]));
    const clauses = expandedTerms.flatMap((term) => ([
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { brand: { contains: term, mode: 'insensitive' } },
      { taxonomyBrand: { name: { contains: term, mode: 'insensitive' } } },
      { brandModel: { name: { contains: term, mode: 'insensitive' } } },
      { productType: { name: { contains: term, mode: 'insensitive' } } },
      { sku: { contains: term, mode: 'insensitive' } },
    ]));
    andClauses.push({ OR: clauses });
  }

  return andClauses.length === 1 ? andClauses[0] : { AND: andClauses };
}

async function loadLocalCards(products: any[]) {
  const assetIds = Array.from(new Set(products.flatMap((product: any) => [
    ...(Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids : []),
    product.cover_asset_id,
  ]).filter((id): id is string => typeof id === 'string' && id.length > 0)));

  const assets = assetIds.length > 0
    ? await prisma.mediaAsset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, public_url: true, thumbnail_url: true },
      })
    : [];

  const mediaById = buildMediaLookup(assets);
  return products.map((product) => normalizeLocalCard(product, mediaById));
}

export async function getCategories() {
  return prisma.mainCategory.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      sort_order: true,
      requires_brand_model: true,
    },
  });
}

export async function syncProductSearchVector(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { include: { parent: true } },
      mainCategory: true,
      taxonomyBrand: true,
      brandModel: true,
      productType: true,
    },
  });
  if (!product) return;

  const textParts = [
    product.title,
    product.description,
    product.sku,
    product.brand,
    product.category?.name,
    product.category?.parent?.name,
    product.mainCategory?.name,
    product.taxonomyBrand?.name,
    product.brandModel?.name,
    product.productType?.name,
    Array.isArray(product.tags) ? product.tags.join(' ') : '',
  ];
  const searchableText = textParts.filter(Boolean).join(' ');
  const tokens = Array.from(new Set([
    ...tokenize(searchableText),
    ...expandSearchTerms(searchableText),
  ].map((token) => normalizeSearchText(token)).filter(Boolean)));

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "product_search_vectors" (
      "id",
      "product_id",
      "main_category_id",
      "category_id",
      "product_type_id",
      "brand_id",
      "brand_model_id",
      "searchable_text",
      "tokens",
      "updated_at"
    )
    VALUES (
      ${product.id},
      ${product.id},
      ${product.main_category_id},
      ${product.category_id},
      ${product.product_type_id},
      ${product.brand_id},
      ${product.brand_model_id},
      ${searchableText},
      ${tokens},
      NOW()
    )
    ON CONFLICT ("product_id") DO UPDATE SET
      "main_category_id" = EXCLUDED."main_category_id",
      "category_id" = EXCLUDED."category_id",
      "product_type_id" = EXCLUDED."product_type_id",
      "brand_id" = EXCLUDED."brand_id",
      "brand_model_id" = EXCLUDED."brand_model_id",
      "searchable_text" = EXCLUDED."searchable_text",
      "tokens" = EXCLUDED."tokens",
      "updated_at" = NOW()
  `);
}

async function findSemanticProductIds(keyword?: string) {
  const tokens = expandSearchTerms(keyword);
  if (tokens.length === 0) return [];
  const tokenArray = Prisma.sql`ARRAY[${Prisma.join(tokens)}]::text[]`;
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT
      "product_id",
      (
        SELECT COUNT(*)::int
        FROM unnest("tokens") AS token
        WHERE token = ANY(${tokenArray})
      ) AS "rank"
    FROM "product_search_vectors"
    WHERE "tokens" && ${tokenArray}
    ORDER BY "rank" DESC, "updated_at" DESC
    LIMIT 200
  `) as { product_id: string; rank: number }[];
  return rows.map((row) => row.product_id);
}

export async function searchByKeyword(
  keyword?: string,
  opts: {
    category?: string;
    mainCategory?: string;
    brandId?: string;
    brandModelId?: string;
    productTypeId?: string;
    vendorId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const page = Math.max(1, Number(opts.page || 1));
  const pageSize = Math.max(1, Math.min(50, Number(opts.pageSize || 20)));
  const where = buildSearchWhere(keyword, opts);
  const semanticProductIds = keyword ? await findSemanticProductIds(keyword) : [];
  if (semanticProductIds.length > 0) {
    where.OR = [
      ...(where.OR || []),
      { id: { in: semanticProductIds } },
    ];
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
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
      orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: await loadLocalCards(products),
    totalCount: total,
    page,
    pageSize,
  };
}

export async function searchByImage(
  _r2PublicUrl: string,
  opts: {
    category?: string;
    mainCategory?: string;
    brandId?: string;
    brandModelId?: string;
    productTypeId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  return searchByKeyword(opts.category, {
    category: opts.category,
    mainCategory: opts.mainCategory,
    brandId: opts.brandId,
    brandModelId: opts.brandModelId,
    productTypeId: opts.productTypeId,
    page: opts.page,
    pageSize: opts.pageSize,
  });
}

export async function getItemDetail(externalId: string) {
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: externalId },
        { external_id: externalId },
      ],
      status: 'published',
    },
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
  });

  if (!product) return null;

  const assetIds = Array.from(new Set([
    ...(Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids : []),
    product.cover_asset_id,
    ...((Array.isArray(product.specifications) ? product.specifications : [])
      .map((row: any) => row?.image_asset_id)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0)),
  ].filter((id): id is string => typeof id === 'string' && id.length > 0)));

  const assets = assetIds.length > 0
    ? await prisma.mediaAsset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, public_url: true, thumbnail_url: true },
      })
    : [];

  return normalizeLocalDetail(product, buildMediaLookup(assets));
}

export async function getVendorInfo(vendorId: string) {
  const seller = await prisma.user.findUnique({
    where: { id: vendorId },
    include: {
      sellerProfile: true,
    },
  });

  if (!seller) return null;

  return {
    id: seller.id,
    email: seller.email,
    phone: seller.phone,
    shopName: seller.sellerProfile?.shop_name || seller.email || 'Matrix Ecommerce',
    displayName: seller.sellerProfile?.display_name || seller.sellerProfile?.shop_name || seller.email || 'Matrix Ecommerce',
    website: seller.sellerProfile?.website || null,
    verified: Boolean(seller.sellerProfile?.verified),
    rating: seller.sellerProfile?.rating ?? null,
    reviewCount: seller.sellerProfile?.review_count ?? 0,
    description: seller.sellerProfile?.description || null,
  };
}

export async function searchByVendorId(
  vendorId: string,
  opts: {
    category?: string;
    mainCategory?: string;
    brandId?: string;
    brandModelId?: string;
    productTypeId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  return searchByKeyword(undefined, {
    vendorId,
    category: opts.category,
    mainCategory: opts.mainCategory,
    brandId: opts.brandId,
    brandModelId: opts.brandModelId,
    productTypeId: opts.productTypeId,
    page: opts.page,
    pageSize: opts.pageSize,
  });
}

export async function getHotItems(categorySlug?: string, page = 1, pageSize = 20): Promise<ProductCard[]> {
  const where: any = {
    status: 'published',
    is_featured: true,
  };

  if (categorySlug) {
    where.OR = [
      { mainCategory: { slug: categorySlug } },
      { productType: { slug: categorySlug } },
      { category: { slug: categorySlug } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      coverAsset: true,
      seller: { include: { sellerProfile: true } },
      category: true,
    },
    orderBy: [{ created_at: 'desc' }],
    skip: (Math.max(1, page) - 1) * pageSize,
    take: pageSize,
  });

  return loadLocalCards(products);
}

export async function getCuratedHomeSections(): Promise<Array<{ slug: string; label: string; items: ProductCard[] }>> {
  const categories = await prisma.mainCategory.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    take: 6,
  });

  return Promise.all(categories.map(async (category) => {
    const products = await prisma.product.findMany({
      where: {
        status: 'published',
        main_category_id: category.id,
      },
      include: {
        coverAsset: true,
        seller: { include: { sellerProfile: true } },
        category: true,
        mainCategory: true,
        taxonomyBrand: true,
        brandModel: true,
        productType: true,
      },
      orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
      take: 6,
    });

    return {
      slug: category.slug,
      label: category.name,
      items: await loadLocalCards(products),
    };
  }));
}
