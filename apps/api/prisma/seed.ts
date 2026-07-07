import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { HOMEPAGE_VISUAL_MENU_SEED } from '../src/modules/shopping/homepage-visual-menu.js';
import { syncProductSearchVector } from '../src/modules/shopping/shopping.service.js';

const prisma = new PrismaClient();

async function ensureRoles() {
  const roles = ['CUSTOMER', 'SELLER', 'ADMIN'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

async function ensureUser(email: string, password: string, roleName: string, phone?: string | null) {
  const password_hash = await argon2.hash(password);
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Role not found: ${roleName}`);
  }

  return prisma.user.upsert({
    where: { email },
    update: {
      phone: phone ?? undefined,
    },
    create: {
      email,
      phone: phone ?? null,
      password_hash,
      status: 'active',
      roles: {
        create: {
          role: {
            connect: { name: roleName },
          },
        },
      },
    },
  });
}

async function syncHomepageVisualMenuSeed() {
  await prisma.homepageVisualMenuItem.deleteMany({});

  for (const item of HOMEPAGE_VISUAL_MENU_SEED) {
    const existing = await prisma.homepageVisualMenuItem.findFirst({
      where: {
        section_key: item.section_key,
        title: item.title,
      },
    });

    const data = {
      section_key: item.section_key,
      section_label: item.section_label,
      section_sort_order: item.section_sort_order,
      title: item.title,
      search_keyword: item.search_keyword,
      image_url: item.image_url,
      image_alt: item.image_alt,
      sort_order: item.sort_order,
      is_active: true,
    };

    if (existing) {
      await prisma.homepageVisualMenuItem.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.homepageVisualMenuItem.create({ data });
    }
  }
}

async function syncHomepageHotDealsSeed(productIds: string[]) {
  await prisma.homepageHotDeal.deleteMany({});

  for (const [index, productId] of productIds.filter(Boolean).slice(0, 2).entries()) {
    await prisma.homepageHotDeal.create({
      data: {
        product_id: productId,
        sort_order: index + 1,
        is_active: true,
      },
    });
  }
}

const PHONE_MODEL_SEED: Record<string, string[]> = {
  Apple: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14', 'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone SE 3rd Gen'],
  OnePlus: ['OnePlus 12', 'OnePlus 12R', 'OnePlus 11', 'OnePlus 10 Pro', 'OnePlus Open', 'OnePlus Nord 4', 'OnePlus Nord 3', 'OnePlus Nord CE4', 'OnePlus Nord CE3'],
  Samsung: ['Galaxy S24 Ultra', 'Galaxy S24 Plus', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23 FE', 'Galaxy A55 5G', 'Galaxy A35 5G', 'Galaxy A25 5G', 'Galaxy A15 5G', 'Galaxy Z Fold6', 'Galaxy Z Flip6'],
  Google: ['Pixel 9 Pro XL', 'Pixel 9 Pro', 'Pixel 9', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 8a', 'Pixel 7 Pro', 'Pixel 7a'],
  NOTHING: ['Nothing Phone 2a Plus', 'Nothing Phone 2a', 'Nothing Phone 2', 'Nothing Phone 1'],
  Xiaomi: ['Xiaomi 12X', 'Redmi Note 10T 5G', 'Xiaomi 14', 'Xiaomi Redmi Note 13 Pro Plus', 'Xiaomi Redmi Note 13 Pro', 'Xiaomi Redmi Note 13', 'Xiaomi Redmi 12 4G', 'Xiaomi Mi 13 Pro', 'Xiaomi Redmi Note 12 5G', 'Xiaomi Redmi Note 12 Pro Plus', 'Redmi Note 12 Pro', 'Xiaomi Mi 12s Pro', 'Xiaomi Mi 12 Pro 5G', 'Xiaomi Mi 12 Lite 5G', 'Xiaomi Redmi Note 11T Pro Plus', 'Xiaomi Redmi Note 11T Pro', 'Xiaomi Redmi K50i', 'Xiaomi Mi 11T 5G', 'Xiaomi Redmi Note 11E Pro', 'Xiaomi Redmi Note 11 Pro Plus 5G'],
  Oppo: ['Oppo Find X7 Ultra', 'Oppo Find X6 Pro', 'Oppo Reno12 Pro', 'Oppo Reno12', 'Oppo Reno11 Pro', 'Oppo A78', 'Oppo A58'],
  Vivo: ['Vivo X100 Pro', 'Vivo X100', 'Vivo V30 Pro', 'Vivo V30', 'Vivo V29', 'Vivo Y200', 'Vivo Y100'],
  IQOO: ['iQOO 12', 'iQOO 11', 'iQOO Neo9 Pro', 'iQOO Neo7 Pro', 'iQOO Z9', 'iQOO Z7 Pro'],
  Realme: ['Realme GT 6', 'Realme GT 5 Pro', 'Realme 12 Pro Plus', 'Realme 12 Pro', 'Realme 11 Pro Plus', 'Realme Narzo 70 Pro', 'Realme C67'],
  Poco: ['Poco F6 Pro', 'Poco F6', 'Poco X6 Pro', 'Poco X6', 'Poco M6 Pro', 'Poco C65'],
  Asus: ['ROG Phone 8 Pro', 'ROG Phone 8', 'Zenfone 11 Ultra', 'Zenfone 10', 'ROG Phone 7'],
  Coolpad: ['Coolpad Cool 30', 'Coolpad Cool 20 Pro', 'Coolpad Legacy', 'Coolpad Note 5'],
  HTC: ['HTC U24 Pro', 'HTC U23 Pro', 'HTC Desire 22 Pro', 'HTC U20 5G'],
  Huawei: ['Huawei Pura 70 Ultra', 'Huawei Pura 70 Pro', 'Huawei Mate 60 Pro', 'Huawei P60 Pro', 'Huawei Nova 12 Pro'],
  Lenovo: ['Lenovo Legion Y90', 'Lenovo Legion Phone Duel 2', 'Lenovo K14 Plus', 'Lenovo K13 Note'],
  Nokia: ['Nokia G42 5G', 'Nokia X30 5G', 'Nokia G60 5G', 'Nokia C32', 'Nokia C22', 'Nokia XR21'],
  Motorola: ['Motorola Edge 50 Ultra', 'Motorola Edge 50 Pro', 'Motorola Razr 50 Ultra', 'Motorola Razr 40 Ultra', 'Moto G84', 'Moto G54'],
  Sony: ['Sony Xperia 1 VI', 'Sony Xperia 5 V', 'Sony Xperia 10 VI', 'Sony Xperia 1 V', 'Sony Xperia 10 V'],
};

const WATCH_MODEL_SEED: Record<string, string[]> = {
  'No Brand': ['No Model'],
  Apple: ['Apple Watch Series 10', 'Apple Watch Series 9', 'Apple Watch Ultra 2', 'Apple Watch SE'],
  Samsung: ['Galaxy Watch7', 'Galaxy Watch Ultra', 'Galaxy Watch6 Classic', 'Galaxy Watch6'],
  Huawei: ['Huawei Watch GT 4', 'Huawei Watch Fit 3', 'Huawei Watch 4 Pro'],
  Xiaomi: ['Xiaomi Watch 2 Pro', 'Xiaomi Watch S3', 'Redmi Watch 4'],
  Amazfit: ['Amazfit Balance', 'Amazfit GTR 4', 'Amazfit Bip 5'],
  Garmin: ['Garmin Venu 3', 'Garmin Forerunner 265', 'Garmin Instinct 2'],
};

function seedSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

async function upsertMainCategory(name: string, sortOrder: number, requiresBrandModel = false) {
  const slug = seedSlug(name);
  return prisma.mainCategory.upsert({
    where: { slug },
    update: { name, sort_order: sortOrder, requires_brand_model: requiresBrandModel, is_active: true },
    create: { name, slug, sort_order: sortOrder, requires_brand_model: requiresBrandModel, is_active: true },
  });
}

async function upsertBrandWithModels(mainCategoryId: string, name: string, models: string[], sortOrder: number) {
  const slug = seedSlug(name);
  const brand = await prisma.brand.upsert({
    where: { slug },
    update: { name, sort_order: sortOrder, is_active: true },
    create: { name, slug, sort_order: sortOrder, is_active: true },
  });
  await prisma.categoryBrand.upsert({
    where: { main_category_id_brand_id: { main_category_id: mainCategoryId, brand_id: brand.id } },
    update: { sort_order: sortOrder },
    create: { main_category_id: mainCategoryId, brand_id: brand.id, sort_order: sortOrder },
  });
  for (const [index, modelName] of models.entries()) {
    const modelSlug = seedSlug(modelName);
    await prisma.brandModel.upsert({
      where: { brand_id_slug: { brand_id: brand.id, slug: modelSlug } },
      update: { name: modelName, sort_order: index, is_active: true },
      create: { brand_id: brand.id, name: modelName, slug: modelSlug, sort_order: index, is_active: true },
    });
  }
}

async function upsertProductTypes(mainCategoryId: string, names: string[]) {
  for (const [index, name] of names.entries()) {
    const slug = seedSlug(name);
    await prisma.productType.upsert({
      where: { main_category_id_slug: { main_category_id: mainCategoryId, slug } },
      update: { name, sort_order: index, is_active: true },
      create: { main_category_id: mainCategoryId, name, slug, sort_order: index, is_active: true },
    });
  }
}

async function syncLocalTaxonomySeed() {
  const phoneAccessories = await upsertMainCategory('Phone Accessories', 1, true);
  const gadgets = await upsertMainCategory('Gadgets', 2, false);
  const watches = await upsertMainCategory('Watches', 3, true);

  await upsertProductTypes(phoneAccessories.id, ['Phone Cover', 'Screen Protector', 'Camera Lens Protector', 'Charger', 'Cable', 'Earbud', 'Earphone', 'Power Bank', 'Holder & Stand']);
  await upsertProductTypes(gadgets.id, ['Bluetooth Speaker', 'Power Bank', 'Adapter', 'Cable Organizer', 'Smart Gadget']);
  await upsertProductTypes(watches.id, ['Smart Watch Strap', 'Watch Protector', 'Charging Dock', 'Watch Case']);

  await upsertBrandWithModels(phoneAccessories.id, 'No Brand', ['No Model'], 0);
  for (const [index, [brandName, models]] of Object.entries(PHONE_MODEL_SEED).entries()) {
    await upsertBrandWithModels(phoneAccessories.id, brandName, models, index + 1);
  }
  for (const [index, [brandName, models]] of Object.entries(WATCH_MODEL_SEED).entries()) {
    await upsertBrandWithModels(watches.id, brandName, models, index);
  }
}

async function syncLegacyCategoryMirror() {
  const categories = [
    { name: 'Phone Accessories', slug: 'phone-accessories', icon: 'smartphone', sort_order: 1 },
    { name: 'Gadgets', slug: 'gadgets', icon: 'package', sort_order: 2 },
    { name: 'Watches', slug: 'watches', icon: 'watch', sort_order: 3 },
  ];

  for (const category of categories) {
    await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        sort_order: category.sort_order,
        is_active: true,
        parent_id: null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sort_order: category.sort_order,
        is_active: true,
      },
    });
  }
}

async function syncShippingChargeSeed() {
  const rows = [
    { delivery_area: 'inside Dhaka', cost: 80 },
    { delivery_area: 'outside_dhaka', cost: 130 },
  ];

  for (const row of rows) {
    await prisma.shippingCharge.upsert({
      where: { delivery_area: row.delivery_area },
      update: {
        cost: row.cost,
        is_active: true,
      },
      create: {
        delivery_area: row.delivery_area,
        cost: row.cost,
        is_active: true,
      },
    });
  }
}

async function main() {
  console.log('Seeding matrix-ecommerce ecommerce database...');

  await ensureRoles();
  console.log('Roles created');

  const admin = await ensureUser('admin@gmail.com', 'admin123', 'ADMIN', '+8613888888888');
  const seller = await ensureUser('seller@gmail.com', 'seller123', 'SELLER', '+8613999999999');
  await ensureUser('customer@gmail.com', 'customer123', 'CUSTOMER', '+8801700000000');

  await prisma.sellerProfile.upsert({
    where: { user_id: seller.id },
    update: {},
    create: {
      user_id: seller.id,
      shop_name: 'Matrix Ecommerce Store',
      display_name: 'Matrix Ecommerce Store',
      contact_name: 'Matrix Ecommerce Team',
      whatsapp: '+8613999999999',
      email: 'seller@gmail.com',
      description: 'Premium Bangladesh shopping storefront with seller approval workflow.',
      address_text: 'Mirpur, Pallabi Thana, Section -12, Dhaka-1216, Bangladesh.',
      service_area: 'Dhaka, Bangladesh',
      verified: true,
      is_active: true,
    },
  });
  console.log('Default seller profile created');

  await syncLocalTaxonomySeed();
  console.log('Local taxonomy created');
  await syncLegacyCategoryMirror();
  console.log('Compatibility categories mirrored');
  await syncShippingChargeSeed();
  console.log('Shipping charges created');

  const legacyCategories = await prisma.productCategory.findMany({
    where: {
      slug: {
        in: ['phone-accessories', 'gadgets', 'watches'],
      },
    },
  });
  const categoryMap = new Map(legacyCategories.map((item) => [item.slug, item.id]));
  const mainCategories = await prisma.mainCategory.findMany();
  const mainCategoryMap = new Map(mainCategories.map((item) => [item.slug, item.id]));
  const productTypes = await prisma.productType.findMany();
  const productTypeMap = new Map(productTypes.map((item) => [item.main_category_id + ':' + item.slug, item.id]));
  const seededProducts = new Map<string, any>();

  const products = [
    {
      slug: 'iphone-15-pro-max-clear-case',
      category: 'phone-accessories',
      mainCategory: 'phone-accessories',
      productType: 'phone-cover',
      title: 'iPhone 15 Pro Max Clear Case',
      price: 390,
      original_price: 490,
      stock_qty: 120,
      brand: 'Matrix Ecommerce',
      description: 'Crystal clear shockproof mobile case for daily protection.',
      tags: ['phone-cover', 'featured'],
      weight_kg: 0.08,
    },
    {
      slug: 'samsung-a55-tempered-glass',
      category: 'phone-accessories',
      mainCategory: 'phone-accessories',
      productType: 'screen-protector',
      title: 'Samsung Galaxy A55 Tempered Glass',
      price: 180,
      original_price: 250,
      stock_qty: 80,
      brand: 'Matrix Ecommerce',
      description: '9H screen protector for Samsung Galaxy A55 5G.',
      tags: ['screen-protector', 'bestseller'],
      weight_kg: 0.04,
    },
    {
      slug: 'type-c-fast-charger-25w',
      category: 'phone-accessories',
      mainCategory: 'phone-accessories',
      productType: 'charger',
      title: '25W Type-C Fast Charger',
      price: 650,
      original_price: 790,
      stock_qty: 60,
      brand: 'Matrix Ecommerce',
      description: 'Local-ready USB-C wall charger for phones and accessories.',
      tags: ['charger', 'best-value'],
      weight_kg: 0.12,
    },
  ];

  for (const product of products) {
    const categoryId = categoryMap.get(product.category) || null;
    const mainCategoryId = product.mainCategory ? mainCategoryMap.get(product.mainCategory) || null : null;
    const productTypeId = mainCategoryId && product.productType
      ? productTypeMap.get(mainCategoryId + ':' + product.productType) || null
      : null;

    const savedProduct = await prisma.product.upsert({
      where: { sku: product.slug },
      update: {
        title: product.title,
        price: product.price,
        original_price: product.original_price,
        stock_qty: product.stock_qty,
        brand: product.brand,
        description: product.description,
        tags: product.tags,
        weight_kg: product.weight_kg,
        category_id: categoryId,
        main_category_id: mainCategoryId,
        product_type_id: productTypeId,
        status: 'published',
        source_kind: 'manual',
      },
      create: {
        seller_id: seller.id,
        category_id: categoryId,
        main_category_id: mainCategoryId,
        product_type_id: productTypeId,
        title: product.title,
        description: product.description,
        price: product.price,
        original_price: product.original_price,
        stock_qty: product.stock_qty,
        brand: product.brand,
        tags: product.tags,
        weight_kg: product.weight_kg,
        sku: product.slug,
        status: 'published',
        source_kind: 'manual',
      },
    });
    await syncProductSearchVector(savedProduct.id);
    seededProducts.set(product.slug, savedProduct);
  }
  console.log('Sample products created');

  await syncHomepageHotDealsSeed([
    seededProducts.get('iphone-15-pro-max-clear-case')?.id,
    seededProducts.get('type-c-fast-charger-25w')?.id,
  ]);
  console.log('Homepage hot items created');

  await prisma.homepageBanner.upsert({
    where: { id: 'matrix-ecommerce-home-banner' },
    update: {
      title: 'Get factory price with fastest delivery',
      subtitle: 'Premium shopping concierge for China sourcing',
      link: '/shopping',
      cta_text: 'Shop now',
      is_active: true,
      sort_order: 1,
    },
    create: {
      id: 'matrix-ecommerce-home-banner',
      title: 'Get factory price with fastest delivery',
      subtitle: 'Premium shopping concierge for China sourcing',
      link: '/shopping',
      cta_text: 'Shop now',
      is_active: true,
      sort_order: 1,
    },
  });

  await prisma.homepageOffer.upsert({
    where: { id: 'matrix-ecommerce-hero-offer' },
    update: {
      title: 'Cash on order, proof later',
      subtitle: 'Upload payment slip from your profile',
      description: 'Seller approval, admin purchase, then shipment updates.',
      offer_type: 'trust',
      currency: 'BDT',
      value: 0,
      is_active: true,
      sort_order: 1,
    },
    create: {
      id: 'matrix-ecommerce-hero-offer',
      title: 'Cash on order, proof later',
      subtitle: 'Upload payment slip from your profile',
      description: 'Seller approval, admin purchase, then shipment updates.',
      offer_type: 'trust',
      currency: 'BDT',
      value: 0,
      is_active: true,
      sort_order: 1,
    },
  });
  console.log('Homepage content created');

  await syncHomepageVisualMenuSeed();
  console.log('Homepage visual menu created');

  await prisma.blogPost.upsert({
    where: { slug: 'welcome-to-matrix-ecommerce' },
    update: {},
    create: {
      slug: 'welcome-to-matrix-ecommerce',
      title: 'Welcome to Matrix Ecommerce',
      excerpt: 'How the new shopping-first workflow works.',
      content_md: '# Matrix Ecommerce\n\nA shopping-first admin-uploaded product experience.',
      status: 'published',
      published_at: new Date(),
      created_by: admin.id,
    },
  });
  console.log('Blog post created');

  console.log('\nSeeding completed');
  console.log('Admin: admin@gmail.com / admin123');
  console.log('Seller: seller@gmail.com / seller123');
  console.log('Customer: customer@gmail.com / customer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
