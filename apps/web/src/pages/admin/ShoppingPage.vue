<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <PageHeader
        title="Shopping Management"
        subtitle="Manage the catalog taxonomy, manual products, media links, and SKU rows"
      />
      <div class="flex gap-2">
        <Button variant="ghost" @click="activeTab = 'products'">Products</Button>
        <Button variant="ghost" @click="activeTab = 'taxonomy'">Taxonomy</Button>
      </div>
    </div>

    <Card v-if="activeTab === 'products'">
      <CardHeader>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold">Products</h3>
            <p class="text-sm text-slate-500">{{ productTotal }} total products</p>
          </div>
          <Button variant="primary" size="sm" @click="openProductModal()">Add Product</Button>
        </div>
      </CardHeader>
      <CardBody class="space-y-4">
        <div class="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
          <Input v-model="productSearch" placeholder="Search title, brand, SKU, or source" label="Search" />
          <Select v-model="productCategoryFilter" label="Main category" :options="productCategoryOptions" />
          <Select v-model="productStatusFilter" label="Status" :options="statusOptions" />
          <div class="flex items-end">
            <Button variant="ghost" class="w-full" @click="resetProductFilters">Clear</Button>
          </div>
        </div>

        <div v-if="loadingProducts" class="py-10 text-center text-sm text-slate-500">Loading products...</div>
        <div v-else-if="productRows.length === 0" class="py-10 text-center text-slate-500">No products found</div>
        <div v-else class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="min-w-full border-separate border-spacing-0 text-[12px]">
            <thead class="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Title</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Catalog path</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Seller label</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Price</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">SKUs</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Media</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Status</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in productRows" :key="product.id" class="align-top hover:bg-slate-50/80">
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="flex items-start gap-3">
                    <img
                      :src="product.coverAsset?.thumbnail_url || product.coverAsset?.public_url || placeholderImage"
                      alt="cover"
                      class="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                    />
                    <div class="min-w-0">
                      <div class="truncate font-semibold text-slate-900">{{ product.title }}</div>
                      <div class="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span v-if="product.external_id" class="rounded-full bg-slate-100 px-2 py-0.5">Ext {{ product.external_id }}</span>
                        <span v-if="product.source_kind" class="rounded-full bg-slate-100 px-2 py-0.5">{{ product.source_kind }}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <div class="font-medium text-slate-900">{{ product.mainCategory?.name || 'No main category' }}</div>
                    <div class="text-slate-500">
                      {{ product.productType?.name || 'No product type' }}
                      <span v-if="product.taxonomyBrand?.name"> - {{ product.taxonomyBrand.name }}</span>
                    </div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <div class="font-medium text-slate-900">{{ product.brand || 'Admin added' }}</div>
                    <div class="text-slate-500">{{ product.seller?.email || 'Manual product' }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <div class="font-semibold text-rose-600">{{ money(product.price, product.currency) }}</div>
                    <div v-if="product.original_price && product.original_price > product.price" class="text-[11px] text-slate-400 line-through">
                      {{ money(product.original_price, product.currency) }}
                    </div>
                    <div class="text-slate-500">MOQ {{ product.minimum_order_qty || 1 }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <Badge variant="default" class="text-[11px]">
                      {{ skuCount(product) }} SKU{{ skuCount(product) === 1 ? '' : 's' }}
                    </Badge>
                    <div v-if="product.sku" class="text-slate-500">Master: {{ product.sku }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <div class="text-slate-900">{{ galleryCount(product) }} images</div>
                    <div class="text-slate-500">{{ product.cover_asset_id ? 'Cover set' : 'No cover' }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <Badge :variant="product.status === 'published' ? 'success' : 'default'" class="text-[11px]">
                    {{ product.status }}
                  </Badge>
                </td>
                <td class="border-b border-slate-100 px-3 py-3 text-right">
                  <div class="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" class="h-7 px-2 text-[11px]" @click="openProductModal(product)">Edit</Button>
                    <Button variant="ghost" size="sm" class="h-7 px-2 text-[11px] text-red-600 hover:text-red-700" @click="deleteProduct(product.id)">Delete</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-slate-200 pt-3">
          <Pagination
            :current-page="productPage"
            :total-pages="productTotalPages"
            :total="productTotal"
            :page-size="productLimit"
            @update:currentPage="handleProductPageChange"
          />
        </div>
      </CardBody>
    </Card>

    <Card v-else>
      <CardHeader>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold">Main categories, brands, models, and product types</h3>
            <p class="text-sm text-slate-500">This is the only catalog structure for uploads: main category -> brand -> model -> product type.</p>
          </div>
          <Button variant="ghost" size="sm" @click="loadTaxonomy">Refresh</Button>
        </div>
      </CardHeader>
      <CardBody class="space-y-6">
        <div class="grid gap-4 xl:grid-cols-2">
          <form class="space-y-3 rounded-2xl border border-slate-200 p-4" @submit.prevent="saveMainCategory">
            <h4 class="font-semibold text-slate-900">Add main category</h4>
            <div v-if="taxonomyFeedback.mainCategory" class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {{ taxonomyFeedback.mainCategory }}
            </div>
            <Input v-model="mainCategoryForm.name" label="Name" placeholder="Phone Accessories" required />
            <Input v-model="mainCategoryForm.slug" label="Slug" placeholder="phone-accessories" />
            <Input v-model.number="mainCategoryForm.sort_order" type="number" label="Sort order" />
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="mainCategoryForm.requires_brand_model" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-teal-600" />
              Requires brand and model
            </label>
            <Button type="submit" variant="primary" size="sm" :loading="saving">Save main category</Button>
          </form>

          <form class="space-y-3 rounded-2xl border border-slate-200 p-4" @submit.prevent="saveBrand">
            <h4 class="font-semibold text-slate-900">Add brand</h4>
            <div v-if="taxonomyFeedback.brand" class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {{ taxonomyFeedback.brand }}
            </div>
            <Input v-model="brandForm.name" label="Brand name" placeholder="Xiaomi" required />
            <Input v-model="brandForm.slug" label="Slug" placeholder="xiaomi" />
            <Select v-model="brandForm.main_category_id" label="Main category link" :options="mainCategoryOptions" />
            <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Only brands added here appear in the product upload form for the linked main category.
            </div>
            <Input v-model.number="brandForm.sort_order" type="number" label="Sort order" />
            <Button type="submit" variant="primary" size="sm" :loading="saving">Save brand</Button>
          </form>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <form class="space-y-3 rounded-2xl border border-slate-200 p-4" @submit.prevent="saveBrandModel">
            <h4 class="font-semibold text-slate-900">Add model</h4>
            <div v-if="taxonomyFeedback.brandModel" class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {{ taxonomyFeedback.brandModel }}
            </div>
            <Select v-model="brandModelForm.brand_id" label="Brand" :options="brandOptions" />
            <Input v-model="brandModelForm.name" label="Model name" placeholder="Redmi Note 13 Pro" required />
            <Input v-model="brandModelForm.slug" label="Slug" placeholder="redmi-note-13-pro" />
            <Input v-model.number="brandModelForm.sort_order" type="number" label="Sort order" />
            <Button type="submit" variant="primary" size="sm" :loading="saving">Save model</Button>
          </form>

          <form class="space-y-3 rounded-2xl border border-slate-200 p-4" @submit.prevent="saveProductType">
            <h4 class="font-semibold text-slate-900">Add product type</h4>
            <div v-if="taxonomyFeedback.productType" class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {{ taxonomyFeedback.productType }}
            </div>
            <Select v-model="productTypeForm.main_category_id" label="Main category" :options="mainCategoryOptions" />
            <Input v-model="productTypeForm.name" label="Type name" placeholder="Phone Cover" required />
            <Input v-model="productTypeForm.slug" label="Slug" placeholder="phone-cover" />
            <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Product types are shown in the upload form under their selected main category only.
            </div>
            <Input v-model.number="productTypeForm.sort_order" type="number" label="Sort order" />
            <Button type="submit" variant="primary" size="sm" :loading="saving">Save product type</Button>
          </form>
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 p-4">
            <h4 class="font-semibold text-slate-900">Main categories</h4>
            <div class="mt-3 space-y-2 text-sm">
              <div v-for="item in taxonomy.mainCategories" :key="item.id" class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <div class="min-w-0">
                  <div class="truncate font-semibold text-slate-900">{{ item.name }}</div>
                  <div class="truncate text-xs text-slate-500">{{ item.slug }}</div>
                </div>
                <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="deleteMainCategory(item)">Delete</Button>
              </div>
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 p-4">
            <h4 class="font-semibold text-slate-900">Brands and models</h4>
            <div class="mt-3 max-h-96 space-y-2 overflow-auto pr-1 text-sm">
              <div v-for="brand in taxonomy.brands" :key="brand.id" class="rounded-xl bg-slate-50 px-3 py-2">
                <div v-if="editingBrandId === brand.id" class="space-y-3">
                  <div v-if="taxonomyFeedback.brandEdit" class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {{ taxonomyFeedback.brandEdit }}
                  </div>
                  <div class="grid gap-3 md:grid-cols-2">
                    <Input v-model="brandEditForm.name" label="Brand name" />
                    <Input v-model="brandEditForm.slug" label="Slug" />
                  </div>
                  <div class="grid gap-3 md:grid-cols-2">
                    <Select v-model="brandEditForm.main_category_id" label="Main category link" :options="mainCategoryOptions" />
                    <Input v-model.number="brandEditForm.sort_order" type="number" label="Sort order" />
                  </div>
                  <div class="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" type="button" @click="cancelBrandEdit">Cancel</Button>
                    <Button variant="primary" size="sm" type="button" :loading="saving" @click="updateBrand(brand)">Save</Button>
                  </div>
                </div>
                <div v-else class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-slate-900">{{ brand.name }}</div>
                    <div class="truncate text-xs text-slate-500">
                      {{ brandMainCategoryLabel(brand) }} • {{ brand.models?.length || 0 }} model(s)
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button variant="ghost" size="sm" type="button" @click="startBrandEdit(brand)">Edit</Button>
                    <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="deleteBrand(brand)">Delete</Button>
                  </div>
                </div>
                <div v-if="brand.models?.length" class="mt-2 flex flex-wrap gap-1">
                  <button
                    v-for="model in brand.models.slice(0, 8)"
                    :key="model.id"
                    type="button"
                    class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:text-teal-700"
                    :title="`Edit ${model.name}`"
                    @click="startBrandModelEdit(model, brand)"
                  >
                    {{ model.name }}
                  </button>
                </div>
                <div v-if="editingBrandModelId === brand.id" class="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <div v-if="taxonomyFeedback.brandModelEdit" class="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {{ taxonomyFeedback.brandModelEdit }}
                  </div>
                  <div class="grid gap-3 md:grid-cols-2">
                    <Input v-model="brandModelEditForm.name" label="Model name" />
                    <Input v-model="brandModelEditForm.slug" label="Slug" />
                  </div>
                  <div class="mt-3 grid gap-3 md:grid-cols-2">
                    <Select v-model="brandModelEditForm.brand_id" label="Brand" :options="brandOptions" />
                    <Input v-model.number="brandModelEditForm.sort_order" type="number" label="Sort order" />
                  </div>
                  <div class="mt-3 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" type="button" class="text-red-600 hover:text-red-700" @click="deleteBrandModelByEdit">Delete</Button>
                    <Button variant="ghost" size="sm" type="button" @click="cancelBrandModelEdit">Cancel</Button>
                    <Button variant="primary" size="sm" type="button" :loading="saving" @click="updateBrandModel">Save</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 p-4">
            <h4 class="font-semibold text-slate-900">Product types</h4>
            <div class="mt-3 space-y-2 text-sm">
              <div v-for="type in taxonomy.productTypes" :key="type.id" class="rounded-xl bg-slate-50 px-3 py-2">
                <div v-if="editingProductTypeId === type.id" class="space-y-3">
                  <div v-if="taxonomyFeedback.productTypeEdit" class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {{ taxonomyFeedback.productTypeEdit }}
                  </div>
                  <div class="grid gap-3 md:grid-cols-2">
                    <Input v-model="productTypeEditForm.name" label="Type name" />
                    <Input v-model="productTypeEditForm.slug" label="Slug" />
                  </div>
                  <div class="grid gap-3 md:grid-cols-2">
                    <Select v-model="productTypeEditForm.main_category_id" label="Main category" :options="mainCategoryOptions" />
                    <Input v-model.number="productTypeEditForm.sort_order" type="number" label="Sort order" />
                  </div>
                  <div class="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" type="button" @click="cancelProductTypeEdit">Cancel</Button>
                    <Button variant="primary" size="sm" type="button" :loading="saving" @click="updateProductType(type)">Save</Button>
                  </div>
                </div>
                <div v-else class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-slate-900">{{ type.name }}</div>
                    <div class="truncate text-xs text-slate-500">{{ type.mainCategory?.name || 'No main category' }}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button variant="ghost" size="sm" type="button" @click="startProductTypeEdit(type)">Edit</Button>
                    <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="deleteProductType(type)">Delete</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>

    <Modal v-model="showProductModal" :title="editingProduct ? 'Edit Product' : 'Add Product'" size="full">
      <form class="flex h-[calc(100vh-130px)] min-h-0 flex-col overflow-hidden" @submit.prevent="saveProduct">
        <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-2">
          <div v-if="productFormError" class="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ productFormError }}
          </div>
          <div class="space-y-5">
            <div class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <div class="mb-4">
                <h4 class="text-base font-black text-slate-950">Product information</h4>
                <p class="text-xs text-slate-500">Core product content, taxonomy, and pricing.</p>
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <Input v-model="productForm.seller_name" label="Seller name / brand" placeholder="Admin, shop, or display label" />
                <Select v-model="productForm.status" label="Status" :options="statusOptions" />
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Select v-model="productForm.main_category_id" label="Main category" :options="mainCategoryOptions" />
                <Select v-model="productForm.brand_id" label="Brand" :options="filteredBrandOptions" />
                <Select v-model="productForm.brand_model_id" label="Model" :options="filteredBrandModelOptions" />
                <Select v-model="productForm.product_type_id" label="Product type" :options="filteredProductTypeOptions" />
              </div>
              <div class="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
                Catalog selection uses taxonomy only. Pick a main category first, then the brand, model, and product type that belong to that main category.
                <span class="block pt-1">
                  Available right now:
                  {{ filteredBrands.length }} brand(s),
                  {{ filteredBrandModelOptions.length - 1 }} model(s),
                  {{ filteredProductTypeOptions.length - 1 }} product type(s)
                  for the selected main category.
                </span>
              </div>

              <div class="mt-4 space-y-4">
                <Input v-model="productForm.title" label="Title" required />
                <Textarea v-model="productForm.description" label="Description" :rows="7" />
              </div>
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white p-5">
              <div class="mb-4">
                <h4 class="text-base font-black text-slate-950">Price, stock, and optional references</h4>
                <p class="text-xs text-slate-500">BDT is the storefront currency. Supplier/reference fields are optional.</p>
              </div>
              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Input v-model.number="productForm.price" type="number" label="Price" required />
                <Input v-model.number="productForm.original_price" type="number" label="Strikethrough price" placeholder="Optional compare price" min="0" />
                <Select v-model="productForm.currency" label="Currency" :options="currencyOptions" />
                <Input v-model.number="productForm.stock_qty" type="number" label="Stock" min="0" />
                <Input v-model.number="productForm.minimum_order_qty" type="number" min="1" label="Minimum order qty" />
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Input v-model.number="productForm.rating" type="number" step="0.1" min="0" max="5" label="Rating" placeholder="0 to 5" />
                <Input v-model.number="productForm.review_count" type="number" min="0" label="Number of reviews" />
                <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500 sm:col-span-2">
                  Ratings and review count are manual display fields for the storefront card and product detail page.
                </div>
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Input v-model="productForm.sku" label="Master SKU" placeholder="Optional top-level SKU" />
                <Input v-model.number="productForm.weight_kg" type="number" step="0.01" label="Weight (kg)" />
                <Input v-model="productForm.source_url" label="Source URL" placeholder="Optional source/reference" />
                <Input v-model="productForm.external_id" label="External ID" placeholder="Optional reference ID" />
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Input v-model="productForm.product_url" label="Product URL" placeholder="Optional product link" />
                <Input v-model="productForm.vendor_id" label="Vendor ID" placeholder="Optional vendor ID" />
                <Input v-model="productForm.vendor_name" label="Vendor name" placeholder="Optional vendor name" />
                <Input v-model="productForm.shop_url" label="Shop URL" placeholder="Optional shop URL" />
              </div>
            </div>
          </div>
          <div class="space-y-5">
          <div class="rounded-2xl border border-dashed border-teal-200 bg-teal-50/50 px-4 py-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700">Selected media</label>
                <div class="text-xs text-slate-500">Pick a cover image, gallery shots, and one optional video from the Media library.</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-semibold text-slate-900">{{ productForm.gallery_asset_ids.length }} gallery image(s)</div>
                <div class="text-xs text-slate-500">{{ productForm.video_asset_id ? 'Video selected' : 'No video selected' }}</div>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" @click="router.push('/admin/media')">Open Media Library</Button>
              <Button type="button" size="sm" variant="ghost" @click="refreshMediaAssets" :loading="mediaLoading">Refresh media</Button>
            </div>
          </div>

        <div class="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 class="text-base font-semibold text-slate-900">Media library</h4>
              <p class="text-xs text-slate-500">Media loads by the current main category, brand, model, and product type. Switch to General when you need shared images.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" type="button" @click="router.push('/admin/media')">Media page</Button>
              <Button variant="ghost" size="sm" type="button" @click="refreshMediaAssets" :loading="mediaLoading">Refresh media</Button>
            </div>
          </div>
          <div class="grid gap-3 md:grid-cols-[1.1fr_0.9fr_auto]">
            <Input v-model="mediaSearchQuery" label="Search media" placeholder="Search by image name or filename" />
            <Select v-model="mediaCategoryFilter" label="Media category" :options="mediaCategoryOptions" />
            <div class="flex items-end">
              <Button type="button" variant="primary" class="w-full" @click="refreshMediaAssets" :loading="mediaLoading">Load media</Button>
            </div>
          </div>
          <div class="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-3">
            <div class="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="primary" @click="productMediaInput?.click()">Choose images/videos</Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                :disabled="productMediaFiles.length === 0"
                :loading="productMediaUploading"
                @click="uploadProductMedia"
              >
                Upload selected
              </Button>
              <span class="text-xs text-slate-500">{{ productMediaFiles.length }} file(s) selected</span>
            </div>
            <p class="mt-2 text-[11px] text-slate-500">
              Uploads from this form are tagged to the current taxonomy path, or to General when you choose the shared-media option.
            </p>
            <input ref="productMediaInput" type="file" accept="image/*,video/*" multiple class="hidden" @change="onProductMediaPick" />
            <div v-if="productMediaFiles.length > 0" class="mt-2 flex flex-wrap gap-2">
              <span v-for="file in productMediaFiles" :key="file.name + file.size" class="rounded-full bg-white px-2 py-1 text-[10px] text-slate-600">
                {{ file.name }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>Cover: <span class="font-semibold text-slate-900">{{ productForm.cover_asset_id ? getMediaLabel(findKnownMediaAsset(productForm.cover_asset_id)) : 'Not selected' }}</span></span>
            <span>Gallery selected: <span class="font-semibold text-slate-900">{{ productForm.gallery_asset_ids.length }}</span></span>
            <span>Video: <span class="font-semibold text-slate-900">{{ productForm.video_asset_id ? getMediaLabel(findKnownMediaAsset(productForm.video_asset_id)) : 'Not selected' }}</span></span>
          </div>

          <div v-if="selectedMediaPreview.length > 0" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div v-for="asset in selectedMediaPreview" :key="`selected-${asset.id}`" class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div class="aspect-[4/3] bg-slate-100">
                <video v-if="isVideoAsset(asset)" :src="asset.public_url" class="h-full w-full object-cover" muted />
                <img v-else :src="asset.thumbnail_url || asset.public_url" class="h-full w-full object-cover" :alt="asset.r2_key" />
              </div>
              <div class="space-y-1 px-3 py-3">
                <div class="truncate text-xs font-semibold text-slate-900">{{ getMediaLabel(asset) }}</div>
                <div class="text-[11px] text-slate-500">
                  {{ productForm.cover_asset_id === asset.id ? 'Cover image' : productForm.video_asset_id === asset.id ? 'Product video' : 'Gallery image' }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="mediaLoading && mediaAssets.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Loading media...
          </div>
          <div v-else-if="mediaAssets.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No media matched this category/search yet. Try another category, search by name, or upload new files.
          </div>
          <div v-else class="max-h-[420px] overflow-auto pr-1">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
              <div
                v-for="asset in mediaAssets"
                :key="asset.id"
                class="overflow-hidden rounded-xl border bg-white transition"
                :class="productForm.cover_asset_id === asset.id ? 'border-teal-500 ring-2 ring-teal-200' : productForm.gallery_asset_ids.includes(asset.id) ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200 hover:border-teal-300'"
              >
                <button type="button" class="block w-full text-left" @click="isVideoAsset(asset) ? setVideoAsset(asset.id) : toggleGalleryAsset(asset.id)">
                  <video v-if="isVideoAsset(asset)" :src="asset.public_url" class="aspect-square w-full object-cover" muted />
                  <img v-else :src="asset.thumbnail_url || asset.public_url" class="aspect-square w-full object-cover" :alt="asset.r2_key" />
                  <div class="space-y-1 px-2 py-2">
                    <div class="truncate text-[11px] font-medium text-slate-900">{{ getMediaLabel(asset) }}</div>
                    <div class="text-[10px] text-slate-500">
                      {{ isVideoAsset(asset) ? 'Click to use as product video' : productForm.gallery_asset_ids.includes(asset.id) ? 'Included in gallery' : 'Click to add to gallery' }}
                    </div>
                  </div>
                </button>
                <div class="flex items-center gap-2 border-t border-slate-100 px-2 py-2 text-[10px]">
                  <button type="button" class="rounded-full bg-teal-50 px-2 py-1 font-semibold text-teal-700 hover:bg-teal-100" @click="setCoverAsset(asset.id)">
                    Use as cover
                  </button>
                  <button v-if="isVideoAsset(asset)" type="button" class="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-200" @click="setVideoAsset(asset.id)">
                    Use as video
                  </button>
                  <span v-if="productForm.cover_asset_id === asset.id" class="rounded-full bg-teal-100 px-2 py-1 font-semibold text-teal-700">Cover</span>
                  <span v-if="productForm.video_asset_id === asset.id" class="rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-700">Video</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h4 class="text-base font-semibold text-slate-900">SKU variations</h4>
              <p class="text-xs text-slate-500">Add multiple SKU rows for size, color, or pricing options.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" @click="addSkuRow">Add row</Button>
          </div>
          <div v-for="(row, index) in skuRows" :key="index" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.15fr_0.95fr_0.75fr_0.75fr_1.25fr_auto]">
            <Input v-model="row.label" label="Option" placeholder="Color / Size" />
            <Input v-model="row.sku" label="SKU" placeholder="SKU code" />
            <Input v-model="row.price" label="Price" placeholder="Optional" />
            <Input v-model="row.stock_qty" label="Stock" placeholder="Optional" />
            <div class="space-y-2">
              <label class="block text-sm font-medium text-slate-700">SKU image</label>
              <Button type="button" variant="ghost" class="w-full justify-start rounded-lg border border-slate-300 px-3 py-2 text-left" @click="openSkuImagePicker(index)">
                <span class="flex min-w-0 items-center gap-3">
                  <img
                    v-if="row.image_asset_id && getMediaImage(findKnownMediaAsset(row.image_asset_id))"
                    :src="getMediaImage(findKnownMediaAsset(row.image_asset_id))"
                    alt="SKU"
                    class="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                  />
                  <span class="truncate">
                    {{ row.image_asset_id ? getMediaLabel(findKnownMediaAsset(row.image_asset_id)) : 'Assign from selected/search media' }}
                  </span>
                </span>
              </Button>
              <button v-if="row.image_asset_id" type="button" class="text-xs font-semibold text-rose-600 hover:text-rose-700" @click="row.image_asset_id = ''">
                Clear SKU image
              </button>
            </div>
            <div class="flex items-end">
              <Button type="button" variant="ghost" class="w-full" @click="removeSkuRow(index)">Remove</Button>
            </div>
          </div>
        </div>

        <div class="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h4 class="text-base font-semibold text-slate-900">Specification bullet points</h4>
              <p class="text-xs text-slate-500">Keep these separate from SKU variants. Use them for material, compatibility, features, box contents, or care notes.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" @click="addDetailPointRow">Add bullet</Button>
          </div>

          <div class="space-y-2">
            <div
              v-for="(row, index) in detailPointRows"
              :key="`detail-point-${index}`"
              class="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[130px_1fr_auto]"
            >
              <Select v-model="row.depth" label="Indent" :options="detailPointDepthOptions" />
              <Input v-model="row.text" label="Bullet point" placeholder="Example: Supports wireless charging" />
              <div class="flex items-end">
                <Button type="button" variant="ghost" class="w-full" @click="removeDetailPointRow(index)">Remove</Button>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-dashed border-slate-200 bg-white p-4">
            <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Preview</div>
            <div v-if="normalizedDetailPointPreview.length === 0" class="mt-2 text-sm text-slate-400">
              No specification bullets added yet.
            </div>
            <div v-else class="mt-3 space-y-2">
              <div
                v-for="(row, index) in normalizedDetailPointPreview"
                :key="`detail-preview-${index}`"
                class="flex items-start gap-2 text-sm text-slate-700"
                :style="{ paddingLeft: `${row.depth * 20}px` }"
              >
                <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500" />
                <span>{{ row.text }}</span>
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>

        <div class="mt-4 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white pt-4">
          <Button variant="ghost" type="button" @click="showProductModal = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-model="deleteConfirmOpen"
      :title="deleteConfirmTitle"
      :message="deleteConfirmMessage"
      confirm-text="Delete"
      confirm-variant="danger"
      @confirm="confirmDeleteAction"
    />

    <Modal v-model="showSkuImagePicker" title="Assign SKU image" size="xl">
      <div class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Assign from the product's selected images first. If the exact image is not there, search the filtered media library above and reopen this picker.
        </div>

        <div v-if="skuAssignableAssets.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No image assets are available yet. Add gallery/cover images or load media by category and search.
        </div>

        <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
          <button
            v-for="asset in skuAssignableAssets"
            :key="`sku-${asset.id}`"
            type="button"
            class="overflow-hidden rounded-2xl border bg-white text-left transition hover:border-teal-300"
            :class="activeSkuImageId === asset.id ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200'"
            @click="assignSkuImage(asset.id)"
          >
            <img :src="asset.thumbnail_url || asset.public_url" :alt="asset.r2_key" class="aspect-square w-full object-cover" />
            <div class="px-3 py-3">
              <div class="truncate text-xs font-semibold text-slate-900">{{ getMediaLabel(asset) }}</div>
              <div class="mt-1 text-[11px] text-slate-500">
                {{ selectedProductImageIds.includes(asset.id) ? 'Already selected for this product' : 'From media search results' }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@matrix-ecommerce/ui';
import { PageHeader, Card, CardHeader, CardBody, Button, ConfirmDialog, Modal, Input, Select, Textarea, Badge, Pagination } from '@matrix-ecommerce/ui';

type SkuRow = {
  label: string;
  sku: string;
  price: string;
  stock_qty: string;
  image_asset_id: string;
};

type DetailPointRow = {
  text: string;
  depth: number;
};

const toast = useToast();
const router = useRouter();
const activeTab = ref<'products' | 'taxonomy'>('products');
const loadingProducts = ref(false);
const saving = ref(false);
const showProductModal = ref(false);
const editingProduct = ref<any>(null);
const editingBrandId = ref('');
const editingBrandModelId = ref('');
const editingProductTypeId = ref('');
const productSearch = ref('');
const productCategoryFilter = ref('');
const productStatusFilter = ref('');
const productPage = ref(1);
const productLimit = ref(20);
const productTotal = ref(0);
const productTotalPages = ref(1);
const taxonomy = reactive({
  mainCategories: [] as any[],
  brands: [] as any[],
  productTypes: [] as any[],
});
const mediaAssets = ref<any[]>([]);
const knownMediaAssets = ref<Record<string, any>>({});
const mediaLoading = ref(false);
const mediaSearchQuery = ref('');
const mediaCategoryFilter = ref('__AUTO__');
const mediaLoadedOnce = ref(false);
const productMediaInput = ref<HTMLInputElement | null>(null);
const productMediaFiles = ref<File[]>([]);
const productMediaUploading = ref(false);
const showSkuImagePicker = ref(false);
const activeSkuRowIndex = ref<number | null>(null);
const deleteConfirmOpen = ref(false);
const deleteConfirmTitle = ref('Delete item');
const deleteConfirmMessage = ref('');
const deleteAction = ref<null | (() => Promise<void>)>(null);
const productFormError = ref('');
const taxonomyFeedback = reactive({
  mainCategory: '',
  brand: '',
  brandModel: '',
  productType: '',
  brandEdit: '',
  brandModelEdit: '',
  productTypeEdit: '',
});

const placeholderImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%25" height="100%25" fill="%23f1f5f9"/><path d="M70 125l25-28 20 22 18-20 27 26H70z" fill="%2394a3b8"/><circle cx="84" cy="84" r="12" fill="%2394a3b8"/></svg>';

function extractRequestError(error: any, fallback: string) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
}

function clearTaxonomyFeedback() {
  taxonomyFeedback.mainCategory = '';
  taxonomyFeedback.brand = '';
  taxonomyFeedback.brandModel = '';
  taxonomyFeedback.productType = '';
  taxonomyFeedback.brandEdit = '';
  taxonomyFeedback.brandModelEdit = '';
  taxonomyFeedback.productTypeEdit = '';
}

const productRows = ref<any[]>([]);
const productForm = reactive({
  seller_name: '',
  main_category_id: '',
  brand_id: '',
  brand_model_id: '',
  product_type_id: '',
  title: '',
  description: '',
  price: 0,
  original_price: '' as string | number,
  currency: 'BDT',
  rating: '' as string | number,
  review_count: 0,
  stock_qty: 0,
  sku: '',
  source_url: '',
  product_url: '',
  external_id: '',
  vendor_id: '',
  vendor_name: '',
  shop_url: '',
  weight_kg: '' as string | number,
  minimum_order_qty: 1,
  status: 'published',
  cover_asset_id: '',
  gallery_asset_ids: [] as string[],
  video_asset_id: '',
});
const skuRows = ref<SkuRow[]>([{ label: '', sku: '', price: '', stock_qty: '', image_asset_id: '' }]);
const detailPointRows = ref<DetailPointRow[]>([{ text: '', depth: 0 }]);
const mainCategoryForm = reactive({
  name: '',
  slug: '',
  sort_order: 0,
  requires_brand_model: false,
});
const brandForm = reactive({
  name: '',
  slug: '',
  main_category_id: '',
  sort_order: 0,
});
const brandModelForm = reactive({
  brand_id: '',
  name: '',
  slug: '',
  sort_order: 0,
});
const productTypeForm = reactive({
  main_category_id: '',
  name: '',
  slug: '',
  sort_order: 0,
});
const brandEditForm = reactive({
  name: '',
  slug: '',
  main_category_id: '',
  sort_order: 0,
});
const productTypeEditForm = reactive({
  main_category_id: '',
  name: '',
  slug: '',
  sort_order: 0,
});
const brandModelEditForm = reactive({
  id: '',
  brand_id: '',
  name: '',
  slug: '',
  sort_order: 0,
});

const currencyOptions = [{ value: 'BDT', label: 'BDT' }];

const detailPointDepthOptions = [
  { value: 0, label: 'Main bullet' },
  { value: 1, label: 'Sub bullet' },
  { value: 2, label: 'Nested bullet' },
];

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'paused', label: 'Paused' },
];

const productCategoryOptions = computed(() => [
  { value: '', label: 'All main categories' },
  ...taxonomy.mainCategories.map((item) => ({ value: item.id, label: item.name })),
]);

const mainCategoryOptions = computed(() => [
  { value: '', label: 'No main category' },
  ...taxonomy.mainCategories.map((item) => ({ value: item.id, label: item.name })),
]);

const filteredBrands = computed(() => {
  if (!productForm.main_category_id) return taxonomy.brands;
  return taxonomy.brands.filter((brand) =>
    Array.isArray(brand.categoryLinks) && brand.categoryLinks.some((link: any) => link.main_category_id === productForm.main_category_id)
  );
});

const brandOptions = computed(() => [
  { value: '', label: 'Select brand' },
  ...taxonomy.brands.map((brand) => ({ value: brand.id, label: brand.name })),
]);

const filteredBrandOptions = computed(() => [
  { value: '', label: 'No brand' },
  ...filteredBrands.value.map((brand) => ({ value: brand.id, label: brand.name })),
]);

const filteredBrandModelOptions = computed(() => {
  const brand = taxonomy.brands.find((item) => item.id === productForm.brand_id);
  return [
    { value: '', label: 'No model' },
    ...((brand?.models || []).map((model: any) => ({ value: model.id, label: model.name }))),
  ];
});

const filteredProductTypeOptions = computed(() => [
  { value: '', label: 'No product type' },
  ...taxonomy.productTypes
    .filter((type) => !productForm.main_category_id || type.main_category_id === productForm.main_category_id)
    .map((type) => ({ value: type.id, label: type.name })),
]);

const selectedMainCategory = computed(() => taxonomy.mainCategories.find((item) => item.id === productForm.main_category_id) || null);
const selectedProductType = computed(() => taxonomy.productTypes.find((item) => item.id === productForm.product_type_id) || null);

const mediaCategoryOptions = computed(() => [
  {
    value: '__AUTO__',
    label: selectedProductType.value?.name
      ? `Use current taxonomy (${selectedProductType.value.name})`
      : 'Use current taxonomy',
  },
  { value: '__GENERAL__', label: 'General media for this main category' },
  { value: '', label: 'All media' },
]);

const normalizedDetailPointPreview = computed(() =>
  detailPointRows.value
    .map((row) => ({
      text: String(row.text || '').trim(),
      depth: Math.max(0, Math.min(2, Number(row.depth || 0))),
    }))
    .filter((row) => row.text),
);

const selectedProductImageIds = computed(() => {
  const ids = new Set<string>();
  if (productForm.cover_asset_id) ids.add(productForm.cover_asset_id);
  for (const id of productForm.gallery_asset_ids) {
    if (id) ids.add(id);
  }
  return Array.from(ids);
});

const selectedMediaPreview = computed(() => {
  const ids = [
    productForm.cover_asset_id,
    ...productForm.gallery_asset_ids,
    productForm.video_asset_id,
  ].filter(Boolean) as string[];

  return ids
    .map((id) => findKnownMediaAsset(id))
    .filter(Boolean)
    .filter((asset, index, list) => list.findIndex((item) => item.id === asset.id) === index);
});

const skuAssignableAssets = computed(() => {
  const imageMap = new Map<string, any>();

  for (const id of selectedProductImageIds.value) {
    const asset = findKnownMediaAsset(id);
    if (asset && !isVideoAsset(asset)) imageMap.set(asset.id, asset);
  }

  for (const asset of mediaAssets.value) {
    if (asset && !isVideoAsset(asset)) imageMap.set(asset.id, asset);
  }

  return Array.from(imageMap.values());
});

const activeSkuImageId = computed(() => {
  if (activeSkuRowIndex.value === null) return '';
  return skuRows.value[activeSkuRowIndex.value]?.image_asset_id || '';
});

function money(amount: number | null | undefined, currency = 'BDT') {
  return `${currency} ${(amount ?? 0).toLocaleString()}`;
}

function brandMainCategoryLabel(brand: any) {
  const link = Array.isArray(brand.categoryLinks) ? brand.categoryLinks[0] : null;
  if (!link?.main_category_id) return 'No main category';
  return taxonomy.mainCategories.find((item) => item.id === link.main_category_id)?.name || 'No main category';
}

function resetProductForm() {
  productFormError.value = '';
  productForm.seller_name = '';
  productForm.main_category_id = taxonomy.mainCategories[0]?.id || '';
  productForm.brand_id = '';
  productForm.brand_model_id = '';
  productForm.product_type_id = '';
  productForm.title = '';
  productForm.description = '';
  productForm.price = 0;
  productForm.original_price = '';
  productForm.currency = 'BDT';
  productForm.rating = '';
  productForm.review_count = 0;
  productForm.stock_qty = 0;
  productForm.sku = '';
  productForm.source_url = '';
  productForm.product_url = '';
  productForm.external_id = '';
  productForm.vendor_id = '';
  productForm.vendor_name = '';
  productForm.shop_url = '';
  productForm.weight_kg = '';
  productForm.minimum_order_qty = 1;
  productForm.status = 'published';
  productForm.cover_asset_id = '';
  productForm.gallery_asset_ids = [];
  productForm.video_asset_id = '';
  skuRows.value = [{ label: '', sku: '', price: '', stock_qty: '', image_asset_id: '' }];
  detailPointRows.value = [{ text: '', depth: 0 }];
}

function normalizeSkuRows(value: unknown, fallbackSku = ''): SkuRow[] {
  let rows: any[] = [];
  if (Array.isArray(value)) {
    rows = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      rows = [];
    }
  }

  const normalized = rows
    .map((row) => ({
      label: String(row?.label || row?.name || '').trim(),
      sku: String(row?.sku || '').trim(),
      price: row?.price !== undefined && row?.price !== null && row?.price !== '' ? String(row.price) : '',
      stock_qty: row?.stock_qty !== undefined && row?.stock_qty !== null && row?.stock_qty !== '' ? String(row.stock_qty) : '',
      image_asset_id: String(row?.image_asset_id || '').trim(),
    }))
    .filter((row) => row.label || row.sku || row.price || row.stock_qty || row.image_asset_id);

  if (normalized.length > 0) return normalized;
  return fallbackSku
    ? [{ label: 'Default', sku: fallbackSku, price: '', stock_qty: '', image_asset_id: '' }]
    : [{ label: '', sku: '', price: '', stock_qty: '', image_asset_id: '' }];
}

function normalizeDetailPointRows(value: unknown): DetailPointRow[] {
  const parsed = Array.isArray(value) ? value : [];
  const normalized = parsed
    .map((entry: any) => ({
      text: String(entry?.text || '').trim(),
      depth: Math.max(0, Math.min(2, Number(entry?.depth || 0))),
    }))
    .filter((entry) => entry.text);

  return normalized.length > 0 ? normalized : [{ text: '', depth: 0 }];
}

function skuCount(product: any) {
  const specs = Array.isArray(product.specifications) ? product.specifications : [];
  return specs.length || (product.sku ? 1 : 0) || 0;
}

function galleryCount(product: any) {
  return Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids.length : 0;
}

function getMediaLabel(item: any): string {
  if (!item) return 'Media';
  const titleTag = Array.isArray(item.tags)
    ? item.tags.find((tag: string) => typeof tag === 'string' && tag.startsWith('title:'))
    : null;
  return titleTag ? titleTag.replace('title:', '') : item.category || item.r2_key.split('/').pop() || 'Media';
}

function getMediaImage(item: any): string {
  return item?.thumbnail_url || item?.public_url || placeholderImage;
}

function rememberMediaAssets(items: any[]) {
  for (const item of items || []) {
    if (item?.id) {
      knownMediaAssets.value[item.id] = item;
    }
  }
}

function findKnownMediaAsset(assetId: string) {
  if (!assetId) return null;
  return mediaAssets.value.find((asset) => asset.id === assetId) || knownMediaAssets.value[assetId] || null;
}

function resolveMediaLibraryParams() {
  if (mediaCategoryFilter.value === '') {
    return {
      search: mediaSearchQuery.value.trim() || undefined,
    };
  }

  if (mediaCategoryFilter.value === '__GENERAL__') {
    return {
      search: mediaSearchQuery.value.trim() || undefined,
      main_category_id: productForm.main_category_id || undefined,
      general: '1',
      category: 'general',
    };
  }

  return {
    search: mediaSearchQuery.value.trim() || undefined,
    main_category_id: productForm.main_category_id || undefined,
    brand_id: productForm.brand_id || undefined,
    brand_model_id: productForm.brand_model_id || undefined,
    product_type_id: productForm.product_type_id || undefined,
    category: selectedProductType.value?.slug || undefined,
  };
}

async function loadMediaAssetById(assetId: string) {
  if (!assetId || knownMediaAssets.value[assetId]) return;
  try {
    const response = await axios.get(`/api/admin/media/${assetId}`);
    if (response.data?.id) {
      rememberMediaAssets([response.data]);
    }
  } catch {
    // Ignore missing linked assets and keep the form usable.
  }
}

async function hydrateSelectedMediaAssets() {
  const assetIds = new Set<string>();

  if (productForm.cover_asset_id) assetIds.add(productForm.cover_asset_id);
  if (productForm.video_asset_id) assetIds.add(productForm.video_asset_id);
  for (const id of productForm.gallery_asset_ids) {
    if (id) assetIds.add(id);
  }
  for (const row of skuRows.value) {
    if (row.image_asset_id) assetIds.add(row.image_asset_id);
  }

  await Promise.all(Array.from(assetIds).map((id) => loadMediaAssetById(id)));
}

async function openProductModal(product?: any) {
  productFormError.value = '';
  if (product) {
    editingProduct.value = product;
    Object.assign(productForm, {
      seller_name: product.brand || '',
      main_category_id: product.main_category_id || '',
      brand_id: product.brand_id || '',
      brand_model_id: product.brand_model_id || '',
      product_type_id: product.product_type_id || '',
      title: product.title,
      description: product.description || '',
      price: product.price,
      original_price: product.original_price ?? '',
      currency: product.currency || 'BDT',
      rating: product.rating ?? '',
      review_count: product.review_count ?? 0,
      stock_qty: product.stock_qty ?? 0,
      sku: product.sku || '',
      source_url: product.source_url || '',
      product_url: product.product_url || '',
      external_id: product.external_id || '',
      vendor_id: product.vendor_id || '',
      vendor_name: product.vendor_name || '',
      shop_url: product.shop_url || '',
      weight_kg: product.weight_kg ?? '',
      minimum_order_qty: product.minimum_order_qty ?? 1,
      status: product.status || 'published',
      cover_asset_id: product.cover_asset_id || '',
      gallery_asset_ids: Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids.filter(Boolean) : [],
      video_asset_id: product.video_asset_id || '',
    });
    skuRows.value = normalizeSkuRows(product.specifications, product.sku || '');
    detailPointRows.value = normalizeDetailPointRows(product.dimensions?.detailPoints);
  } else {
    editingProduct.value = null;
    resetProductForm();
  }

  mediaSearchQuery.value = '';
  mediaCategoryFilter.value = '__AUTO__';
  await hydrateSelectedMediaAssets();
  await refreshMediaAssets();
  showProductModal.value = true;
}

function onProductMediaPick(event: Event) {
  productFormError.value = '';
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
  const oversizedVideo = files.find((file) => file.type.startsWith('video/') && file.size > 5 * 1024 * 1024);
  if (oversizedVideo) {
    toast.error(`${oversizedVideo.name} is larger than 5MB`);
    productMediaFiles.value = files.filter((file) => file !== oversizedVideo);
    return;
  }
  productMediaFiles.value = files;
}

async function loadTaxonomy() {
  const response = await axios.get('/api/admin/taxonomy');
  taxonomy.mainCategories = response.data?.mainCategories || [];
  taxonomy.brands = response.data?.brands || [];
  taxonomy.productTypes = response.data?.productTypes || [];
  if (!productForm.main_category_id && taxonomy.mainCategories[0]) productForm.main_category_id = taxonomy.mainCategories[0].id;
  if (!brandForm.main_category_id && taxonomy.mainCategories[0]) brandForm.main_category_id = taxonomy.mainCategories[0].id;
  if (!productTypeForm.main_category_id && taxonomy.mainCategories[0]) productTypeForm.main_category_id = taxonomy.mainCategories[0].id;
  if (!brandModelForm.brand_id && taxonomy.brands[0]) brandModelForm.brand_id = taxonomy.brands[0].id;
}

async function loadMediaAssets() {
  mediaLoading.value = true;
  try {
    const response = await axios.get('/api/admin/media', {
      params: {
        page: 1,
        limit: 48,
        ...resolveMediaLibraryParams(),
      },
    });
    mediaAssets.value = response.data?.media || [];
    rememberMediaAssets(mediaAssets.value);
    mediaLoadedOnce.value = true;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load media assets');
  } finally {
    mediaLoading.value = false;
  }
}

async function refreshMediaAssets() {
  await loadMediaAssets();
  await hydrateSelectedMediaAssets();
}

async function uploadProductMedia() {
  if (productMediaFiles.value.length === 0) return;
  productMediaUploading.value = true;
  try {
    for (const file of productMediaFiles.value) {
      const formData = new FormData();
      formData.append('file', file);
      if (!productForm.main_category_id) {
        throw new Error('Select a main category before uploading media');
      }
      formData.append('main_category_id', productForm.main_category_id);
      if (mediaCategoryFilter.value === '__GENERAL__') {
        formData.append('product_type_id', '__GENERAL__');
        formData.append('category', 'general');
      } else {
        if (!productForm.product_type_id) {
          throw new Error('Select a product type before uploading media');
        }
        formData.append('product_type_id', productForm.product_type_id);
        if (selectedProductType.value?.slug) {
          formData.append('category', selectedProductType.value.slug);
        }
        if (productForm.brand_id) {
          formData.append('brand_id', productForm.brand_id);
        }
        if (productForm.brand_model_id) {
          formData.append('brand_model_id', productForm.brand_model_id);
        }
      }
      formData.append('title', file.name.replace(/\.[^.]+$/, ''));
      await axios.post('/api/admin/media/upload', formData);
    }
    toast.success(`Uploaded ${productMediaFiles.value.length} media file(s)`);
    productMediaFiles.value = [];
    if (productMediaInput.value) {
      productMediaInput.value.value = '';
    }
    await refreshMediaAssets();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to upload media');
  } finally {
    productMediaUploading.value = false;
  }
}

async function loadProducts() {
  loadingProducts.value = true;
  try {
    const response = await axios.get('/api/admin/products', {
      params: {
        page: productPage.value,
        limit: productLimit.value,
        search: productSearch.value || undefined,
        main_category_id: productCategoryFilter.value || undefined,
        status: productStatusFilter.value || undefined,
      },
    });
    productRows.value = response.data?.products || [];
    productTotal.value = response.data?.total || 0;
    productTotalPages.value = response.data?.totalPages || 1;
    productPage.value = response.data?.page || productPage.value;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load shopping products');
  } finally {
    loadingProducts.value = false;
  }
}

async function loadAll() {
  loadingProducts.value = true;
  try {
    await loadTaxonomy();
    await loadProducts();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load shopping management data');
  } finally {
    loadingProducts.value = false;
  }
}

function setCoverAsset(assetId: string) {
  productForm.cover_asset_id = assetId;
}

function setVideoAsset(assetId: string) {
  productForm.video_asset_id = assetId;
}

function isVideoAsset(asset: any) {
  return String(asset?.mime_type || '').startsWith('video/');
}

function toggleGalleryAsset(assetId: string) {
  const index = productForm.gallery_asset_ids.indexOf(assetId);
  if (index > -1) {
    productForm.gallery_asset_ids.splice(index, 1);
  } else {
    productForm.gallery_asset_ids.push(assetId);
  }
}

function addSkuRow() {
  skuRows.value.push({ label: '', sku: '', price: '', stock_qty: '', image_asset_id: '' });
}

function removeSkuRow(index: number) {
  if (skuRows.value.length === 1) {
    skuRows.value[0] = { label: '', sku: '', price: '', stock_qty: '', image_asset_id: '' };
    return;
  }
  skuRows.value.splice(index, 1);
}

function addDetailPointRow() {
  detailPointRows.value.push({ text: '', depth: 0 });
}

function removeDetailPointRow(index: number) {
  if (detailPointRows.value.length === 1) {
    detailPointRows.value[0] = { text: '', depth: 0 };
    return;
  }
  detailPointRows.value.splice(index, 1);
}

async function openSkuImagePicker(index: number) {
  activeSkuRowIndex.value = index;
  if (!mediaLoadedOnce.value && !mediaLoading.value) {
    await refreshMediaAssets();
  }
  showSkuImagePicker.value = true;
}

function assignSkuImage(assetId: string) {
  if (activeSkuRowIndex.value === null) return;
  skuRows.value[activeSkuRowIndex.value].image_asset_id = assetId;
  showSkuImagePicker.value = false;
}

function buildSpecifications() {
  return skuRows.value
    .map((row) => ({
      label: row.label.trim(),
      sku: row.sku.trim(),
      price: row.price === '' ? null : Number(row.price),
      stock_qty: row.stock_qty === '' ? null : Number(row.stock_qty),
      image_asset_id: row.image_asset_id || null,
    }))
    .filter((row) => row.label || row.sku || row.price !== null || row.stock_qty !== null || row.image_asset_id);
}

function buildDetailPoints() {
  return detailPointRows.value
    .map((row) => ({
      text: String(row.text || '').trim(),
      depth: Math.max(0, Math.min(2, Number(row.depth || 0))),
    }))
    .filter((row) => row.text);
}

async function saveProduct() {
  productFormError.value = '';
  if (!productForm.main_category_id) {
    productFormError.value = 'Please select a main category.';
    toast.error(productFormError.value);
    return;
  }

  saving.value = true;
  try {
    const payload = {
      seller_name: productForm.seller_name || undefined,
      main_category_id: productForm.main_category_id || undefined,
      brand_id: productForm.brand_id || undefined,
      brand_model_id: productForm.brand_model_id || undefined,
      product_type_id: productForm.product_type_id || undefined,
      title: productForm.title,
      description: productForm.description || undefined,
      price: Number(productForm.price),
      original_price: productForm.original_price !== undefined && productForm.original_price !== null && productForm.original_price !== '' ? Number(productForm.original_price) : undefined,
      currency: productForm.currency,
      rating: productForm.rating !== undefined && productForm.rating !== null && productForm.rating !== '' ? Number(productForm.rating) : undefined,
      review_count: Number(productForm.review_count || 0),
      stock_qty: Number(productForm.stock_qty || 0),
      sku: productForm.sku || undefined,
      source_url: productForm.source_url || undefined,
      product_url: productForm.product_url || productForm.source_url || undefined,
      external_id: productForm.external_id || undefined,
      vendor_id: productForm.vendor_id || undefined,
      vendor_name: productForm.vendor_name || productForm.seller_name || undefined,
      shop_url: productForm.shop_url || undefined,
      weight_kg: productForm.weight_kg !== undefined && productForm.weight_kg !== null && productForm.weight_kg !== '' ? Number(productForm.weight_kg) : undefined,
      minimum_order_qty: Number(productForm.minimum_order_qty || 1),
      status: productForm.status,
      cover_asset_id: productForm.cover_asset_id || undefined,
      gallery_asset_ids: productForm.gallery_asset_ids,
      video_asset_id: productForm.video_asset_id || undefined,
      detail_points: buildDetailPoints(),
      specifications: buildSpecifications(),
    };

    if (editingProduct.value) {
      await axios.patch(`/api/admin/products/${editingProduct.value.id}`, payload, {
        suppressGlobalErrorToast: true,
      } as any);
      toast.success('Product updated');
    } else {
      await axios.post('/api/admin/products', payload, {
        suppressGlobalErrorToast: true,
      } as any);
      toast.success('Product created');
    }

    showProductModal.value = false;
    editingProduct.value = null;
    await loadProducts();
  } catch (error: any) {
    productFormError.value = extractRequestError(error, 'Failed to save product.');
    toast.error(productFormError.value);
  } finally {
    saving.value = false;
  }
}

async function saveMainCategory() {
  clearTaxonomyFeedback();
  saving.value = true;
  try {
    await axios.post('/api/admin/taxonomy/main-categories', mainCategoryForm, {
      suppressGlobalErrorToast: true,
    } as any);
    toast.success('Main category saved');
    Object.assign(mainCategoryForm, { name: '', slug: '', sort_order: 0, requires_brand_model: false });
    await loadTaxonomy();
  } catch (error: any) {
    taxonomyFeedback.mainCategory = extractRequestError(error, 'Failed to save main category.');
    toast.error(taxonomyFeedback.mainCategory);
  } finally {
    saving.value = false;
  }
}

function startBrandEdit(brand: any) {
  clearTaxonomyFeedback();
  editingBrandId.value = brand.id;
  Object.assign(brandEditForm, {
    name: brand.name || '',
    slug: brand.slug || '',
    main_category_id: Array.isArray(brand.categoryLinks) ? brand.categoryLinks[0]?.main_category_id || '' : '',
    sort_order: Number(brand.sort_order || 0),
  });
}

function cancelBrandEdit() {
  editingBrandId.value = '';
  taxonomyFeedback.brandEdit = '';
  Object.assign(brandEditForm, { name: '', slug: '', main_category_id: '', sort_order: 0 });
}

async function saveBrand() {
  clearTaxonomyFeedback();
  saving.value = true;
  try {
    await axios.post('/api/admin/taxonomy/brands', {
      name: brandForm.name,
      slug: brandForm.slug || undefined,
      sort_order: Number(brandForm.sort_order || 0),
      main_category_ids: brandForm.main_category_id ? [brandForm.main_category_id] : [],
    }, {
      suppressGlobalErrorToast: true,
    } as any);
    toast.success('Brand saved');
    Object.assign(brandForm, { name: '', slug: '', main_category_id: taxonomy.mainCategories[0]?.id || '', sort_order: 0 });
    await loadTaxonomy();
  } catch (error: any) {
    taxonomyFeedback.brand = extractRequestError(error, 'Failed to save brand.');
    toast.error(taxonomyFeedback.brand);
  } finally {
    saving.value = false;
  }
}

async function updateBrand(brand: any) {
  taxonomyFeedback.brandEdit = '';
  if (!brandEditForm.name.trim()) {
    taxonomyFeedback.brandEdit = 'Brand name is required.';
    toast.error(taxonomyFeedback.brandEdit);
    return;
  }
  saving.value = true;
  try {
    await axios.patch(`/api/admin/taxonomy/brands/${brand.id}`, {
      name: brandEditForm.name,
      slug: brandEditForm.slug || undefined,
      sort_order: Number(brandEditForm.sort_order || 0),
      main_category_ids: brandEditForm.main_category_id ? [brandEditForm.main_category_id] : [],
    }, {
      suppressGlobalErrorToast: true,
    } as any);
    toast.success('Brand updated');
    cancelBrandEdit();
    await loadTaxonomy();
  } catch (error: any) {
    taxonomyFeedback.brandEdit = extractRequestError(error, 'Failed to update brand.');
    toast.error(taxonomyFeedback.brandEdit);
  } finally {
    saving.value = false;
  }
}

async function saveBrandModel() {
  clearTaxonomyFeedback();
  if (!brandModelForm.brand_id) {
    taxonomyFeedback.brandModel = 'Select a brand.';
    toast.error(taxonomyFeedback.brandModel);
    return;
  }
  saving.value = true;
  try {
    await axios.post('/api/admin/taxonomy/brand-models', brandModelForm, {
      suppressGlobalErrorToast: true,
    } as any);
    toast.success('Model saved');
    Object.assign(brandModelForm, { brand_id: brandModelForm.brand_id, name: '', slug: '', sort_order: 0 });
    await loadTaxonomy();
  } catch (error: any) {
    taxonomyFeedback.brandModel = extractRequestError(error, 'Failed to save model.');
    toast.error(taxonomyFeedback.brandModel);
  } finally {
    saving.value = false;
  }
}

async function saveProductType() {
  clearTaxonomyFeedback();
  if (!productTypeForm.main_category_id) {
    taxonomyFeedback.productType = 'Select a main category.';
    toast.error(taxonomyFeedback.productType);
    return;
  }
  saving.value = true;
  try {
    await axios.post('/api/admin/taxonomy/product-types', productTypeForm, {
      suppressGlobalErrorToast: true,
    } as any);
    toast.success('Product type saved');
    Object.assign(productTypeForm, { main_category_id: productTypeForm.main_category_id, name: '', slug: '', sort_order: 0 });
    await loadTaxonomy();
  } catch (error: any) {
    taxonomyFeedback.productType = extractRequestError(error, 'Failed to save product type.');
    toast.error(taxonomyFeedback.productType);
  } finally {
    saving.value = false;
  }
}

function startBrandModelEdit(model: any, brand?: any) {
  clearTaxonomyFeedback();
  editingBrandModelId.value = brand?.id || model.brand_id || '';
  Object.assign(brandModelEditForm, {
    id: model.id || '',
    brand_id: model.brand_id || brand?.id || '',
    name: model.name || '',
    slug: model.slug || '',
    sort_order: Number(model.sort_order || 0),
  });
}

function cancelBrandModelEdit() {
  editingBrandModelId.value = '';
  taxonomyFeedback.brandModelEdit = '';
  Object.assign(brandModelEditForm, {
    id: '',
    brand_id: '',
    name: '',
    slug: '',
    sort_order: 0,
  });
}

async function updateBrandModel() {
  taxonomyFeedback.brandModelEdit = '';
  if (!brandModelEditForm.id) {
    taxonomyFeedback.brandModelEdit = 'Model record not found.';
    toast.error(taxonomyFeedback.brandModelEdit);
    return;
  }
  if (!brandModelEditForm.brand_id) {
    taxonomyFeedback.brandModelEdit = 'Select a brand.';
    toast.error(taxonomyFeedback.brandModelEdit);
    return;
  }
  if (!brandModelEditForm.name.trim()) {
    taxonomyFeedback.brandModelEdit = 'Model name is required.';
    toast.error(taxonomyFeedback.brandModelEdit);
    return;
  }
  saving.value = true;
  try {
    await axios.patch(`/api/admin/taxonomy/brand-models/${brandModelEditForm.id}`, {
      brand_id: brandModelEditForm.brand_id,
      name: brandModelEditForm.name,
      slug: brandModelEditForm.slug || undefined,
      sort_order: Number(brandModelEditForm.sort_order || 0),
    }, {
      suppressGlobalErrorToast: true,
    } as any);
    toast.success('Model updated');
    cancelBrandModelEdit();
    await loadTaxonomy();
  } catch (error: any) {
    taxonomyFeedback.brandModelEdit = extractRequestError(error, 'Failed to update model.');
    toast.error(taxonomyFeedback.brandModelEdit);
  } finally {
    saving.value = false;
  }
}

function deleteBrandModelByEdit() {
  if (!brandModelEditForm.id) return;
  const model = { id: brandModelEditForm.id, name: brandModelEditForm.name };
  deleteBrandModel(model);
  cancelBrandModelEdit();
}

function startProductTypeEdit(type: any) {
  clearTaxonomyFeedback();
  editingProductTypeId.value = type.id;
  Object.assign(productTypeEditForm, {
    main_category_id: type.main_category_id || '',
    name: type.name || '',
    slug: type.slug || '',
    sort_order: Number(type.sort_order || 0),
  });
}

function cancelProductTypeEdit() {
  editingProductTypeId.value = '';
  taxonomyFeedback.productTypeEdit = '';
  Object.assign(productTypeEditForm, { main_category_id: '', name: '', slug: '', sort_order: 0 });
}

async function updateProductType(type: any) {
  taxonomyFeedback.productTypeEdit = '';
  if (!productTypeEditForm.main_category_id) {
    taxonomyFeedback.productTypeEdit = 'Select a main category.';
    toast.error(taxonomyFeedback.productTypeEdit);
    return;
  }
  if (!productTypeEditForm.name.trim()) {
    taxonomyFeedback.productTypeEdit = 'Product type name is required.';
    toast.error(taxonomyFeedback.productTypeEdit);
    return;
  }
  saving.value = true;
  try {
    await axios.patch(`/api/admin/taxonomy/product-types/${type.id}`, {
      main_category_id: productTypeEditForm.main_category_id,
      name: productTypeEditForm.name,
      slug: productTypeEditForm.slug || undefined,
      sort_order: Number(productTypeEditForm.sort_order || 0),
    }, {
      suppressGlobalErrorToast: true,
    } as any);
    toast.success('Product type updated');
    cancelProductTypeEdit();
    await loadTaxonomy();
  } catch (error: any) {
    taxonomyFeedback.productTypeEdit = extractRequestError(error, 'Failed to update product type.');
    toast.error(taxonomyFeedback.productTypeEdit);
  } finally {
    saving.value = false;
  }
}

function deleteMainCategory(item: any) {
  deleteConfirmTitle.value = 'Delete main category';
  deleteConfirmMessage.value = `Delete "${item.name}"? This also removes its brand links and product types only if no products are linked. If products use it, deletion will be blocked and you must move those products first.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/taxonomy/main-categories/${item.id}`);
    toast.success('Main category deleted');
    await loadTaxonomy();
  };
  deleteConfirmOpen.value = true;
}

