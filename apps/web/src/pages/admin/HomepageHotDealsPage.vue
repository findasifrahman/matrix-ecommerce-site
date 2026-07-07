<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Homepage Hot Items</h1>
        <p class="mt-1 text-sm text-slate-600">Pin up to two uploaded products for the hot-items strip on /shopping.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="ghost" @click="router.push('/admin/homepage')">Banners</Button>
        <Button variant="ghost" @click="router.push('/admin/homepage-offers')">Featured Deals</Button>
        <Button variant="ghost" @click="router.push('/admin/homepage-visual-menu')">Visual Menu</Button>
        <Button variant="primary" @click="openAddModal">
          <Plus class="mr-2 h-4 w-4" />
          Add Hot Item
        </Button>
      </div>
    </div>

    <Card v-if="loading">
      <CardBody>
        <div class="space-y-4 py-6">
          <SkeletonLoader class="h-24" />
          <SkeletonLoader class="h-24" />
        </div>
      </CardBody>
    </Card>

    <div v-else-if="deals.length === 0" class="py-12 text-center">
      <EmptyState title="No hot items yet" description="Select two uploaded products to feature in the hot-items section.">
        <template #action>
          <Button variant="primary" @click="openAddModal">Add First Item</Button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="space-y-4">
      <Card v-for="deal in deals" :key="deal.id" class="overflow-hidden transition-shadow hover:shadow-md">
        <CardBody class="p-6">
          <div class="flex items-start gap-5">
            <div class="relative h-28 w-32 shrink-0 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100">
              <img
                v-if="deal.product?.coverAsset?.thumbnail_url || deal.product?.coverAsset?.public_url"
                :src="deal.product.coverAsset.thumbnail_url || deal.product.coverAsset.public_url"
                :alt="deal.product.title"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                <ImageIcon class="h-7 w-7" />
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <div class="mb-2 flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <h3 class="truncate text-lg font-semibold text-slate-900">{{ deal.product.title }}</h3>
                  <p class="mt-1 line-clamp-2 text-sm text-slate-600">{{ deal.product.description || 'Uploaded product' }}</p>
                  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span v-if="deal.product.sku" class="rounded-full bg-slate-100 px-2 py-1">SKU {{ deal.product.sku }}</span>
                    <span v-if="deal.product.mainCategory?.name" class="rounded-full bg-slate-100 px-2 py-1">{{ deal.product.mainCategory.name }}</span>
                    <Badge :variant="deal.is_active ? 'success' : 'default'">{{ deal.is_active ? 'Active' : 'Inactive' }}</Badge>
                    <span>Order {{ deal.sort_order }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Button variant="ghost" size="sm" @click="openEditModal(deal)">
                <Edit class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" @click="confirmDelete(deal)">
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <Modal v-model="showModal" :title="editingDeal ? 'Edit Hot Item' : 'Add Hot Item'" size="xl">
      <form class="space-y-5 max-h-[85vh] overflow-y-auto pr-1" @submit.prevent="saveDeal">
        <div class="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div class="space-y-3">
            <Input v-model="productSearch" label="Search uploaded products" placeholder="Search title, SKU, brand, or keyword" />
            <div class="overflow-hidden rounded-[20px] border border-slate-200">
              <div class="max-h-[360px] overflow-auto">
                <button
                  v-for="product in filteredProducts"
                  :key="product.id"
                  type="button"
                  class="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  :class="form.product_id === product.id ? 'bg-rose-50' : 'bg-white'"
                  @click="selectProduct(product)"
                >
                  <img
                    :src="product.coverAsset?.thumbnail_url || product.coverAsset?.public_url || placeholderImage"
                    :alt="product.title"
                    class="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-semibold text-slate-900">{{ product.title }}</div>
                    <div class="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span v-if="product.sku" class="rounded-full bg-slate-100 px-2 py-0.5">SKU {{ product.sku }}</span>
                      <span v-if="product.mainCategory?.name" class="rounded-full bg-slate-100 px-2 py-0.5">{{ product.mainCategory.name }}</span>
                      <span class="rounded-full bg-slate-100 px-2 py-0.5">{{ formatMoney(product.price, product.currency) }}</span>
                    </div>
                  </div>
                  <Badge v-if="form.product_id === product.id" variant="success">Selected</Badge>
                </button>
                <div v-if="filteredProducts.length === 0" class="px-4 py-10 text-center text-sm text-slate-500">
                  No products match your search.
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
              <p class="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Selected product</p>
              <div v-if="selectedProduct" class="mt-3 flex items-start gap-3">
                <img
                  :src="selectedProduct.coverAsset?.thumbnail_url || selectedProduct.coverAsset?.public_url || placeholderImage"
                  :alt="selectedProduct.title"
                  class="h-20 w-20 rounded-2xl border border-slate-200 object-cover"
                />
                <div class="min-w-0">
                  <div class="truncate text-base font-semibold text-slate-900">{{ selectedProduct.title }}</div>
                  <div class="mt-1 text-sm text-slate-600">{{ selectedProduct.description || 'Uploaded product' }}</div>
                  <div class="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span class="rounded-full bg-white px-2 py-0.5">Price {{ formatMoney(selectedProduct.price, selectedProduct.currency) }}</span>
                    <span v-if="selectedProduct.sku" class="rounded-full bg-white px-2 py-0.5">SKU {{ selectedProduct.sku }}</span>
                  </div>
                </div>
              </div>
              <EmptyState
                v-else
                title="Pick one product"
                description="Choose an uploaded product from the list on the left."
              />
            </div>

            <Input v-model.number="form.sort_order" type="number" label="Sort order" />
            <label class="flex items-center gap-3 rounded-[16px] border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-teal-600" />
              Active
            </label>
            <p class="text-xs leading-5 text-slate-500">
              Only two hot items can be active at a time. If both slots are filled, deactivate one before adding another.
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="ghost" type="button" @click="closeModal">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save Deal</Button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-model="deleteConfirmOpen"
      title="Delete hot item"
      :message="deleteConfirmMessage"
      confirm-text="Delete"
      confirm-variant="danger"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@matrix-ecommerce/ui';
import {
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  SkeletonLoader,
} from '@matrix-ecommerce/ui';
import { Edit, ImageIcon, Plus, Trash2 } from 'lucide-vue-next';

const router = useRouter();
const toast = useToast();
const placeholderImage = 'https://placehold.co/160x160/f8fafc/0f172a?text=Deal';

const deals = ref<any[]>([]);
const products = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const showModal = ref(false);
const editingDeal = ref<any>(null);
const deleteConfirmOpen = ref(false);
const deleteTarget = ref<any>(null);
const productSearch = ref('');

const form = ref({
  product_id: '',
  sort_order: 0,
  is_active: true,
});

const selectedProduct = computed(() => products.value.find((product: any) => product.id === form.value.product_id) || null);
const filteredProducts = computed(() => {
  const keyword = productSearch.value.trim().toLowerCase();
  if (!keyword) return products.value;
  return products.value.filter((product: any) => {
    const haystack = [
      product.title,
      product.sku,
      product.brand,
      product.vendor_name,
      product.mainCategory?.name,
      product.productType?.name,
    ].join(' ').toLowerCase();
    return haystack.includes(keyword);
  });
});

function formatMoney(value: number | string | null | undefined, currency = 'BDT'): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return `${currency} 0`;
  return `${currency} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)}`;
}

