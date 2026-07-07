<template>
  <div class="min-h-screen bg-[#eef3f9] text-slate-700">
    <main class="w-full pb-16">
      <section class="w-full overflow-hidden bg-[#dfe8e2] shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div class="relative min-h-[520px] overflow-hidden">
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
              class="absolute inset-y-0 right-0 hidden w-[54%] bg-cover bg-center lg:block"
              :style="{ backgroundImage: `linear-gradient(90deg, rgba(223,232,226,0.98) 0%, rgba(223,232,226,0.70) 22%, rgba(223,232,226,0.08) 58%), url('${activeHeroImage}')` }"
            />
          </Transition>
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.88),transparent_34%),linear-gradient(110deg,rgba(255,255,255,0.82),rgba(255,255,255,0.38)_68%)] lg:bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.85),transparent_34%),linear-gradient(110deg,rgba(255,255,255,0.72),rgba(255,255,255,0)_68%)]" />

          <div class="relative grid min-h-[520px] items-center gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,640px)_1fr] lg:px-14 xl:px-20">
            <div class="space-y-5">
              <p class="text-[10px] font-bold uppercase tracking-[0.4em] text-orange-600">Matrix Ecommerce</p>
              <Transition name="hero-content" mode="out-in">
                <div :key="`hero-copy-${activeHeroIndex}`" class="space-y-3">
                  <h1 class="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
                    {{ activeHeroTitle }}
                  </h1>
                  <p class="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    {{ activeHeroSubtitle }}
                  </p>
                </div>
              </Transition>

              <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="openBrowse">
                <div class="flex h-12 flex-1 items-center rounded-full border border-slate-200 bg-white px-4 shadow-sm focus-within:border-orange-300">
                  <Search class="h-4 w-4 text-slate-400" />
                  <input
                    v-model="searchQuery"
                    placeholder="Search products, sellers, or keywords"
                    class="ml-3 w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <Button type="submit" variant="primary" class="h-12 rounded-full bg-orange-600 px-6 hover:bg-orange-700">
                  Search
                </Button>
                <Button type="button" variant="ghost" class="h-12 rounded-full px-6" @click="openBrowse">
                  Browse all
                </Button>
              </form>

              <div class="flex flex-wrap gap-2">
                <button
                  v-for="chip in quickSearchChips"
                  :key="chip.label"
                  type="button"
                  class="rounded-full border border-white/80 bg-white/85 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-orange-200 hover:text-orange-700"
                  @click="openKeyword(chip.keyword)"
                >
                  {{ chip.label }}
                </button>
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
          </div>
        </div>
      </section>

      <section class="-mt-6 w-full overflow-hidden border-y border-white/80 bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400">Quick menu</p>
            <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">Shop by what people tap first</h2>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Auto scroll
          </span>
        </div>

        <div class="menu-mask mt-4">
          <div class="menu-track">
            <button
              v-for="(item, index) in marqueeMenuItems"
              :key="`${item.id}-${index}`"
              type="button"
              class="menu-item group"
              @click="openKeyword(item.searchKeyword || item.title)"
            >
              <span class="menu-avatar-wrap">
                <span class="menu-avatar">
                  <img
                    :src="item.imageUrl || fallbackThumb"
                    :alt="item.imageAlt || item.title"
                    class="h-full w-full rounded-full object-cover"
                  />
                </span>
              </span>
              <span class="mt-2 line-clamp-2 max-w-[92px] text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                {{ item.title }}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section
        v-if="hotDeals.length > 0"
        class="mt-6 w-full border-y border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Hot items</p>
            <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">Two spotlight products from the admin panel</h2>
          </div>
          <Button variant="ghost" size="sm" @click="openBrowse">Browse more</Button>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <ProductCard
            v-for="product in hotDeals.slice(0, 2)"
            :key="product.externalId"
            :product="product"
            @click="openProduct"
            @request-buy="addProduct"
          />
        </div>
      </section>

      <section
        v-if="recommendedItems.length > 0"
        class="mt-6 w-full border-y border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Recommended</p>
            <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">You may like</h2>
          </div>
          <Button variant="ghost" size="sm" @click="openBrowse">Browse more</Button>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProductCard
            v-for="product in recommendedItems.slice(0, 8)"
            :key="product.externalId"
            :product="product"
            @click="openProduct"
            @request-buy="addProduct"
          />
        </div>
      </section>

      <section
        v-for="section in homepageCollections"
        :key="section.key"
        class="mt-6 w-full border-y border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-[0_12px_25px_rgba(15,23,42,0.08)]"
            >
              <img
                v-if="section.imageUrl"
                :src="section.imageUrl"
                :alt="section.imageAlt || section.label"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-xs font-black uppercase tracking-[0.15em] text-slate-400">ME</span>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{{ section.label }}</p>
              <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">{{ section.title }}</h2>
            </div>
          </div>
          <Button variant="ghost" size="sm" @click="openKeyword(section.searchKeyword || section.title)">Browse more</Button>
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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { Button, useToast } from '@matrix-ecommerce/ui';
import { Search } from 'lucide-vue-next';
import ProductCard from '@/components/shopping/ProductCard.vue';
import { useShoppingCart } from '@/composables/useShoppingCart';

