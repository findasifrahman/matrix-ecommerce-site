<template>
  <div class="min-h-screen bg-[#eef3f9] text-slate-700">
    <main class="mx-auto w-full max-w-[1880px] px-2 py-3 sm:px-4 lg:px-6">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4" />
        Back
      </button>

      <div v-if="loading" class="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1.02fr)_560px_300px]">
        <div class="h-[760px] animate-pulse rounded-[32px] bg-slate-100" />
        <div class="space-y-4">
          <div class="h-[540px] animate-pulse rounded-[32px] bg-slate-100" />
          <div class="h-56 animate-pulse rounded-[32px] bg-slate-100" />
        </div>
        <div class="h-[720px] animate-pulse rounded-[32px] bg-slate-100" />
      </div>

      <template v-else-if="product">
        <section class="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1.02fr)_560px_300px]">
          <div class="space-y-4">
            <section class="rounded-[32px] border border-slate-200 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.06)] sm:p-5">
              <div class="grid gap-4 xl:grid-cols-[110px_minmax(0,1fr)]">
                <div
                  v-if="galleryItems.length > 1"
                  class="order-2 flex gap-3 overflow-auto pb-1 xl:order-1 xl:max-h-[760px] xl:flex-col xl:overflow-y-auto xl:overflow-x-hidden"
                >
                  <button
                    v-for="image in galleryItems"
                    :key="image.key"
                    type="button"
                    class="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[24px] border bg-slate-50 transition sm:h-[96px] sm:w-[96px]"
                    :class="activeImage === image.src ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200 hover:border-teal-300'"
                    @click="activeImage = image.src"
                  >
                    <video
                      v-if="image.type === 'video'"
                      :src="image.src"
                      :poster="image.thumb || image.poster"
                      class="h-full w-full object-cover"
                      muted
                      playsinline
                      preload="metadata"
                    />
                    <img v-else :src="image.thumb || image.src" :alt="product.title" class="h-full w-full object-cover" />
                  </button>
                </div>

                <div class="order-1 overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,#fdfefe,#edf3f8)] xl:order-2">
                  <div class="relative flex h-[420px] items-center justify-center overflow-hidden sm:h-[540px] lg:h-[680px] 2xl:h-[760px]">
                    <button
                      v-if="galleryItems.length > 1"
                      type="button"
                      class="absolute left-5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition hover:bg-white"
                      @click="showPreviousImage"
                    >
                      <ChevronLeft class="h-5 w-5" />
                    </button>
                    <video
                      v-if="activeMedia?.type === 'video'"
                      :src="activeMedia.src"
                      :poster="activeMedia.thumb || activeMedia.poster"
                      class="h-full w-full bg-slate-950 object-cover"
                      autoplay
                      muted
                      playsinline
                      controls
                      preload="metadata"
                      @click="openLightbox()"
                    />
                    <img
                      v-else-if="activeImage"
                      :src="activeImage"
                      :alt="product.title"
                      class="h-full w-full cursor-zoom-in object-cover"
                      @click="openLightbox()"
                    />
                    <button
                      v-if="galleryItems.length > 1"
                      type="button"
                      class="absolute right-5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition hover:bg-white"
                      @click="showNextImage"
                    >
                      <ChevronRight class="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      class="absolute bottom-5 right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition hover:bg-white"
                      @click="openLightbox()"
                    >
                      <ZoomIn class="h-4 w-4" />
                    </button>
                    <div v-if="!activeMedia" class="flex h-full w-full items-center justify-center text-slate-400">
                      <Package class="h-14 w-14" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            
            <section class="rounded-[28px] border border-slate-200 bg-[linear-gradient(90deg,#effdf7,#fff7e5)] p-5 shadow-[0_16px_38px_rgba(15,23,42,0.04)]">
              <div class="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-800">
                <Truck class="h-4 w-4 text-teal-600" />
                Shipping & Delivery
              </div>
              <div class="mt-4 grid gap-3 md:grid-cols-2">
                <div class="rounded-full bg-white/85 px-4 py-3 text-sm text-slate-700">
                  <span class="font-semibold text-slate-900">Ship from:</span>
                  Dhaka, Bangladesh
                </div>
                <div class="rounded-full bg-white/85 px-4 py-3 text-sm text-slate-700">
                  Shipped from Pathao, Redex courier
                </div>
              </div>
            </section>
          
          </div>

          <aside class="space-y-4 self-start 2xl:sticky 2xl:top-4">
            <section class="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
              <div>
                <h1 class="text-[30px] font-black leading-[1.08] tracking-tight text-slate-950 sm:text-[34px]">
                  {{ product.title }}
                </h1>
                <p class="mt-3 text-xs text-slate-500">
                  Seller: <span class="font-semibold text-slate-700">{{ product.sellerName }}</span>
                </p>
              </div>

              <!--
              <div class="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.34em] text-slate-400">Shop</p>
                    <div class="mt-2 text-lg font-black text-slate-950">{{ product.vendorName || product.sellerName }}</div>
                    <p class="mt-1 text-xs text-slate-500">Tap to browse more items from this seller.</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
                    @click="openSellerBrowse"
                  >
                    View shop
                  </button>
                </div>
              </div>
            -->

              <div class="mt-5 border-t border-slate-200 pt-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.34em] text-slate-400">Price</p>
                    <div class="mt-2 text-[28px] font-black text-teal-700">
                      {{ displayPrice }}
                    </div>
                    <div v-if="compareAtPrice" class="mt-2 flex flex-wrap items-center gap-2">
                      <span class="text-sm font-semibold text-slate-400 line-through">
                        {{ formatMoney(compareAtPrice) }}
                      </span>
                      <span v-if="savePercent > 0" class="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                        Save {{ savePercent }}%
                      </span>
                    </div>
                  </div>
                  <div class="rounded-full border border-slate-200 bg-white p-1">
                    <span class="inline-flex rounded-full bg-teal-600 px-4 py-2 text-xs font-black text-white">BDT</span>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <div class="flex items-center gap-1 text-amber-500">
                    <Star
                      v-for="index in 5"
                      :key="index"
                      class="h-4 w-4"
                      :fill="index <= roundedRating ? 'currentColor' : 'none'"
                    />
                  </div>
                  <div class="text-sm font-semibold text-slate-900">{{ ratingDisplay }}</div>
                  <div class="text-sm text-slate-500">{{ reviewText }}</div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <span class="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                    {{ stockBadgeLabel }}
                  </span>
                  <span class="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                    MOQ {{ minimumOrderQty }}
                  </span>
                  <span v-if="selectedSkuCode || product.raw?.sku" class="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                    SKU {{ selectedSkuCode || product.raw?.sku }}
                  </span>
                </div>

                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div class="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span class="font-semibold text-slate-900">Weight:</span>
                    {{ product.weight_kg ? `${product.weight_kg} kg` : 'Not set' }}
                  </div>
                  <div class="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span class="font-semibold text-slate-900">Available:</span>
                    {{ stockShortText }}
                  </div>
                </div>
              </div>

              <div v-if="skuOptions.length > 0" class="mt-5 rounded-[26px] border border-slate-200 bg-white p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <Layers3 class="h-4 w-4 text-slate-500" />
                    <div class="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Variants</div>
                  </div>
                  <div class="text-xs text-slate-400">Pick color, model, quantity</div>
                </div>

                <div class="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  <button
                    v-for="(sku, index) in skuOptions"
                    :key="`${sku.label}-${sku.sku}-${index}`"
                    type="button"
                    class="w-full rounded-[22px] border p-3 text-left transition"
                    :class="selectedSkuIndex === index ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100' : 'border-slate-200 hover:border-teal-300'"
                    @click="selectSku(index)"
                  >
                    <div class="flex items-center gap-3">
                      <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <img
                          :src="sku.thumbnailUrl || sku.imageUrl || activeImage || placeholderImage"
                          :alt="sku.label"
                          class="h-full w-full object-cover"
                        />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="line-clamp-2 text-sm font-semibold text-slate-900">{{ sku.label || `Option ${index + 1}` }}</div>
                        <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span v-if="sku.price !== null">{{ formatMoney(sku.price) }}</span>
                          <span>{{ sku.stockQty !== null ? `Stock ${sku.stockQty}` : 'Stock not set' }}</span>
                          <span v-if="sku.sku">SKU {{ sku.sku }}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div class="mt-5 grid grid-cols-[58px_minmax(110px,1fr)_58px] items-center gap-2">
                <button
                  type="button"
                  class="flex h-12 items-center justify-center rounded-2xl border border-rose-200 text-xl font-bold text-rose-300 transition hover:border-rose-300 hover:text-rose-400"
                  @click="decreaseQuantity"
                >
                  -
                </button>
                <input
                  v-model.number="quantity"
                  type="number"
                  min="1"
                  class="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-semibold text-slate-900 outline-none"
                />
                <button
                  type="button"
                  class="flex h-12 items-center justify-center rounded-2xl border border-teal-200 text-xl font-bold text-teal-500 transition hover:border-teal-300 hover:text-teal-600"
                  @click="increaseQuantity"
                >
                  +
                </button>
              </div>

              <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="flex items-center justify-between gap-3 text-sm">
                  <span class="font-semibold text-slate-600">Total price</span>
                  <span class="text-lg font-black text-teal-700">{{ quantityTotalPrice }}</span>
                </div>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <Button variant="primary" class="h-12 !rounded-2xl" @click="buyNow">
                  Buy now
                </Button>
                <Button variant="accent" class="h-12 !rounded-2xl" @click="addCurrentToCart">
                  Add to cart
                </Button>
              </div>

              <p class="mt-3 text-center text-[11px] text-slate-400">
                Payment -> order confirm -> local dispatch -> doorstep delivery
              </p>

            </section>
          </aside>

          <aside class="hidden self-start space-y-4 2xl:block">
            <section class="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Suggestions</p>
                  <h2 class="mt-1 text-lg font-black tracking-tight text-slate-950">More from this catalog</h2>
                </div>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-teal-300 hover:text-teal-600"
                  @click="loadRelatedProducts"
                >
                  <RefreshCcw class="h-4 w-4" />
                </button>
              </div>

              <div v-if="relatedProducts.length > 0" class="mt-4 space-y-3">
                <button
                  v-for="item in relatedProducts.slice(0, 6)"
                  :key="`rail-${item.externalId}`"
                  type="button"
                  class="flex w-full items-start gap-3 rounded-[22px] border border-slate-200 p-3 text-left transition hover:border-teal-300"
                  @click="openProduct(item)"
                >
                  <img :src="item.imageUrl || item.images?.[0] || placeholderImage" :alt="item.title" class="h-16 w-16 rounded-2xl object-cover" />
                  <div class="min-w-0 flex-1">
                    <div class="line-clamp-2 text-sm font-semibold text-slate-900">{{ item.title }}</div>
                    <div class="mt-1 text-xs text-slate-500">{{ item.totalSold ? `${item.totalSold} sold` : 'Local catalog item' }}</div>
                    <div class="mt-1 text-sm font-bold text-teal-700">{{ formatMoney(item.priceMin || 0) }}</div>
                  </div>
                </button>
              </div>
              <div v-else class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No related products yet.
              </div>
            </section>
          </aside>
        </section>

        <section class="mt-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
          <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            <button
              v-for="tab in detailTabs"
              :key="tab.value"
              type="button"
              class="rounded-full px-4 py-2 text-sm font-semibold transition"
              :class="activeDetailTab === tab.value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
              @click="activeDetailTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-if="activeDetailTab === 'overview'" class="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
            <div class="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Description</div>
              <div class="mt-3 text-sm leading-8 text-slate-700">
                {{ product.description || 'No description was provided for this product yet.' }}
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">SKU</div>
                <div class="mt-1 text-sm font-semibold text-slate-900">{{ selectedSkuCode || product.raw?.sku || 'Not set' }}</div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Availability</div>
                <div class="mt-1 text-sm font-semibold text-slate-900">{{ stockLabel }}</div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Weight</div>
                <div class="mt-1 text-sm font-semibold text-slate-900">{{ product.weight_kg ? `${product.weight_kg} kg` : 'Not set' }}</div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Minimum order</div>
                <div class="mt-1 text-sm font-semibold text-slate-900">{{ minimumOrderQty }}</div>
              </div>
            </div>
          </div>

          <section v-if="activeDetailTab === 'overview' && relatedProducts.length > 0" class="mt-6 2xl:hidden">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Same category</p>
                <h2 class="mt-1 text-lg font-black tracking-tight text-slate-950">More from this catalog</h2>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-teal-300 hover:text-teal-600"
                @click="loadRelatedProducts"
              >
                <RefreshCcw class="h-4 w-4" />
              </button>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <ProductCard
                v-for="item in relatedProducts.slice(0, 6)"
                :key="`mobile-related-${item.externalId}`"
                :product="item"
                @click="openProduct"
                @request-buy="addSuggestedToCart"
              />
            </div>
          </section>

          <section v-if="activeDetailTab === 'overview' && recommendationProducts.length > 0" class="mt-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Recommended</p>
                <h2 class="mt-1 text-lg font-black tracking-tight text-slate-950">Picked for you</h2>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-600 px-4 py-2 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,118,110,0.2)] transition hover:bg-teal-700"
                @click="openBrowse"
              >
                <span>Browse more</span>
                <ArrowRight class="h-4 w-4" />
              </button>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
              <ProductCard
                v-for="item in recommendationProducts.slice(0, 6)"
                :key="`engine-${item.externalId}`"
                :product="item"
                @click="openProduct"
                @request-buy="addSuggestedToCart"
              />
            </div>
          </section>

          <div v-if="activeDetailTab === 'specification'" class="mt-5">
            <div v-if="detailPoints.length > 0" class="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div
                v-for="(point, index) in detailPoints"
                :key="`point-${index}`"
                class="flex items-start gap-3 text-sm text-slate-700"
                :style="{ paddingLeft: `${point.depth * 24}px` }"
              >
                <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500" />
                <span class="leading-7">{{ point.text }}</span>
              </div>
            </div>
            <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No bullet specifications were added yet.
            </div>
          </div>

          <div v-if="activeDetailTab === 'variants'" class="mt-5">
            <div v-if="specificationRows.length > 0" class="grid gap-3 lg:grid-cols-2">
              <div
                v-for="(spec, index) in specificationRows"
                :key="`${spec.label}-${index}`"
                class="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div class="flex items-center gap-3">
                  <div v-if="spec.thumbnailUrl || spec.imageUrl" class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img :src="spec.thumbnailUrl || spec.imageUrl" :alt="spec.label" class="h-full w-full object-cover" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-semibold text-slate-900">{{ spec.label }}</div>
                    <div v-if="spec.sku" class="mt-1 text-xs text-slate-500">SKU: {{ spec.sku }}</div>
                    <div v-if="spec.stockQty !== null" class="mt-1 text-xs text-slate-500">Stock: {{ spec.stockQty }}</div>
                  </div>
                  <div v-if="spec.price !== null" class="text-sm font-bold text-teal-700">{{ formatMoney(spec.price) }}</div>
                </div>
              </div>
            </div>
            <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No separate specification rows were added for this product.
            </div>
          </div>

          <div v-if="activeDetailTab === 'seller'" class="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div class="grid gap-3">
              <div class="grid gap-3 border-b border-slate-200 pb-3 md:grid-cols-[180px_1fr]">
                <div class="text-sm font-semibold text-slate-500">Seller</div>
                <div class="text-sm font-semibold text-slate-900">{{ product.sellerName }}</div>
              </div>
              <div class="grid gap-3 border-b border-slate-200 pb-3 md:grid-cols-[180px_1fr]">
                <div class="text-sm font-semibold text-slate-500">Vendor ID</div>
                <div class="text-sm font-semibold text-slate-900">{{ product.vendorId || product.raw?.vendor_id || 'Not set' }}</div>
              </div>
              <div class="grid gap-3 border-b border-slate-200 pb-3 md:grid-cols-[180px_1fr]">
                <div class="text-sm font-semibold text-slate-500">Shop URL</div>
                <div class="break-all text-sm font-semibold text-slate-900">{{ product.shopUrl || product.raw?.shop_url || 'Not set' }}</div>
              </div>
              <div class="grid gap-3 md:grid-cols-[180px_1fr]">
                <div class="text-sm font-semibold text-slate-500">Source URL</div>
                <div class="break-all text-sm font-semibold text-slate-900">{{ product.sourceUrl || product.productUrl || 'Not set' }}</div>
              </div>
            </div>
          </div>
        </section>

        <div
          v-if="lightboxOpen"
          class="fixed inset-0 z-[120] flex items-center justify-center bg-black p-4"
          @click="closeLightbox"
        >
          <button
            type="button"
            class="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            @click.stop="closeLightbox"
          >
            <X class="h-6 w-6" />
          </button>
          <button
            v-if="galleryItems.length > 1"
            type="button"
            class="absolute left-4 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            @click.stop="showPreviousImage"
          >
            <ChevronLeft class="h-7 w-7" />
          </button>
          <div
            class="relative flex max-h-[92vh] w-full max-w-[1400px] items-center justify-center"
            @click.stop
          >
            <video
              v-if="activeMedia?.type === 'video'"
              :src="activeMedia.src"
              :poster="activeMedia.thumb || activeMedia.poster"
              class="max-h-[88vh] max-w-full rounded-[28px] object-contain"
              controls
              autoplay
              muted
              playsinline
            />
            <img
              v-else-if="activeImage"
              :src="activeImage"
              :alt="product.title"
              class="max-h-[88vh] max-w-full rounded-[28px] object-contain"
            />
          </div>
          <button
            v-if="galleryItems.length > 1"
            type="button"
            class="absolute right-4 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            @click.stop="showNextImage"
          >
            <ChevronRight class="h-7 w-7" />
          </button>
          <div class="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-2">
            <button
              v-for="image in galleryItems"
              :key="`lightbox-${image.key}`"
              type="button"
              class="h-16 w-16 overflow-hidden rounded-2xl border transition"
              :class="activeImage === image.src ? 'border-teal-400 ring-2 ring-teal-300' : 'border-white/20 opacity-80 hover:opacity-100'"
              @click.stop="activeImage = image.src"
            >
              <video
                v-if="image.type === 'video'"
                :src="image.src"
                :poster="image.thumb || image.poster"
                class="h-full w-full object-cover"
                muted
                playsinline
                preload="metadata"
              />
              <img v-else :src="image.thumb || image.src" :alt="product.title" class="h-full w-full object-cover" />
            </button>
          </div>
        </div>

      </template>

      <div v-else class="mt-8 rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
        <Package class="mx-auto h-10 w-10 text-slate-300" />
        <p class="mt-3 text-sm font-semibold text-slate-800">Product not found</p>
        <p class="mt-1 text-sm text-slate-500">The product may have been removed or is not published yet.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast, Button } from '@matrix-ecommerce/ui';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Layers3, Package, RefreshCcw, Star, Truck, X, ZoomIn } from 'lucide-vue-next';