function deleteBrand(brand: any) {
  deleteConfirmTitle.value = 'Delete brand';
  deleteConfirmMessage.value = `Delete "${brand.name}" and its model list? If any products use this brand or one of its models, deletion will be blocked until you move those products.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/taxonomy/brands/${brand.id}`);
    toast.success('Brand deleted');
    await loadTaxonomy();
  };
  deleteConfirmOpen.value = true;
}

function deleteBrandModel(model: any, brand?: any) {
  deleteConfirmTitle.value = 'Delete model';
  deleteConfirmMessage.value = `Delete "${model.name}"${brand?.name ? ` from ${brand.name}` : ''}? If products use this model, deletion will be blocked until you move those products.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/taxonomy/brand-models/${model.id}`);
    toast.success('Model deleted');
    await loadTaxonomy();
  };
  deleteConfirmOpen.value = true;
}

function deleteProductType(type: any) {
  deleteConfirmTitle.value = 'Delete product type';
  deleteConfirmMessage.value = `Delete "${type.name}"? If products use this product type, deletion will be blocked until you move those products.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/taxonomy/product-types/${type.id}`);
    toast.success('Product type deleted');
    await loadTaxonomy();
  };
  deleteConfirmOpen.value = true;
}

async function deleteProduct(id: string) {
  deleteConfirmTitle.value = 'Delete product';
  deleteConfirmMessage.value = 'Delete this product? This action cannot be undone.';
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/products/${id}`);
    toast.success('Product deleted');
    await loadProducts();
  };
  deleteConfirmOpen.value = true;
}

async function confirmDeleteAction() {
  if (!deleteAction.value) return;
  try {
    await deleteAction.value();
    deleteConfirmOpen.value = false;
    deleteAction.value = null;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete item');
  }
}

function handleProductPageChange(nextPage: number) {
  productPage.value = nextPage;
  loadProducts();
}

function resetProductFilters() {
  productSearch.value = '';
  productCategoryFilter.value = '';
  productStatusFilter.value = '';
  productPage.value = 1;
  loadProducts();
}

let filterTimer: number | null = null;
watch([productSearch, productCategoryFilter, productStatusFilter], () => {
  productPage.value = 1;
  if (filterTimer) window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => {
    loadProducts();
  }, 200);
});

watch(() => productForm.main_category_id, () => {
  if (productForm.brand_id && !filteredBrands.value.some((brand) => brand.id === productForm.brand_id)) {
    productForm.brand_id = '';
  }
  productForm.brand_model_id = '';
  if (productForm.product_type_id && !filteredProductTypeOptions.value.some((type) => type.value === productForm.product_type_id)) {
    productForm.product_type_id = '';
  }
  if (mediaCategoryFilter.value === '__AUTO__' && showProductModal.value) {
    void refreshMediaAssets();
  }
});

watch(() => productForm.brand_id, () => {
  if (productForm.brand_model_id && !filteredBrandModelOptions.value.some((model) => model.value === productForm.brand_model_id)) {
    productForm.brand_model_id = '';
  }
});

watch(showSkuImagePicker, (isOpen) => {
  if (!isOpen) {
    activeSkuRowIndex.value = null;
  }
});

onMounted(loadAll);
</script>



