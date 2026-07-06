<template>
  <div class="min-h-screen bg-[#eef3f9] text-slate-700">
    <main class="w-full">
      <section class="relative min-h-[640px] overflow-hidden bg-[#dfe8e2]">
        <Transition name="hero-fade" mode="out-in">
          <div
            :key="`hero-mobile-${activeHeroIndex}`"
            class="absolute inset-0 bg-cover bg-center opacity-35 lg:hidden"
            :style="{ backgroundImage: `url('${activeHeroImage}')` }"
          />
        </Transition>
        <Transition name="hero-fade" mode="out-in">
          <div
            :key="`hero-desktop-${activeHeroIndex}`"
            class="absolute inset-y-0 right-0 hidden w-[58%] bg-cover bg-center lg:block"
            :style="{ backgroundImage: `linear-gradient(90deg, rgba(223,232,226,0.98) 0%, rgba(223,232,226,0.70) 22%, rgba(223,232,226,0.08) 58%), url('${activeHeroImage}')` }"
          />
        </Transition>
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.88),transparent_34%),linear-gradient(110deg,rgba(255,255,255,0.82),rgba(255,255,255,0.35)_68%)] lg:bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.85),transparent_34%),linear-gradient(110deg,rgba(255,255,255,0.72),rgba(255,255,255,0)_68%)]" />

        <div class="relative grid min-h-[640px] items-center gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,620px)_1fr] lg:px-16 xl:px-24">
          <div class="space-y-5">
            <p class="text-[10px] font-bold uppercase tracking-[0.4em] text-orange-600">Matrix Ecommerce</p>
            <Transition name="hero-content" mode="out-in">
              <div :key="`hero-copy-${activeHeroIndex}`" class="space-y-3">
                <h1 class="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">{{ activeHeroTitle }}</h1>
                <p class="max-w-2xl text-sm leading-6 text-slate-600">
                  {{ activeHeroSubtitle }}
                </p>
              </div>
            </Transition>

            <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="openBrowse">
              <div class="flex h-12 flex-1 items-center rounded-full border border-slate-200 bg-white px-4 shadow-sm focus-within:border-rose-300">
                <Search class="h-4 w-4 text-slate-400" />
                <input
                  v-model="searchQuery"
                  placeholder="Search products, sellers, or categories"
                  class="ml-3 w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <Button type="submit" variant="primary" class="h-12 rounded-full bg-orange-600 px-6 hover:bg-orange-700">Search</Button>
              <Button type="button" variant="ghost" class="h-12 rounded-full px-6" @click="openBrowse">Browse all</Button>
            </form>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="category in categories.slice(0, 8)"
                :key="category.id"
                type="button"
                class="rounded-full border border-white/80 bg-white/85 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-orange-200 hover:text-orange-700"
                @click="openCategory(category)"
              >
                {{ category.name }}
              </button>
            </div>

            <div class="max-w-3xl rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur">
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Find accessories by phone</p>
              <div class="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <select
                  v-model="selectedBrandId"
                  class="h-14 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400"
                >
                  <option value="">My Brand</option>
                  <option v-for="brand in phoneBrands" :key="brand.id" :value="brand.id">{{ brand.name }}</option>
                </select>
                <select
                  v-model="selectedModelId"
                  class="h-14 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  :disabled="!selectedBrandId"
                >
                  <option value="">My Model</option>
                  <option v-for="model in selectedBrandModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
                <Button type="button" variant="primary" class="h-14 rounded-2xl bg-orange-600 px-8 hover:bg-orange-700" @click="openPhoneAccessories">See cases</Button>
              </div>
            </div>
            <div v-if="heroBanners.length > 1" class="flex gap-2">
              <button
                v-for="(banner, index) in heroBanners"
                :key="banner.id || index"
                type="button"
                class="h-2.5 rounded-full transition-all"
                :class="index === activeHeroIndex ? 'w-8 bg-orange-600' : 'w-2.5 bg-white/80'"
                @click="setActiveHero(index)"
                :aria-label="`Show banner ${index + 1}`"
              />
            </div>
          </div>

          <div class="hidden min-h-[500px] items-end justify-end lg:flex">
            <div class="mr-2 w-72 rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.16)] backdrop-blur">
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Local catalog</p>
              <p class="mt-2 text-3xl font-black text-slate-950">{{ categories.length }}</p>
              <p class="mt-1 text-xs leading-5 text-slate-600">Main and product categories managed from admin.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="mx-4 mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:mx-8 lg:mx-16 xl:mx-24">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Categories</p>
            <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">Browse by category</h2>
          </div>
          <Button variant="ghost" size="sm" @click="openBrowse">View all products</Button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            class="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700"
            @click="openCategory(category)"
          >
            {{ category.name }}
          </button>
        </div>
      </section>

      <section class="mx-4 mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:mx-8 lg:mx-16 xl:mx-24">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Hot products</p>
            <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">Best matches from the local catalog</h2>
          </div>
          <span class="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold text-rose-700">{{ hotItems.length }} items</span>
        </div>

        <div v-if="loading" class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div v-for="i in 8" :key="i" class="h-80 animate-pulse rounded-[24px] bg-slate-100" />
        </div>

        <div v-else-if="hotItems.length > 0" class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProductCard
            v-for="product in hotItems"
            :key="product.externalId"
            :product="product"
            @click="openProduct"
            @request-buy="addProduct"
          />
        </div>

        <div v-else class="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          No hot products yet. Add products from the admin panel to populate the storefront.
        </div>
      </section>

      <section v-for="section in curatedSections" :key="section.key" class="mx-4 mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:mx-8 lg:mx-16 xl:mx-24">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{{ section.label }}</p>
            <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">{{ section.title }}</h2>
          </div>
          <Button variant="ghost" size="sm" @click="openBrowse">Browse more</Button>
        </div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProductCard
            v-for="product in section.items"
            :key="`${section.key}-${product.externalId}`"
            :product="product"
            @click="openProduct"
            @request-buy="addProduct"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast, Button } from '@matrix-ecommerce/ui';