import { useShoppingCart } from '@/composables/useShoppingCart';
import { getYouMayLikeProducts, recordRecommendationEvent } from '@/utils/shopping-personalization';
import ProductCard from '@/components/shopping/ProductCard.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { addToCart: addToCartComposable } = useShoppingCart();

const loading = ref(false);
const relatedLoading = ref(false);
const product = ref<any | null>(null);
const relatedProducts = ref<any[]>([]);
const recommendationProducts = ref<any[]>([]);
const activeImage = ref('');
const lightboxOpen = ref(false);
const selectedSkuIndex = ref(0);
const quantity = ref(1);
const activeDetailTab = ref<'overview' | 'specification' | 'variants' | 'seller'>('overview');
const placeholderImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%25" height="100%25" fill="%23f1f5f9"/><path d="M70 125l25-28 20 22 18-20 27 26H70z" fill="%2394a3b8"/><circle cx="84" cy="84" r="12" fill="%2394a3b8"/></svg>';

const detailTabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'specification', label: 'Specification' },
  { value: 'variants', label: 'Variants' },
  { value: 'seller', label: 'Seller info' },
] as const;

const gallery = computed(() => {
  const images = Array.isArray(product.value?.images) ? product.value.images : [];
  const primary = product.value?.imageUrl ? [product.value.imageUrl] : [];
  return Array.from(new Set([...primary, ...images].filter(Boolean)));
});

