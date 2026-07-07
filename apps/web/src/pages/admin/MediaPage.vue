<template>
  <div>
    <PageHeader title="Media Library">
      <template #actions>
        <Button variant="primary" @click="showUploadModal = true">
          <Upload class="w-4 h-4 mr-2" />
          Upload Media
        </Button>
        <Button 
          v-if="selectedMedia.length > 0"
          variant="danger" 
          @click="showBulkDeleteConfirm = true"
        >
          <Trash2 class="w-4 h-4 mr-2" />
          Delete Selected ({{ selectedMedia.length }})
        </Button>
      </template>
    </PageHeader>
    
    <Card v-if="r2NotConfigured" class="mb-6">
      <CardBody>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p class="text-amber-800">
            <strong>R2 not configured:</strong> Media upload requires Cloudflare R2 credentials.
            Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET in your .env file.
          </p>
        </div>
      </CardBody>
    </Card>

    <!-- Filters -->
    <Card class="mb-6">
      <CardBody>
        <div class="flex flex-wrap gap-4 items-end">
          <div class="flex-1 min-w-[200px]">
            <Input
              v-model="searchQuery"
              placeholder="Search by filename..."
              @input="handleSearch"
            >
              <template #prefix>
                <Search class="w-4 h-4 text-slate-400" />
              </template>
            </Input>
          </div>
          <div class="w-48">
            <select
              v-model="searchBy"
              @change="handleSearchByChange"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 transition-colors bg-white"
            >
              <option value="all">Search everything</option>
              <option value="filename">Filename / URL</option>
              <option value="main_category">Main category</option>
              <option value="brand">Brand</option>
              <option value="model">Model</option>
              <option value="product_type">Product type</option>
            </select>
          </div>
          <div class="w-48">
            <select
              v-model="selectedMainCategoryId"
              @change="handleCategoryChange"
              :disabled="loadingTaxonomy"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white"
            >
              <option value="">All main categories</option>
              <option v-for="item in mainCategories" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>
          <div class="w-48">
            <select
              v-model="selectedBrandId"
              @change="handleCategoryChange"
              :disabled="loadingTaxonomy"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white"
            >
              <option value="">All brands</option>
              <option v-for="brand in filterBrandOptions" :key="brand.value" :value="brand.value">
                {{ brand.label }}
              </option>
            </select>
          </div>
          <div class="w-48">
            <select
              v-model="selectedBrandModelId"
              @change="handleCategoryChange"
              :disabled="loadingTaxonomy"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white"
            >
              <option value="">All models</option>
              <option v-for="model in filterBrandModelOptions" :key="model.value" :value="model.value">
                {{ model.label }}
              </option>
            </select>
          </div>
          <div class="w-48">
            <select
              v-model="selectedProductTypeId"
              @change="handleCategoryChange"
              :disabled="loadingTaxonomy"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white"
            >
              <option value="">All Product Types</option>
              <option value="__GENERAL__">General</option>
              <option v-for="type in filteredProductTypes" :key="type.id" :value="type.id">
                {{ type.mainCategory?.name ? `${type.mainCategory.name} / ${type.name}` : type.name }}
              </option>
            </select>
          </div>
          <Button variant="ghost" @click="clearFilters">
            <X class="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardBody>
    </Card>

    <!-- Media Grid -->
    <Card>
      <CardBody>
        <div v-if="media.length === 0 && !loading" class="text-center py-12">
          <p class="text-slate-600 mb-4">No media found</p>
          <Button variant="primary" @click="showUploadModal = true">Upload Media</Button>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="item in media"
            :key="item.id"
            class="relative group cursor-pointer border-2 rounded-lg overflow-hidden"
            :class="selectedMedia.includes(item.id) ? 'border-teal-500' : 'border-slate-200'"
            @click="toggleSelect(item.id)"
          >
            <!-- Thumbnail or full image -->
            <video
              v-if="isVideoItem(item)"
              :src="item.public_url"
              class="w-full h-32 object-cover"
              muted
              playsinline
              preload="metadata"
            />
            <img
              v-else
              :src="item.thumbnail_url || item.public_url"
              :alt="item.r2_key"
              class="w-full h-32 object-cover"
              loading="lazy"
            />
            <!-- Selection checkbox -->
            <div class="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                :checked="selectedMedia.includes(item.id)"
                @click.stop="toggleSelect(item.id)"
                class="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
            </div>
            <!-- Always visible action buttons -->
            <div class="absolute top-2 right-2 z-10 flex gap-1">
              <button
                type="button"
                class="bg-teal-500 hover:bg-teal-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                @click.stop="viewMedia(item)"
                title="View/Edit"
              >
                <Eye class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="bg-slate-700 hover:bg-slate-800 text-white rounded-full p-1.5 shadow-lg transition-colors"
                @click.stop="copyUrl(item.public_url)"
                title="Copy URL"
              >
                <Copy class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                @click.stop="deleteMedia(item.id)"
                title="Delete"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
            <!-- Info badge - always visible with meaningful name -->
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 text-white text-xs">
              <div class="font-medium truncate">{{ getMediaDisplayName(item) }}</div>
              <div class="text-xs opacity-75 mt-0.5">{{ formatSize(item.size) }}</div>
              <div v-if="item.category" class="mt-1">
                <Badge size="sm" variant="secondary">{{ item.category }}</Badge>
              </div>
            </div>
          </div>
        </div>
        <Pagination
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          @update:current-page="handlePageChange"
        />
      </CardBody>
    </Card>

    <!-- Upload Modal -->
    <Modal v-model="showUploadModal" title="Upload Media" size="lg">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Select image or video
          </label>
          <input
            ref="fileInput"
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime,video/*"
            class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:text-white hover:file:bg-teal-700"
            @change="handleFileSelect"
          />
          <p v-if="fileError" class="text-red-600 text-sm mt-1">{{ fileError }}</p>
          <p v-if="selectedFile" class="text-sm text-slate-600 mt-1">
            File: {{ selectedFile.name }} ({{ formatSize(selectedFile.size) }})
          </p>
          <p class="text-xs text-slate-500 mt-1">Images: max 3.5MB. Videos: max 5MB.</p>
        </div>
        
        <div v-if="previewUrl" class="border border-slate-200 rounded-lg p-2">
          <video
            v-if="selectedFile && selectedFile.type.startsWith('video/')"
            :src="previewUrl"
            class="w-full h-48 rounded object-contain bg-slate-950"
            controls
            muted
            playsinline
          />
          <img
            v-else
            :src="previewUrl"
            alt="Preview"
            class="w-full h-48 object-contain rounded"
          />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Main category</label>
            <select v-model="uploadForm.main_category_id" :disabled="loadingTaxonomy" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white">
              <option value="">Select main category</option>
              <option v-for="item in mainCategories" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Product type</label>
            <select v-model="uploadForm.product_type_id" :disabled="loadingTaxonomy" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white">
              <option value="">Select product type</option>
              <option value="__GENERAL__">General</option>
              <option v-for="type in uploadProductTypeOptions" :key="type.value" :value="type.value">{{ type.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Brand</label>
            <select v-model="uploadForm.brand_id" :disabled="loadingTaxonomy || uploadForm.product_type_id === '__GENERAL__'" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white">
              <option v-for="brand in uploadBrandOptions" :key="brand.value" :value="brand.value">{{ brand.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Model</label>
            <select v-model="uploadForm.brand_model_id" :disabled="loadingTaxonomy || uploadForm.product_type_id === '__GENERAL__'" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white">
              <option v-for="model in uploadBrandModelOptions" :key="model.value" :value="model.value">{{ model.label }}</option>
            </select>
          </div>
        </div>
        <p class="text-xs text-slate-500">
          Media uploads must be assigned to the same taxonomy path used by products. Use <strong>General</strong> when the file is not brand/model-specific.
        </p>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Tags (Optional, comma-separated)
          </label>
          <Input
            v-model="uploadTags"
            placeholder="e.g., dhaka, hotel, exterior"
          />
          <p class="text-xs text-slate-500 mt-1">Separate tags with commas</p>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" @click="resetUploadForm">Cancel</Button>
          <Button
            variant="primary"
            :loading="uploading"
            :disabled="!selectedFile || !!fileError"
            @click="handleUpload"
          >
            Upload
          </Button>
        </div>
      </div>
    </Modal>

    <!-- View/Edit Media Modal -->
    <Modal v-model="showEditModal" :title="editingMedia ? 'Edit Media Metadata' : 'View Media'" size="lg">
        <div v-if="editingMedia" class="space-y-4">
        <div class="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <video
            v-if="isVideoItem(editingMedia)"
            :src="editingMedia.public_url"
            class="w-full h-64 object-contain rounded bg-slate-950"
            controls
            muted
            playsinline
          />
          <img
            v-else
            :src="editingMedia.thumbnail_url || editingMedia.public_url"
            :alt="editingMedia.r2_key"
            class="w-full h-64 object-contain rounded"
          />
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label class="text-slate-600 font-medium">File Name</label>
            <p class="text-slate-900 mt-1 break-all">{{ editingMedia.r2_key.split('/').pop() }}</p>
          </div>
          <div>
            <label class="text-slate-600 font-medium">Size</label>
            <p class="text-slate-900 mt-1">{{ formatSize(editingMedia.size) }}</p>
          </div>
          <div>
            <label class="text-slate-600 font-medium">Uploaded</label>
            <p class="text-slate-900 mt-1">{{ new Date(editingMedia.created_at).toLocaleString() }}</p>
          </div>
          <div>
            <label class="text-slate-600 font-medium">Uploaded By</label>
            <p class="text-slate-900 mt-1">{{ editingMedia.uploader?.email || 'Unknown' }}</p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Main category</label>
            <select v-model="editForm.main_category_id" :disabled="loadingTaxonomy" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white">
              <option value="">Select main category</option>
              <option v-for="item in mainCategories" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Product type</label>
            <select v-model="editForm.product_type_id" :disabled="loadingTaxonomy" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white">
              <option value="">Select product type</option>
              <option value="__GENERAL__">General</option>
              <option v-for="type in editProductTypeOptions" :key="type.value" :value="type.value">{{ type.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Brand</label>
            <select v-model="editForm.brand_id" :disabled="loadingTaxonomy || editForm.product_type_id === '__GENERAL__'" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white">
              <option v-for="brand in editBrandOptions" :key="brand.value" :value="brand.value">{{ brand.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Model</label>
            <select v-model="editForm.brand_model_id" :disabled="loadingTaxonomy || editForm.product_type_id === '__GENERAL__'" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white">
              <option v-for="model in editBrandModelOptions" :key="model.value" :value="model.value">{{ model.label }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Title (Optional)
          </label>
          <Input
            v-model="editForm.title"
            placeholder="e.g., Canton Tower Exterior"
          />
          <p class="text-xs text-slate-500 mt-1">A descriptive name for this image</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Tags (comma-separated)
          </label>
          <Input
            v-model="editForm.tagsText"
            placeholder="e.g., Dhaka, hotel, exterior"
          />
          <p class="text-xs text-slate-500 mt-1">Separate tags with commas</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Public URL
          </label>
          <div class="flex gap-2">
            <Input
              :value="editingMedia.public_url"
              readonly
              class="flex-1"
            />
            <Button variant="ghost" size="sm" @click="copyUrl(editingMedia.public_url)">
              <Copy class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" @click="showEditModal = false">Cancel</Button>
          <Button variant="primary" :loading="savingMetadata" @click="saveMetadata">
            <Edit class="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>

    <!-- Bulk Delete Confirm -->
    <ConfirmDialog
      v-model="showBulkDeleteConfirm"
      title="Delete Selected Media"
      :message="`Are you sure you want to delete ${selectedMedia.length} media item(s)? This action cannot be undone.`"
      confirm-text="Delete"
      confirm-variant="danger"
      @confirm="handleBulkDelete"
    />

    <ConfirmDialog
      v-model="showSingleDeleteConfirm"
      title="Delete media"
      message="Are you sure you want to delete this media? This action cannot be undone."
      confirm-text="Delete"
      confirm-variant="danger"
      @confirm="handleSingleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@matrix-ecommerce/ui';
import { 
  PageHeader, 
  Card, 
  CardBody, 
  Button, 
  Modal, 
  Input, 
  Select,
  FilterBar, 
  Pagination,
  Badge,
  ConfirmDialog
} from '@matrix-ecommerce/ui';
import { Upload, Trash2, Search, X, Copy, Eye, Edit } from 'lucide-vue-next';

const MAX_IMAGE_FILE_SIZE = 3.5 * 1024 * 1024;
const MAX_VIDEO_FILE_SIZE = 5 * 1024 * 1024;
const SEARCH_DEBOUNCE_MS = 300;

const media = ref<any[]>([]);
const searchQuery = ref('');
const searchBy = ref('all');
const selectedMainCategoryId = ref('');
const selectedBrandId = ref('');
const selectedBrandModelId = ref('');
const selectedProductTypeId = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const total = ref(0);
const showUploadModal = ref(false);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string>('');
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const loading = ref(false);
const loadingTaxonomy = ref(false);
const r2NotConfigured = ref(false);
const fileError = ref('');
const uploadTags = ref('');
const selectedMedia = ref<string[]>([]);
const showBulkDeleteConfirm = ref(false);
const showSingleDeleteConfirm = ref(false);
const deleteMediaId = ref('');
const mainCategories = ref<any[]>([]);
const brands = ref<any[]>([]);
const productTypes = ref<any[]>([]);
const showEditModal = ref(false);
const editingMedia = ref<any>(null);
const savingMetadata = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;
const uploadForm = reactive({
  main_category_id: '',
  brand_id: '__NONE__',
  brand_model_id: '__NONE__',
  product_type_id: '',
});
const editForm = reactive({
  main_category_id: '',
  brand_id: '__NONE__',
  brand_model_id: '__NONE__',
  product_type_id: '',
  category: '',
  tagsText: '',
  title: '',
});
const toast = useToast();

const filterBrandOptions = computed(() => brandsForMainCategory(selectedMainCategoryId.value, false));
const filterBrandModelOptions = computed(() => brandModelsForBrand(selectedBrandId.value, false));
const filteredProductTypes = computed(() =>
  productTypes.value.filter((type) => !selectedMainCategoryId.value || type.main_category_id === selectedMainCategoryId.value),
);
const uploadBrandOptions = computed(() => brandsForMainCategory(uploadForm.main_category_id, true));
const uploadBrandModelOptions = computed(() => brandModelsForBrand(uploadForm.brand_id, true));
const uploadProductTypeOptions = computed(() => productTypeOptions(uploadForm.main_category_id));
const editBrandOptions = computed(() => brandsForMainCategory(editForm.main_category_id, true));
const editBrandModelOptions = computed(() => brandModelsForBrand(editForm.brand_id, true));
const editProductTypeOptions = computed(() => productTypeOptions(editForm.main_category_id));

function brandsForMainCategory(mainCategoryId: string, includeGeneral: boolean) {
  const matched = brands.value
    .filter((brand) =>
      !mainCategoryId || (Array.isArray(brand.categoryLinks) && brand.categoryLinks.some((link: any) => link.main_category_id === mainCategoryId)),
    )
    .map((brand) => ({ value: brand.id, label: brand.name }));

  return includeGeneral
    ? [{ value: '__NONE__', label: 'No brand (General)' }, ...matched]
    : matched;
}

function brandModelsForBrand(brandId: string, includeGeneral: boolean) {
  const brand = brands.value.find((item) => item.id === brandId);
  const matched = Array.isArray(brand?.models) ? brand.models.map((model: any) => ({ value: model.id, label: model.name })) : [];
  return includeGeneral
    ? [{ value: '__NONE__', label: 'No model (General)' }, ...matched]
    : matched;
}

function productTypeOptions(mainCategoryId: string) {
  return productTypes.value
    .filter((type) => !mainCategoryId || type.main_category_id === mainCategoryId)
    .map((type) => ({
      value: type.id,
      label: type.mainCategory?.name ? `${type.mainCategory.name} / ${type.name}` : type.name,
    }));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isVideoItem(item: any) {
  return String(item?.mime_type || '').startsWith('video/');
}

function getMediaDisplayName(item: any): string {
  // 1. Try title (extracted from tags by API)
  if (item.title) {
    return item.title;
  }
  
  // 2. Try first tag (if available and not a title tag)
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
    const firstTag = item.tags[0];
    if (firstTag && !firstTag.startsWith('title:')) {
      return firstTag;
    }
  }
  
  // 3. Show category if available
  if (item.category) {
    return `${item.category} image`;
  }
  
  // 4. Fallback to a cleaned filename (remove timestamp prefix if present)
  const filename = item.r2_key.split('/').pop() || 'Untitled';
  // Remove timestamp prefix like "1766866776362-" if present
  const cleaned = filename.replace(/^\d+-/, '');
  return cleaned || 'Untitled';
}

async function loadMedia() {
  loading.value = true;
  try {
    const params: any = { page: currentPage.value, limit: 24 };
    if (searchQuery.value) params.search = searchQuery.value;
    if (searchBy.value && searchBy.value !== 'all') params.search_by = searchBy.value;
    if (selectedMainCategoryId.value) params.main_category_id = selectedMainCategoryId.value;
    if (selectedBrandId.value) params.brand_id = selectedBrandId.value;
    if (selectedBrandModelId.value) params.brand_model_id = selectedBrandModelId.value;
    if (selectedProductTypeId.value === '__GENERAL__') {
      params.general = '1';
      params.category = 'general';
    } else if (selectedProductTypeId.value) {
      params.product_type_id = selectedProductTypeId.value;
      const type = productTypes.value.find((item) => item.id === selectedProductTypeId.value);
      if (type?.slug) params.category = type.slug;
    }
    
    const response = await axios.get('/api/admin/media', { params });
    
    if (Array.isArray(response.data)) {
      media.value = response.data;
      totalPages.value = Math.ceil(response.data.length / 24);
      total.value = response.data.length;
    } else {
      media.value = response.data.media || [];
      totalPages.value = response.data.totalPages || 1;
      total.value = response.data.total || 0;
    }
  } catch (error: any) {
    if (error.response?.status === 500 && error.response?.data?.error?.includes('R2')) {
      r2NotConfigured.value = true;
    }
    console.error('Failed to load media', error);
    toast.error('Failed to load media');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void loadMedia();
  }, SEARCH_DEBOUNCE_MS);
}

function handleSearchByChange() {
  currentPage.value = 1;
  void loadMedia();
}

function handleCategoryChange() {
  currentPage.value = 1;
  loadMedia();
}

function clearFilters() {
  searchQuery.value = '';
  searchBy.value = 'all';
  selectedMainCategoryId.value = '';
  selectedBrandId.value = '';
  selectedBrandModelId.value = '';
  selectedProductTypeId.value = '';
  currentPage.value = 1;
  void loadMedia();
}

function handlePageChange(page: number) {
  currentPage.value = page;
  void loadMedia();
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  fileError.value = '';
  
  if (file) {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      fileError.value = 'File must be an image or video';
      selectedFile.value = null;
      previewUrl.value = '';
      return;
    }

    const maxAllowedSize = isVideo ? MAX_VIDEO_FILE_SIZE : MAX_IMAGE_FILE_SIZE;
    if (file.size > maxAllowedSize) {
      fileError.value = `${isVideo ? 'Video' : 'Image'} size (${formatSize(file.size)}) exceeds maximum of ${formatSize(maxAllowedSize)}`;
      selectedFile.value = null;
      previewUrl.value = '';
      return;
    }
    
    selectedFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
  }
}

async function handleUpload() {
  if (!selectedFile.value || fileError.value) return;
  if (!uploadForm.main_category_id) {
    toast.error('Select a main category');
    return;
  }
  if (!uploadForm.product_type_id) {
    toast.error('Select a product type or General');
    return;
  }
  if (uploadForm.product_type_id !== '__GENERAL__' && uploadForm.brand_id === '__NONE__') {
    toast.error('Select a brand or choose General');
    return;
  }
  if (uploadForm.product_type_id !== '__GENERAL__' && uploadForm.brand_model_id === '__NONE__') {
    toast.error('Select a model or choose General');
    return;
  }
  
  uploading.value = true;
  try {
    console.log('[MediaPage] Starting upload for file:', selectedFile.value.name);
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('main_category_id', uploadForm.main_category_id);
    formData.append('product_type_id', uploadForm.product_type_id);
    if (uploadForm.product_type_id === '__GENERAL__') {
      formData.append('category', 'general');
    } else {
      const type = productTypes.value.find((item) => item.id === uploadForm.product_type_id);
      if (type?.slug) formData.append('category', type.slug);
      if (uploadForm.brand_id !== '__NONE__') {
        formData.append('brand_id', uploadForm.brand_id);
      }
      if (uploadForm.brand_model_id !== '__NONE__') {
        formData.append('brand_model_id', uploadForm.brand_model_id);
      }
    }
    if (uploadTags.value) {
      formData.append('tags', uploadTags.value);
    }

    console.log('[MediaPage] Sending upload request...');
    const response = await axios.post('/api/admin/media/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('[MediaPage] Upload progress:', percentCompleted + '%');
        }
      },
    });

    console.log('[MediaPage] Upload successful:', response.data);
    toast.success(isVideoItem(response.data) ? 'Video uploaded successfully.' : 'Image uploaded successfully! Thumbnail generated automatically.');
    resetUploadForm();
    await loadMedia();
  } catch (error: any) {
    console.error('[MediaPage] Upload error:', error);
    console.error('[MediaPage] Error response:', error.response?.data);
    const errorMsg = error.response?.data?.error || error.message || 'Failed to upload media';
    toast.error(errorMsg);
    
    // Show more details in development
    if (error.response?.data?.details) {
      console.error('[MediaPage] Error details:', error.response.data.details);
    }
  } finally {
    uploading.value = false;
  }
}

function resetUploadForm() {
  showUploadModal.value = false;
  selectedFile.value = null;
  previewUrl.value = '';
  fileError.value = '';
  uploadForm.main_category_id = '';
  uploadForm.brand_id = '__NONE__';
  uploadForm.brand_model_id = '__NONE__';
  uploadForm.product_type_id = '';
  uploadTags.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

function toggleSelect(id: string) {
  const index = selectedMedia.value.indexOf(id);
  if (index > -1) {
    selectedMedia.value.splice(index, 1);
  } else {
    selectedMedia.value.push(id);
  }
}

async function deleteMedia(id: string) {
  deleteMediaId.value = id;
  showSingleDeleteConfirm.value = true;
}

async function handleSingleDelete() {
  if (!deleteMediaId.value) return;
  try {
    await axios.delete(`/api/admin/media/${deleteMediaId.value}`);
    toast.success('Media deleted successfully');
    await loadMedia();
    // Remove from selection if selected
    const index = selectedMedia.value.indexOf(deleteMediaId.value);
    if (index > -1) {
      selectedMedia.value.splice(index, 1);
    }
    showSingleDeleteConfirm.value = false;
    deleteMediaId.value = '';
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete media');
  }
}

async function handleBulkDelete() {
  if (selectedMedia.value.length === 0) return;
  
  try {
    await axios.delete('/api/admin/media/bulk', {
      data: { ids: selectedMedia.value },
    });
    toast.success(`Deleted ${selectedMedia.value.length} media item(s)`);
    selectedMedia.value = [];
    showBulkDeleteConfirm.value = false;
    await loadMedia();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete media');
  }
}

function copyUrl(url: string) {
  navigator.clipboard.writeText(url);
  toast.success('URL copied to clipboard');
}

async function viewMedia(item: any) {
  try {
    // Fetch full media details
    const response = await axios.get(`/api/admin/media/${item.id}`);
    editingMedia.value = response.data;
    
    // Extract title from tags (if stored as "title:value")
    const tags = (editingMedia.value.tags as string[]) || [];
    const titleTag = tags.find(t => t.startsWith('title:'));
    const title = titleTag ? titleTag.replace('title:', '') : '';
    const otherTags = tags.filter(t => !t.startsWith('title:'));
    
    editForm.main_category_id = editingMedia.value.main_category_id || '';
    editForm.brand_id = editingMedia.value.brand_id || '__NONE__';
    editForm.brand_model_id = editingMedia.value.brand_model_id || '__NONE__';
    editForm.product_type_id = editingMedia.value.product_type_id || (editingMedia.value.category === 'general' ? '__GENERAL__' : '');
    editForm.category = editingMedia.value.category || '';
    editForm.tagsText = otherTags.join(', ');
    editForm.title = title;
    
    showEditModal.value = true;
  } catch (error: any) {
    toast.error('Failed to load media details');
    console.error(error);
  }
}

async function saveMetadata() {
  if (!editingMedia.value) return;
  if (!editForm.main_category_id) {
    toast.error('Select a main category');
    return;
  }
  if (!editForm.product_type_id) {
    toast.error('Select a product type or General');
    return;
  }
  
  savingMetadata.value = true;
  try {
    const tags = editForm.tagsText
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    await axios.put(`/api/admin/media/${editingMedia.value.id}`, {
      main_category_id: editForm.main_category_id,
      brand_id: editForm.product_type_id === '__GENERAL__' || editForm.brand_id === '__NONE__' ? null : editForm.brand_id,
      brand_model_id: editForm.product_type_id === '__GENERAL__' || editForm.brand_model_id === '__NONE__' ? null : editForm.brand_model_id,
      product_type_id: editForm.product_type_id,
      category: editForm.product_type_id === '__GENERAL__'
        ? 'general'
        : (productTypes.value.find((item) => item.id === editForm.product_type_id)?.slug || editForm.category || null),
      tags: tags,
      title: editForm.title || null,
    });
    
    toast.success('Media metadata updated');
    showEditModal.value = false;
    await loadMedia();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update metadata');
  } finally {
    savingMetadata.value = false;
  }
}

async function loadTaxonomy() {
  loadingTaxonomy.value = true;
  try {
    const response = await axios.get('/api/admin/taxonomy');
    mainCategories.value = Array.isArray(response.data?.mainCategories) ? response.data.mainCategories : [];
    brands.value = Array.isArray(response.data?.brands) ? response.data.brands : [];
    productTypes.value = Array.isArray(response.data?.productTypes) ? response.data.productTypes : [];
    if (productTypes.value.length === 0) {
      console.warn('[MediaPage] No product types found in database');
    }
  } catch (error: any) {
    console.error('[MediaPage] Failed to load product types', error);
    console.error('[MediaPage] Error details:', error.response?.data || error.message);
    toast.error('Failed to load product types: ' + (error.response?.data?.error || error.message));
    mainCategories.value = [];
    brands.value = [];
    productTypes.value = [];
  } finally {
    loadingTaxonomy.value = false;
  }
}

watch(selectedMainCategoryId, () => {
  selectedBrandId.value = '';
  selectedBrandModelId.value = '';
  selectedProductTypeId.value = '';
});

watch(selectedBrandId, () => {
  selectedBrandModelId.value = '';
});

watch(() => uploadForm.main_category_id, () => {
  uploadForm.brand_id = '__NONE__';
  uploadForm.brand_model_id = '__NONE__';
  uploadForm.product_type_id = '';
});

watch(() => uploadForm.brand_id, () => {
  uploadForm.brand_model_id = '__NONE__';
});

watch(() => uploadForm.product_type_id, (value) => {
  if (value === '__GENERAL__') {
    uploadForm.brand_id = '__NONE__';
    uploadForm.brand_model_id = '__NONE__';
  }
});

watch(() => editForm.main_category_id, () => {
  editForm.brand_id = '__NONE__';
  editForm.brand_model_id = '__NONE__';
  editForm.product_type_id = '';
});

watch(() => editForm.brand_id, () => {
  editForm.brand_model_id = '__NONE__';
});

watch(() => editForm.product_type_id, (value) => {
  if (value === '__GENERAL__') {
    editForm.brand_id = '__NONE__';
    editForm.brand_model_id = '__NONE__';
  }
});

onMounted(() => {
  loadMedia();
  loadTaxonomy();
});
</script>

