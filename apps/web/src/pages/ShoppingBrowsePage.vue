<template>
  <div class="min-h-screen bg-[#eef3f9] text-slate-700">
    <main class="mx-auto max-w-[1600px] px-2 py-3 pb-20 sm:px-4 sm:py-4 lg:px-6">
      <!--
      <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400">Browse</p>
            <h1 class="mt-1 text-3xl font-black tracking-tight text-slate-950">Search the local catalog</h1>
            <p class="mt-2 text-sm text-slate-600">Use the admin-uploaded catalog only. All product prices are shown in BDT.</p>
          </div>

          <form class="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row" @submit.prevent="runSearch">
            <div class="flex h-12 flex-1 items-center rounded-full border border-slate-200 bg-white px-4 shadow-sm focus-within:border-rose-300">
              <Search class="h-4 w-4 text-slate-400" />
              <input
                v-model="searchQuery"
                placeholder="Search products, seller names, or keywords"
                class="ml-3 w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" class="h-12 rounded-full px-6">Search</Button>
            <Button type="button" variant="ghost" class="h-12 rounded-full px-6" @click="clearSearch">Reset</Button>
          </form>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            class="rounded-full border px-4 py-2 text-xs font-semibold transition-colors"
            :class="selectedCategory === String(category.slug || category.id || '') ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'"
            @click="toggleCategory(category)"
          >
            {{ category.name }}
          </button>
        </div>
      </section>
    -->

      <section class="mt-4 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:mt-6 sm:rounded-[28px] sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Results</p>
            <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">
              {{ heading }}
            </h2>
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
          No products found. Try another keyword or category.
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
import { recordCategoryIntent, recordProductIntent, recordRecommendationEvent, recordSearchIntent } from '@/utils/shopping-personalization';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { addToCart } = useShoppingCart();

const loading = ref(false);
const searchQuery = ref(String(route.query.q || ''));
const selectedCategory = ref(String(route.query.category || ''));
const selectedMainCategory = ref(String(route.query.mainCategory || ''));
const selectedBrandId = ref(String(route.query.brandId || ''));
const selectedBrandModelId = ref(String(route.query.brandModelId || ''));
const selectedProductTypeId = ref(String(route.query.productTypeId || ''));
const currentPage = ref(Math.max(1, Number(route.query.page || 1)));
const pageSize = ref(24);
const totalPages = ref(1);
const totalCount = ref(0);
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const selectedVendorId = ref(String(route.query.vendorId || ''));

const heading = computed(() => {
  if (selectedVendorId.value) return `Products from vendor ${selectedVendorId.value}`;
  if (searchQuery.value.trim()) return `Search Results`;
  if (selectedBrandModelId.value) return 'Accessories for selected model';
  if (selectedBrandId.value) return 'Accessories for selected brand';
  if (selectedProductTypeId.value) return 'Selected product type';
  if (selectedMainCategory.value) return `Category: ${selectedMainCategory.value}`;
  if (selectedCategory.value) return `Category: ${selectedCategory.value}`;
  return 'All products';
});

const paginationPages = computed(() => {
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(totalPages.value, currentPage.value + 2);
  const pages: number[] = [];
  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
});

async function loadCategories() {
  try {
    const response = await axios.get('/api/public/shopping/categories');
    categories.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    categories.value = [];
  }
}

async function runSearch() {
  loading.value = true;
  try {
    const response = await axios.get('/api/public/shopping/search', {
      params: {
        keyword: searchQuery.value.trim() || undefined,
        category: selectedCategory.value || undefined,
        mainCategory: selectedMainCategory.value || undefined,
        brandId: selectedBrandId.value || undefined,
        brandModelId: selectedBrandModelId.value || undefined,
        productTypeId: selectedProductTypeId.value || undefined,
        vendorId: selectedVendorId.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      },
    });
    products.value = Array.isArray(response.data?.items) ? response.data.items : [];
    totalCount.value = Number(response.data?.totalCount || products.value.length || 0);
    totalPages.value = Number(response.data?.totalPages || Math.max(1, Math.ceil((totalCount.value || products.value.length || 0) / pageSize.value)));
    if (searchQuery.value.trim()) {
      recordSearchIntent(searchQuery.value.trim(), products.value);
    } else if (selectedCategory.value) {
      recordCategoryIntent(selectedCategory.value, selectedCategory.value, products.value);
    }
  } catch {
    products.value = [];
    totalCount.value = 0;
    totalPages.value = 1;
    toast.error('Failed to load products');
  } finally {
    loading.value = false;
  }
}

function openProduct(product: any) {
  recordProductIntent(product);
  router.push({ name: 'product-detail', params: { externalId: product.externalId } });
}

function addProduct(product: any) {
  addToCart(product, 1);
  recordRecommendationEvent('add_to_cart', product, { source: 'browse_card', qty: 1 });
  toast.success('Added to cart');
}

function clearSearch() {
  searchQuery.value = '';
  selectedCategory.value = '';
  selectedMainCategory.value = '';
  selectedBrandId.value = '';
  selectedBrandModelId.value = '';
  selectedProductTypeId.value = '';
  selectedVendorId.value = '';
  currentPage.value = 1;
  router.replace({ name: 'shopping-browse' });
  runSearch();
}

function toggleCategory(category: any) {
  const value = String(category.slug || category.id || '');
  selectedCategory.value = selectedCategory.value === value ? '' : value;
  currentPage.value = 1;
  router.replace({
    name: 'shopping-browse',
    query: {
      q: searchQuery.value.trim() || undefined,
      category: selectedCategory.value || undefined,
      mainCategory: selectedMainCategory.value || undefined,
      brandId: selectedBrandId.value || undefined,
      brandModelId: selectedBrandModelId.value || undefined,
      productTypeId: selectedProductTypeId.value || undefined,
      vendorId: selectedVendorId.value || undefined,
    },
  });
  runSearch();
}

async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  router.replace({
    name: 'shopping-browse',
    query: {
      q: searchQuery.value.trim() || undefined,
      category: selectedCategory.value || undefined,
      mainCategory: selectedMainCategory.value || undefined,
      brandId: selectedBrandId.value || undefined,
      brandModelId: selectedBrandModelId.value || undefined,
      productTypeId: selectedProductTypeId.value || undefined,
      vendorId: selectedVendorId.value || undefined,
      page: String(page),
    },
  });
  await runSearch();
}

watch(
  () => [route.query.q, route.query.category, route.query.mainCategory, route.query.brandId, route.query.brandModelId, route.query.productTypeId, route.query.page, route.query.vendorId].join('|'),
  () => {
    searchQuery.value = String(route.query.q || '');
    selectedCategory.value = String(route.query.category || '');
    selectedMainCategory.value = String(route.query.mainCategory || '');
    selectedBrandId.value = String(route.query.brandId || '');
    selectedBrandModelId.value = String(route.query.brandModelId || '');
    selectedProductTypeId.value = String(route.query.productTypeId || '');
    selectedVendorId.value = String(route.query.vendorId || '');
    currentPage.value = Math.max(1, Number(route.query.page || 1));
    runSearch();
  },
  { immediate: true }
);

onMounted(loadCategories);
</script>