const galleryItems = computed(() => {
  const baseItems = gallery.value.map((src, index) => ({
    key: `gallery-${index}-${src}`,
    src,
    thumb: src,
    type: 'image' as const,
  }));

  const videoItems = product.value?.videoUrl
    ? [{
        key: `video-${product.value.videoUrl}`,
        src: String(product.value.videoUrl),
        thumb: String(product.value.videoThumbnailUrl || product.value.imageUrl || ''),
        poster: String(product.value.videoThumbnailUrl || product.value.imageUrl || ''),
        type: 'video' as const,
      }]
    : [];

  const skuItems = (Array.isArray(product.value?.skus) ? product.value.skus : [])
    .filter((row: any) => row?.imageUrl || row?.thumbnailUrl)
    .map((row: any, index: number) => ({
      key: `sku-${index}-${row.imageUrl || row.thumbnailUrl}`,
      src: row.imageUrl || row.thumbnailUrl,
      thumb: row.thumbnailUrl || row.imageUrl,
      type: 'image' as const,
    }));

  return Array.from(new Map([...videoItems, ...baseItems, ...skuItems].map((item) => [item.src, item])).values());
});

const activeMedia = computed(() => galleryItems.value.find((item) => item.src === activeImage.value) || null);

const activeImageIndex = computed(() => {
  const index = galleryItems.value.findIndex((item) => item.src === activeImage.value);
  return index >= 0 ? index : 0;
});