const router = useRouter();
const toast = useToast();
const { addToCart } = useShoppingCart();

const fallbackThumb = 'https://placehold.co/200x200/f8fafc/0f172a?text=ME';

const searchQuery = ref('');
const heroBanners = ref<any[]>([]);
const visualMenuSections = ref<any[]>([]);
const hotDeals = ref<any[]>([]);
const recommendedItems = ref<any[]>([]);
const homepageCollections = ref<Array<{ key: string; label: string; title: string; imageUrl?: string; imageAlt?: string; searchKeyword?: string; items: any[]; sortOrder: number }>>([]);
const activeHeroIndex = ref(0);
let heroTimer: number | null = null;

const activeHero = computed(() => heroBanners.value[activeHeroIndex.value] || null);
const activeHeroImage = computed(() => activeHero.value?.coverAsset?.public_url || activeHero.value?.coverAsset?.thumbnail_url || fallbackThumb);
const activeHeroTitle = computed(() => activeHero.value?.title || 'Premium accessories for your store-ready phone setup.');
const activeHeroSubtitle = computed(() => activeHero.value?.subtitle || 'Shop uploaded products, select hot items from the admin panel, and keep the homepage focused on what actually sells.');

const quickSearchChips = [
  { label: 'Phone cover', keyword: 'phone cover' },
  { label: 'Charger', keyword: 'charger' },
  { label: 'Earbud', keyword: 'earbud' },
  { label: 'Power bank', keyword: 'power bank' },
];

function menuImage(label: string): string {
  const normalized = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const iconMap: Record<string, string> = {
    phone_cover: '/menu_round_icons/mobile_cover.png',
    mobile_cover: '/menu_round_icons/mobile_cover.png',
    charger: '/menu_round_icons/charger.png',
    phone_glass: '/menu_round_icons/mobile_glass.png',
    mobile_glass: '/menu_round_icons/mobile_glass.png',
    earbud: '/menu_round_icons/earbud.png',
    cable: '/menu_round_icons/cable.png',
    power_bank: '/menu_round_icons/power_bank.png',
    phone_holder: '/menu_round_icons/phone_holder.png',
    holder: '/menu_round_icons/phone_holder.png',
    watch: '/menu_round_icons/watch.png',
  };

  return iconMap[normalized] || `https://placehold.co/240x240/f8fafc/0f172a?text=${encodeURIComponent(label)}`;
}

const defaultQuickMenuItems = [
  { id: 'quick-phone-cover', title: 'Phone Cover', searchKeyword: 'phone cover', imageUrl: menuImage('Phone Cover'), imageAlt: 'Phone cover' },
  { id: 'quick-charger', title: 'Charger', searchKeyword: 'charger', imageUrl: menuImage('Charger'), imageAlt: 'Charger' },
  { id: 'quick-phone-glass', title: 'Phone Glass', searchKeyword: 'phone glass', imageUrl: menuImage('Phone Glass'), imageAlt: 'Phone glass' },
  { id: 'quick-earbud', title: 'Earbud', searchKeyword: 'earbud', imageUrl: menuImage('Earbud'), imageAlt: 'Earbud' },
  { id: 'quick-cable', title: 'Cable', searchKeyword: 'cable', imageUrl: menuImage('Cable'), imageAlt: 'Cable' },
  { id: 'quick-power-bank', title: 'Power Bank', searchKeyword: 'power bank', imageUrl: menuImage('Power Bank'), imageAlt: 'Power bank' },
  { id: 'quick-holder', title: 'Phone Holder', searchKeyword: 'phone holder', imageUrl: menuImage('Phone Holder'), imageAlt: 'Phone holder' },
  { id: 'quick-watch', title: 'Watch', searchKeyword: 'watch strap', imageUrl: menuImage('Watch'), imageAlt: 'Watch' },
];

const quickMenuItems = computed(() => {
  const quickSection = visualMenuSections.value.find((section: any) => section.sectionKey === 'quick-menu');
  const items = Array.isArray(quickSection?.items) && quickSection.items.length > 0 ? quickSection.items : defaultQuickMenuItems;
  return items
    .filter((item: any) => item?.title && item?.searchKeyword)
    .map((item: any) => ({
      ...item,
      imageUrl: menuImage(item.title),
      imageAlt: item.imageAlt || item.title,
    }));
});