import { Search } from 'lucide-vue-next';
import ProductCard from '@/components/shopping/ProductCard.vue';
import { useShoppingCart } from '@/composables/useShoppingCart';

const router = useRouter();
const toast = useToast();
const { addToCart } = useShoppingCart();

const searchQuery = ref('');
const loading = ref(false);
const categories = ref<any[]>([]);
const hotItems = ref<any[]>([]);
const curatedSections = ref<Array<{ key: string; label: string; title: string; items: any[] }>>([]);
const taxonomy = ref<any[]>([]);
const selectedBrandId = ref('');
const selectedModelId = ref('');
const heroBanners = ref<any[]>([]);
const activeHeroIndex = ref(0);
let heroTimer: number | null = null;

const fallbackHeroImage = 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=1400&q=85';
const activeHero = computed(() => heroBanners.value[activeHeroIndex.value] || null);
const activeHeroImage = computed(() => activeHero.value?.coverAsset?.public_url || activeHero.value?.coverAsset?.thumbnail_url || fallbackHeroImage);
const activeHeroTitle = computed(() => activeHero.value?.title || 'Mobile accessories for your exact phone.');
const activeHeroSubtitle = computed(() => activeHero.value?.subtitle || 'Pick your brand and model, then browse local BDT products uploaded from the admin panel.');

const phoneCategory = computed(() => taxonomy.value.find((item) => item.slug === 'phone-accessories') || null);
const phoneBrands = computed(() => phoneCategory.value?.brands || []);
const selectedBrandModels = computed(() => {
  const brand = phoneBrands.value.find((item: any) => item.id === selectedBrandId.value);
  return brand?.models || [];
});

async function loadCategories() {
  try {
    const response = await axios.get('/api/public/shopping/taxonomy');
    categories.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    categories.value = [];
  }
}

async function loadHotItems() {
  loading.value = true;
  try {
    const response = await axios.get('/api/public/shopping/hot', { params: { page: 1, pageSize: 8 } });
    hotItems.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    hotItems.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadTaxonomy() {
  try {
    const response = await axios.get('/api/public/shopping/taxonomy');
    taxonomy.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    taxonomy.value = [];
  }
}

async function loadHeroBanners() {
  try {
    const response = await axios.get('/api/public/homepage-banners');
    heroBanners.value = Array.isArray(response.data) ? response.data.filter((banner: any) => banner?.coverAsset?.public_url || banner?.coverAsset?.thumbnail_url) : [];
    activeHeroIndex.value = 0;
  } catch {
    heroBanners.value = [];
  }
}

function clearHeroRotation() {
  if (heroTimer) {
    window.clearInterval(heroTimer);
    heroTimer = null;
  }
}

function startHeroRotation() {
  clearHeroRotation();
  heroTimer = window.setInterval(() => {
    if (heroBanners.value.length > 1) {
      activeHeroIndex.value = (activeHeroIndex.value + 1) % heroBanners.value.length;
    }
  }, 5000);
}

function setActiveHero(index: number) {
  activeHeroIndex.value = index;
  startHeroRotation();
}

async function loadCuratedSections() {
  try {
    const response = await axios.get('/api/public/shopping/home-curated');
    const sections = Array.isArray(response.data) ? response.data : [];
    curatedSections.value = sections.map((section: any, index: number) => ({
      key: String(section.key || section.sectionKey || `section-${index}`),
      label: String(section.label || section.sectionLabel || 'Curated'),
      title: String(section.title || section.sectionTitle || 'Recommended for you'),
      items: Array.isArray(section.items) ? section.items : [],
    }));
  } catch {
    curatedSections.value = [];
  }
}

function openBrowse() {
  router.push({
    name: 'shopping-browse',
    query: searchQuery.value.trim() ? { q: searchQuery.value.trim() } : undefined,
  });
}

function openPhoneAccessories() {
  router.push({
    name: 'shopping-browse',
    query: {
      mainCategory: 'phone-accessories',
      brandId: selectedBrandId.value || undefined,
      brandModelId: selectedModelId.value || undefined,
    },
  });
}

function openCategory(category: any) {
  router.push({
    name: 'shopping-browse',
    query: { mainCategory: String(category.slug || category.id || '') },
  });
}

function openProduct(product: any) {
  router.push({ name: 'product-detail', params: { externalId: product.externalId } });
}

function addProduct(product: any) {
  addToCart(product, 1);
  toast.success('Added to cart');
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadHotItems(), loadCuratedSections(), loadTaxonomy(), loadHeroBanners()]);
  startHeroRotation();
});

onUnmounted(() => {
  clearHeroRotation();
});

watch(selectedBrandId, () => {
  selectedModelId.value = '';
});
</script>

<style scoped>
.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity 0.8s ease;
}

.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}

.hero-content-enter-active,
.hero-content-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}

.hero-content-enter-from,
.hero-content-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