const skuOptions = computed(() =>
  (Array.isArray(product.value?.skus) ? product.value.skus : []).map((row: any, index: number) => ({
    index,
    label: String(row?.label || row?.name || `Option ${index + 1}`),
    sku: String(row?.sku || ''),
    price: row?.price !== undefined && row?.price !== null && row?.price !== '' ? Number(row.price) : null,
    stockQty: row?.stock_qty !== undefined && row?.stock_qty !== null && row?.stock_qty !== '' ? Number(row.stock_qty) : null,
    imageUrl: String(row?.imageUrl || ''),
    thumbnailUrl: String(row?.thumbnailUrl || ''),
  })),
);

const selectedSku = computed(() => skuOptions.value[selectedSkuIndex.value] || null);
const skuPriceValues = computed(() =>
  skuOptions.value
    .map((row) => row.price)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price)),
);
const basePriceMin = computed(() => {
  if (skuPriceValues.value.length > 0) {
    return Math.min(...skuPriceValues.value);
  }
  return Number(product.value?.priceMin ?? product.value?.raw?.price ?? 0);
});
const basePriceMax = computed(() => {
  if (skuPriceValues.value.length > 0) {
    return Math.max(...skuPriceValues.value);
  }
  return Number(product.value?.priceMin ?? product.value?.raw?.price ?? 0);
});
const hasPriceRange = computed(() => basePriceMax.value > basePriceMin.value);
const minimumOrderQty = computed(() => Math.max(1, Number(product.value?.minimumOrderQty || 1)));
const displayUnitPrice = computed(() => {
  if (selectedSku.value?.price !== null && selectedSku.value?.price !== undefined) {
    return Number(selectedSku.value.price);
  }
  return basePriceMin.value;
});
const displayPrice = computed(() => (
  hasPriceRange.value
    ? `${formatMoney(basePriceMin.value)} - ${formatMoney(basePriceMax.value)}`
    : formatMoney(basePriceMin.value)
));
const compareAtPrice = computed(() => {
  const value = Number(product.value?.originalPrice ?? product.value?.raw?.original_price ?? 0);
  if (!value || value <= basePriceMin.value) return null;
  return value;
});
const savePercent = computed(() => {
  if (!compareAtPrice.value || compareAtPrice.value <= 0) return 0;
  return Math.max(0, Math.round(((compareAtPrice.value - basePriceMin.value) / compareAtPrice.value) * 100));
});
const selectedSkuCode = computed(() => selectedSku.value?.sku || '');
const resolvedStock = computed(() => {
  if (selectedSku.value?.stockQty !== null && selectedSku.value?.stockQty !== undefined) return selectedSku.value.stockQty;
  if (product.value?.stock !== undefined && product.value?.stock !== null) return Number(product.value.stock);
  if (product.value?.availableQuantity !== undefined && product.value?.availableQuantity !== null) return Number(product.value.availableQuantity);
  return null;
});
const stockLabel = computed(() => {
  if (resolvedStock.value === null) return 'Stock not set';
  if (resolvedStock.value <= 0) return 'Out of stock';
  return `${resolvedStock.value} item(s) available`;
});
const stockBadgeLabel = computed(() => {
  if (resolvedStock.value === null) return 'Stock untracked';
  if (resolvedStock.value <= 0) return 'Out of stock';
  if (resolvedStock.value < 6) return 'Low stock';
  return 'In stock';
});
const stockShortText = computed(() => (resolvedStock.value === null ? 'Stock not set' : `${resolvedStock.value} items`));
const roundedRating = computed(() => Math.max(0, Math.min(5, Math.round(Number(product.value?.rating ?? 0)))));
const ratingDisplay = computed(() => (
  product.value?.rating !== undefined && product.value?.rating !== null
    ? Number(product.value.rating).toFixed(1)
    : 'No ratings yet'
));
const reviewText = computed(() => {
  const count = Number(product.value?.ratingCount ?? 0);
  if (!count) return '0 reviews';
  return `${count} review${count === 1 ? '' : 's'}`;
});
const quantityTotalPrice = computed(() => formatMoney(displayUnitPrice.value * Number(quantity.value || 1)));
const sellerLocation = computed(() => product.value?.vendorName || product.value?.sellerName || 'Local warehouse');
const detailPoints = computed(() =>
  resolveDetailPoints(product.value?.detailPoints, product.value?.raw?.dimensions)
    .map((row: any) => ({
      text: String(row?.text || '').trim(),
      depth: Math.max(0, Math.min(2, Number(row?.depth || 0))),
    }))
    .filter((row) => row.text),
);
const specificationRows = computed(() => {
  const rows = skuOptions.value;
  if (rows.length > 0) return rows;

  const fallback: Array<{ label: string; sku?: string; price: number | null; stockQty: number | null }> = [];
  if (product.value?.raw?.sku) {
    fallback.push({
      label: 'Default product SKU',
      sku: String(product.value.raw.sku),
      price: Number(product.value?.priceMin ?? product.value?.priceMax ?? 0),
      stockQty: resolvedStock.value,
    });
  }
  return fallback;
});