async function loadDeals() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/homepage/hot-deals');
    deals.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to load homepage hot items:', error);
    toast.error('Failed to load hot items');
  } finally {
    loading.value = false;
  }
}

async function loadProducts(search?: string) {
  try {
    const response = await axios.get('/api/admin/products', {
      params: {
        page: 1,
        limit: 100,
        status: 'published',
        source_kind: 'all',
        search: search || undefined,
      },
    });
    products.value = Array.isArray(response.data?.products) ? response.data.products : [];
  } catch (error) {
    console.error('Failed to load products for hot items:', error);
    toast.error('Failed to load products');
  }
}

function resetForm() {
  form.value = {
    product_id: '',
    sort_order: (deals.value.length || 0) + 1,
    is_active: true,
  };
}

async function openAddModal() {
  editingDeal.value = null;
  productSearch.value = '';
  resetForm();
  await loadProducts();
  showModal.value = true;
}

async function openEditModal(deal: any) {
  editingDeal.value = deal;
  productSearch.value = deal.product?.title || '';
  form.value = {
    product_id: deal.product_id || deal.product?.id || '',
    sort_order: Number(deal.sort_order || 0),
    is_active: !!deal.is_active,
  };
  await loadProducts(productSearch.value);
  if (deal.product && !products.value.find((product: any) => product.id === deal.product.id)) {
    products.value.unshift(deal.product);
  }
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingDeal.value = null;
}

function selectProduct(product: any) {
  form.value.product_id = product.id;
}

async function saveDeal() {
  if (!form.value.product_id) {
    toast.error('Please select a product.');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      product_id: form.value.product_id,
      sort_order: Number(form.value.sort_order || 0),
      is_active: !!form.value.is_active,
    };

    if (editingDeal.value) {
      await axios.put(`/api/admin/homepage/hot-deals/${editingDeal.value.id}`, payload);
      toast.success('Hot deal updated');
    } else {
      await axios.post('/api/admin/homepage/hot-deals', payload);
      toast.success('Hot deal created');
    }

    closeModal();
    await loadDeals();
  } catch (error: any) {
    console.error('Failed to save hot item:', error);
    toast.error(error.response?.data?.error || 'Failed to save hot item');
  } finally {
    saving.value = false;
  }
}

function confirmDelete(deal: any) {
  deleteTarget.value = deal;
  deleteConfirmOpen.value = true;
}

const deleteConfirmMessage = computed(() => `Delete "${deleteTarget.value?.product?.title || 'this hot item'}" from the homepage?`);

async function handleConfirmDelete() {
  if (!deleteTarget.value?.id) return;
  try {
    await axios.delete(`/api/admin/homepage/hot-deals/${deleteTarget.value.id}`);
    toast.success('Hot deal deleted');
    deleteConfirmOpen.value = false;
    deleteTarget.value = null;
    await loadDeals();
  } catch (error: any) {
    console.error('Failed to delete hot item:', error);
    toast.error(error.response?.data?.error || 'Failed to delete hot item');
  }
}

watch(productSearch, async (value) => {
  if (!showModal.value) return;
  await loadProducts(value);
});

onMounted(loadDeals);
</script>