const marqueeMenuItems = computed(() => {
  const items = quickMenuItems.value.slice(0, 8);
  return Array.from({ length: 6 }).flatMap(() => items);
});

function stopHeroRotation() {
  if (heroTimer) {
    window.clearInterval(heroTimer);
    heroTimer = null;
  }
}

function startHeroRotation() {
  stopHeroRotation();
  if (heroBanners.value.length <= 1) return;
  heroTimer = window.setInterval(() => {
    activeHeroIndex.value = (activeHeroIndex.value + 1) % heroBanners.value.length;
  }, 5200);
}

function setActiveHero(index: number) {
  activeHeroIndex.value = index;
  startHeroRotation();
}

async function loadHeroBanners() {
  try {
    const response = await axios.get('/api/public/homepage-banners');
    heroBanners.value = Array.isArray(response.data)
      ? response.data.filter((banner: any) => banner?.coverAsset?.public_url || banner?.coverAsset?.thumbnail_url)
      : [];
    activeHeroIndex.value = 0;
  } catch {
    heroBanners.value = [];
  }
}

async function loadVisualMenu() {
  try {
    const response = await axios.get('/api/public/shopping/home-visual-menu');
    visualMenuSections.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    visualMenuSections.value = [];
  }
}

async function loadHotDeals() {
  try {
    const response = await axios.get('/api/public/shopping/hot-deals');
    hotDeals.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    hotDeals.value = [];
  }
}

async function loadRecommended() {
  try {
    const response = await axios.get('/api/public/shopping/hot', { params: { page: 1, pageSize: 8 } });
    recommendedItems.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    recommendedItems.value = [];
  }
}

async function loadHomepageCollections() {
  try {
    const response = await axios.get('/api/public/shopping/home-collections');
    homepageCollections.value = Array.isArray(response.data)
      ? response.data
        .map((section: any, index: number) => ({
          key: String(section.key || `section-${index}`),
          label: String(section.label || section.title || 'Collection'),
          title: String(section.title || section.label || 'Collection'),
          imageUrl: section.imageUrl || undefined,
          imageAlt: section.imageAlt || section.title || section.label || 'Collection',
          searchKeyword: section.searchKeyword || section.title || section.label || '',
          items: Array.isArray(section.items) ? section.items : [],
          sortOrder: Number(section.sortOrder || index),
        }))
        .filter((section: any) => section.items.length > 0)
      : [];
  } catch {
    homepageCollections.value = [];
  }
}

function openBrowse() {
  router.push({
    name: 'shopping-browse',
    query: searchQuery.value.trim() ? { q: searchQuery.value.trim() } : undefined,
  });
}

function openKeyword(keyword: string) {
  const value = String(keyword || '').trim();
  router.push({
    name: 'shopping-browse',
    query: value ? { q: value } : undefined,
  });
}

function openProduct(product: any) {
  router.push({ name: 'product-detail', params: { externalId: product.externalId } });
}

function addProduct(product: any) {
  addToCart(product, 1);
  toast.success('Added to cart');
}

async function loadHomepage() {
  await Promise.all([
    loadHeroBanners(),
    loadVisualMenu(),
    loadHotDeals(),
    loadRecommended(),
    loadHomepageCollections(),
  ]);
  startHeroRotation();
}

onMounted(loadHomepage);

onUnmounted(() => {
  stopHeroRotation();
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

.menu-mask {
  overflow: hidden;
}

.menu-track {
  display: flex;
  width: max-content;
  gap: 0;
  padding-bottom: 0.25rem;
  animation: marquee-scroll 46s linear infinite;
  will-change: transform;
}

.menu-track:hover {
  animation-play-state: paused;
}

.menu-item {
  display: flex;
  width: 126px;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  border-radius: 24px;
  padding: 0.15rem 0.75rem;
  transition: transform 180ms ease, filter 180ms ease;
}

.menu-item:hover {
  transform: translateY(-2px);
}

.menu-avatar-wrap {
  position: relative;
  display: inline-flex;
  border-radius: 9999px;
  padding: 4px;
  background: radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.2));
  box-shadow:
    0 14px 28px rgba(15, 23, 42, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -10px 18px rgba(255, 255, 255, 0.15);
}

.menu-avatar {
  display: block;
  height: 82px;
  width: 82px;
  overflow: hidden;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(241, 245, 249, 0.6));
  box-shadow:
    0 10px 16px rgba(15, 23, 42, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.7);
}

@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-16.6667%);
  }
}
</style>