function formatMoney(value: number) {
  return `BDT ${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function resolveDetailPoints(...sources: any[]) {
  for (const source of sources) {
    if (Array.isArray(source)) return source;
    if (source && typeof source === 'object' && Array.isArray(source.detailPoints)) return source.detailPoints;
    if (typeof source === 'string') {
      try {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.detailPoints)) return parsed.detailPoints;
      } catch {
        // Ignore invalid JSON strings and keep looking.
      }
    }
  }
  return [];
}

function goBack() {
  router.back();
}

function normalizeQuantity() {
  const next = Math.max(minimumOrderQty.value, Number(quantity.value || minimumOrderQty.value));
  if (resolvedStock.value !== null && resolvedStock.value > 0) {
    quantity.value = Math.min(next, resolvedStock.value);
    return;
  }
  quantity.value = next;
}

function increaseQuantity() {
  quantity.value = Number(quantity.value || minimumOrderQty.value) + 1;
  normalizeQuantity();
}

function decreaseQuantity() {
  quantity.value = Number(quantity.value || minimumOrderQty.value) - 1;
  normalizeQuantity();
}

function openLightbox(index?: number) {
  if (typeof index === 'number' && galleryItems.value[index]) {
    activeImage.value = galleryItems.value[index].src;
  } else if (!activeImage.value && galleryItems.value[0]) {
    activeImage.value = galleryItems.value[0].src;
  }
  lightboxOpen.value = true;
}

function closeLightbox() {
  lightboxOpen.value = false;
}

function showPreviousImage() {
  if (galleryItems.value.length === 0) return;
  const nextIndex = (activeImageIndex.value - 1 + galleryItems.value.length) % galleryItems.value.length;
  activeImage.value = galleryItems.value[nextIndex].src;
}

function showNextImage() {
  if (galleryItems.value.length === 0) return;
  const nextIndex = (activeImageIndex.value + 1) % galleryItems.value.length;
  activeImage.value = galleryItems.value[nextIndex].src;
}

function selectSku(index: number) {
  selectedSkuIndex.value = index;
  const sku = skuOptions.value[index];
  if (sku?.imageUrl || sku?.thumbnailUrl) {
    activeImage.value = sku.imageUrl || sku.thumbnailUrl;
  }
}

function buildCartPayload() {
  if (!product.value) return null;

  const payload = {
    ...product.value,
    priceMin: displayUnitPrice.value,
    priceMax: displayUnitPrice.value,
    displayPriceMin: displayUnitPrice.value,
    displayPriceMax: displayUnitPrice.value,
    displayCurrency: 'BDT',
    sourceCurrency: 'BDT',
  };

  if (!selectedSku.value) {
    return { payload, skuDetails: undefined };
  }

  return {
    payload,
    skuDetails: [
      {
        specId: selectedSku.value.sku || selectedSku.value.label,
        qty: Number(quantity.value || minimumOrderQty.value),
        sku: {
          sku: selectedSku.value.sku,
          label: selectedSku.value.label,
          stock_qty: selectedSku.value.stockQty,
        },
        label: selectedSku.value.label,
        sourceUnitPrice: displayUnitPrice.value,
        displayUnitPrice: displayUnitPrice.value,
        imageUrl: selectedSku.value.imageUrl || undefined,
        thumbnailUrl: selectedSku.value.thumbnailUrl || selectedSku.value.imageUrl || undefined,
      },
    ],
  };
}

function addCurrentToCart() {
  const cart = buildCartPayload();
  if (!cart) return;
  normalizeQuantity();
  addToCartComposable(cart.payload, selectedSku.value ? 0 : Number(quantity.value || minimumOrderQty.value), cart.skuDetails);
  recordRecommendationEvent('add_to_cart', product.value, { source: 'product_detail', qty: Number(quantity.value || minimumOrderQty.value) });
  toast.success('Added to cart');
}

function addSuggestedToCart(item: any) {
  addToCartComposable(item, 1);
  recordRecommendationEvent('add_to_cart', item, { source: 'product_detail_suggestions', qty: 1 });
  toast.success('Added to cart');
}

function buyNow() {
  const cart = buildCartPayload();
  if (!cart) return;
  normalizeQuantity();
  addToCartComposable(cart.payload, selectedSku.value ? 0 : Number(quantity.value || minimumOrderQty.value), cart.skuDetails);
  recordRecommendationEvent('buy_now', product.value, { source: 'product_detail', qty: Number(quantity.value || minimumOrderQty.value) });
  router.push('/shopping/cart');
}

async function loadRelatedProducts() {
  if (!product.value) {
    relatedProducts.value = [];
    return;
  }

  relatedLoading.value = true;
  try {
    const baseParams = {
      category: product.value?.raw?.category?.slug || undefined,
      mainCategory: product.value?.raw?.mainCategory?.slug || undefined,
      brandId: product.value?.raw?.brand_id || undefined,
      productTypeId: product.value?.raw?.product_type_id || undefined,
      page: 1,
      pageSize: 12,
    };
    const response = await axios.get('/api/public/shopping/search', {
      params: baseParams,
    });

    const primaryItems = Array.isArray(response.data?.items) ? response.data.items : [];
    let merged = primaryItems.filter((item: any) => item.externalId !== product.value.externalId);

    if (merged.length < 6) {
      const fallbackResponse = await axios.get('/api/public/shopping/search', {
        params: {
          mainCategory: product.value?.raw?.mainCategory?.slug || undefined,
          category: product.value?.raw?.category?.slug || undefined,
          page: 1,
          pageSize: 18,
        },
      });
      const fallbackItems = Array.isArray(fallbackResponse.data?.items) ? fallbackResponse.data.items : [];
      const seen = new Set(merged.map((item: any) => item.externalId));
      for (const item of fallbackItems) {
        if (item.externalId === product.value.externalId || seen.has(item.externalId)) continue;
        merged.push(item);
        seen.add(item.externalId);
        if (merged.length >= 6) break;
      }
    }

    relatedProducts.value = merged.slice(0, 6);
  } catch {
    relatedProducts.value = [];
  } finally {
    relatedLoading.value = false;
  }
}

async function loadRecommendationProducts() {
  if (!product.value) {
    recommendationProducts.value = [];
    return;
  }

  try {
    const response = await axios.get(`/api/public/recommendations/product/${product.value.externalId}`, {
      params: {
        limit: 6,
      },
    });
    let items = Array.isArray(response.data?.items) ? response.data.items : [];
    if (items.length < 6) {
      const globalResponse = await axios.get('/api/public/recommendations/global', { params: { limit: 6 } });
      const globalItems = Array.isArray(globalResponse.data?.items) ? globalResponse.data.items : [];
      const seen = new Set(items.map((item: any) => item.externalId));
      for (const item of globalItems) {
        if (item.externalId === product.value.externalId || seen.has(item.externalId)) continue;
        items.push(item);
        seen.add(item.externalId);
        if (items.length >= 6) break;
      }
    }
    recommendationProducts.value = items.length > 0 ? items.slice(0, 6) : getYouMayLikeProducts(6);
  } catch {
    recommendationProducts.value = getYouMayLikeProducts(6);
  }
}

function openProduct(item: any) {
  router.push({ name: 'product-detail', params: { externalId: item.externalId } });
}

function openSellerBrowse() {
  router.push({
    name: 'shopping-browse',
    query: {
      mainCategory: product.value?.raw?.mainCategory?.slug || undefined,
      category: product.value?.raw?.category?.slug || undefined,
      brandId: product.value?.raw?.brand_id || undefined,
    },
  });
}

function openBrowse() {
  router.push({ name: 'shopping-browse' });
}

async function loadProduct() {
  const externalId = String(route.params.externalId || '').trim();
  if (!externalId) {
    product.value = null;
    relatedProducts.value = [];
    return;
  }

  loading.value = true;
  try {
    const response = await axios.get(`/api/public/shopping/item/${externalId}`);
    product.value = response.data || null;
    activeImage.value = response.data?.videoUrl || response.data?.imageUrl || response.data?.images?.[0] || '';
    selectedSkuIndex.value = 0;
    activeDetailTab.value = 'overview';
    quantity.value = Math.max(1, Number(response.data?.minimumOrderQty || 1));
    normalizeQuantity();
    recordRecommendationEvent('product_view', response.data, { source: 'product_detail' });
    await Promise.all([loadRelatedProducts(), loadRecommendationProducts()]);
  } catch (error) {
    console.error('Failed to load product', error);
    product.value = null;
    relatedProducts.value = [];
    recommendationProducts.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.externalId,
  () => {
    void loadProduct();
  },
  { immediate: true },
);

watch(selectedSkuIndex, () => {
  normalizeQuantity();
});

watch(quantity, () => {
  normalizeQuantity();
});
</script>
