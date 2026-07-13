<template>
  <div class="min-h-screen bg-[#eef3f9] text-slate-700">
    <main class="mx-auto max-w-[1600px] px-2 py-3 pb-20 sm:px-4 sm:py-4 lg:px-6">
      <section class="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400">Storefront</p>
            <h1 class="mt-1 text-3xl font-black tracking-tight text-slate-950">{{ shopTitle }}</h1>
            <p class="mt-2 text-sm text-slate-600">Search inside one seller storefront, backed by admin-uploaded products only.</p>
          </div>

          <form class="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row" @submit.prevent="runSearch">
            <div class="flex h-12 flex-1 items-center rounded-full border border-slate-200 bg-white px-4 shadow-sm focus-within:border-rose-300">
              <Search class="h-4 w-4 text-slate-400" />
              <input
                v-model="searchQuery"
                placeholder="Search within this storefront"
                class="ml-3 w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" class="h-12 rounded-full px-6">Search shop</Button>
            <Button type="button" variant="ghost" class="h-12 rounded-full px-6" @click="clearSearch">Reset</Button>
          </form>
        </div>
      </section>

      <section class="mt-4 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:mt-6 sm:rounded-[28px] sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Products</p>
            <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">{{ heading }}</h2>
          </div>
          <span class="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold text-rose-700">{{ totalCount }} items</span>
        </div>

        <div v-if="loading" class="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <div v-for="i in 8" :key="i" class="h-56 animate-pulse rounded-[18px] bg-slate-100 sm:h-80 sm:rounded-[24px]" />
        </div>

        <div v-else-if="products.length > 0" class="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <ProductCard
            v-for="product in products"
            :key="product.externalId"
            :product="product"
            @click="openProduct"
            @request-buy="addProduct"
          />
        </div>

        <div v-else class="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          No products found in this storefront.
        </div>

        <div v-if="totalPages > 1" class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div class="text-xs text-slate-500">Page {{ currentPage }} of {{ totalPages }}</div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="currentPage <= 1 || loading"
              @click="goToPage(currentPage - 1)"
            >
              Prev
            </button>
            <button
              v-for="page in paginationPages"
              :key="page"
              class="min-w-9 rounded-full px-3 py-1.5 text-xs font-semibold"
              :class="page === currentPage ? 'bg-rose-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
            <button
              class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="currentPage >= totalPages || loading"
              @click="goToPage(currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { Button, useToast } from '@matrix-ecommerce/ui';
import { Search } from 'lucide-vue-next';
import ProductCard from '@/components/shopping/ProductCard.vue';
import { useShoppingCart } from '@/composables/useShoppingCart';
import { recordProductIntent, recordRecommendationEvent } from '@/utils/shopping-personalization';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { addToCart } = useShoppingCart();

const loading = ref(false);
const searchQuery = ref(String(route.query.q || ''));
const selectedCategory = ref(String(route.query.category || ''));
const currentPage = ref(Math.max(1, Number(route.query.page || 1)));
const pageSize = ref(24);
const totalPages = ref(1);
const totalCount = ref(0);
const products = ref<any[]>([]);
const vendor = ref<any>(null);

const vendorId = computed(() => String(route.params.vendorId || '').trim());
const shopTitle = computed(() => vendor.value?.name || vendorId.value || 'Storefront');
const heading = computed(() => {
  if (searchQuery.value.trim()) return `Search results for "${searchQuery.value.trim()}"`;
  if (selectedCategory.value) return `Category: ${selectedCategory.value}`;
  return 'All storefront products';
});
const paginationPages = computed(() => {
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(totalPages.value, currentPage.value + 2);
  const pages: number[] = [];
  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
});

function openProduct(product: any) {
  recordProductIntent(product);
  router.push({ name: 'product-detail', params: { externalId: product.externalId } });
}

function addProduct(product: any) {
  addToCart(product, 1);
  recordRecommendationEvent('add_to_cart', product, { source: 'shop_card', qty: 1 });
  toast.success('Added to cart');
}

async function runSearch() {
  if (!vendorId.value) return;
  loading.value = true;
  try {
    const response = await axios.get(`/api/public/shopping/vendor/${encodeURIComponent(vendorId.value)}`, {
      params: {
        q: searchQuery.value.trim() || undefined,
        category: selectedCategory.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      },
    });
    vendor.value = response.data?.vendor || null;
    products.value = Array.isArray(response.data?.products?.items) ? response.data.products.items : Array.isArray(response.data?.products) ? response.data.products : [];
    totalCount.value = Number(response.data?.products?.totalCount || products.value.length || 0);
    totalPages.value = Number(response.data?.products?.totalPages || Math.max(1, Math.ceil((totalCount.value || products.value.length || 0) / pageSize.value)));
  } catch {
    products.value = [];
    totalCount.value = 0;
    totalPages.value = 1;
    toast.error('Failed to load storefront products');
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  searchQuery.value = '';
  selectedCategory.value = '';
  currentPage.value = 1;
  router.replace({ name: 'shopping-shop', params: { vendorId: vendorId.value } });
  runSearch();
}

async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  router.replace({
    name: 'shopping-shop',
    params: { vendorId: vendorId.value },
    query: {
      q: searchQuery.value.trim() || undefined,
      category: selectedCategory.value || undefined,
      page: String(page),
    },
  });
  await runSearch();
}

watch(
  () => [route.params.vendorId, route.query.q, route.query.category, route.query.page].join('|'),
  () => {
    searchQuery.value = String(route.query.q || '');
    selectedCategory.value = String(route.query.category || '');
    currentPage.value = Math.max(1, Number(route.query.page || 1));
    runSearch();
  },
  { immediate: true }
);

onMounted(() => {
  if (vendorId.value) runSearch();
});
</script>
