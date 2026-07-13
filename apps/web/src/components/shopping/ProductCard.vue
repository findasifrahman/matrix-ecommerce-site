<template>
  <Card
    class="group cursor-pointer overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(15,23,42,0.12)] sm:rounded-[24px] sm:shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
    @click="$emit('click', product)"
  >
    <div class="relative aspect-square overflow-hidden bg-slate-100">
      <img
        v-if="imageSrc && !imageFailed"
        :src="imageSrc"
        :alt="product.title"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        @error="imageFailed = true"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
        <Package class="h-9 w-9 sm:h-14 sm:w-14" />
      </div>
      <div class="absolute inset-0 hidden items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100 sm:flex">
        <div class="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            class="rounded-full border border-white/30 bg-white/20 px-3 text-[12px] text-white shadow-lg backdrop-blur-sm hover:bg-white/30"
            @click.stop="$emit('click', product)"
          >
            <Package class="mr-1 h-3.5 w-3.5" />
            View
          </Button>
          <Button
            variant="primary"
            size="sm"
            class="rounded-full border-0 bg-rose-600 px-3 text-[12px] font-semibold text-white shadow-lg hover:bg-rose-700"
            @click.stop="emitAddToCart"
          >
            <Plus class="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </div>

    <CardBody class="p-2.5 sm:p-4">
      <h3 class="mb-1 min-h-[2.1rem] text-[12px] font-semibold leading-[1.05rem] text-slate-900 line-clamp-2 sm:min-h-[2.2rem] sm:text-sm sm:leading-5">{{ product.title }}</h3>
      <div class="mb-1.5 hidden items-center gap-2 text-xs text-slate-500 sm:flex">
        <div class="flex items-center gap-1 text-amber-500">
          <Star
            v-for="index in 5"
            :key="index"
            class="h-3.5 w-3.5"
            :fill="index <= roundedRating ? 'currentColor' : 'none'"
          />
        </div>
        <span class="font-medium text-slate-700">{{ ratingLabel }}</span>
        <span>{{ reviewLabel }}</span>
      </div>
      <div class="flex items-end justify-between gap-2">
        <div class="min-w-0">
          <span class="text-[13px] font-black leading-tight text-rose-600 sm:text-base">
            <span v-if="product.priceMin !== undefined && product.priceMax !== undefined">
              {{ formatPrice(product.priceMin) }}{{ product.priceMin !== product.priceMax ? ' - ' + formatPrice(product.priceMax) : '' }}
            </span>
            <span v-else-if="product.priceMin !== undefined">{{ formatPrice(product.priceMin) }}</span>
            <span v-else class="text-sm text-slate-500">Price on request</span>
          </span>
          <div v-if="showOriginalPrice" class="mt-0.5 text-[10px] text-slate-400 line-through sm:mt-1 sm:text-xs">
            {{ formatPrice(Number(product.originalPrice || 0)) }}
          </div>
        </div>
        <span v-if="product.vendorScore" class="hidden rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 sm:inline-flex">
          * {{ Number(product.vendorScore).toFixed(1) }}
        </span>
      </div>
      <button
        type="button"
        class="mt-2 flex w-full items-center justify-center rounded-xl bg-slate-950 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm sm:hidden"
        @click.stop="emitAddToCart"
      >
        <Plus class="mr-1 h-3.5 w-3.5" />
        Add
      </button>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildImageProxyUrl } from '@/utils/api-url';
import { Package, Plus, Star } from 'lucide-vue-next';
import { Card, CardBody, Button } from '@matrix-ecommerce/ui';

const props = defineProps<{
  product: {
    externalId: string;
    title: string;
    priceMin?: number;
    priceMax?: number;
    originalPrice?: number;
    rating?: number;
    ratingCount?: number;
    currency?: string;
    sourceCurrency?: string;
    displayCurrency?: 'BDT';
    sourcePriceMin?: number;
    sourcePriceMax?: number;
    displayPriceMin?: number;
    displayPriceMax?: number;
    imageUrl?: string;
    images?: string[];
    sellerName?: string;
    vendorId?: string;
    vendorName?: string;
    shopName?: string;
    shop?: { name?: string; badges?: string[] };
    totalSold?: number;
    vendorScore?: number;
  };
}>();

const emit = defineEmits<{
  click: [product: any];
  'request-buy': [product: any];
  'add-to-cart': [product: any];
}>();

const roundedRating = computed(() => Math.max(0, Math.min(5, Math.round(Number(props.product?.rating || 0)))));
const ratingLabel = computed(() => {
  const value = Number(props.product?.rating || 0);
  return value > 0 ? value.toFixed(1) : 'No rating';
});
const reviewLabel = computed(() => {
  const count = Number(props.product?.ratingCount || 0);
  return `${count} review${count === 1 ? '' : 's'}`;
});
const showOriginalPrice = computed(() => {
  const value = Number(props.product?.originalPrice || 0);
  const current = Number(props.product?.priceMin || 0);
  return value > 0 && current > 0 && value > current;
});

function isRenderableImageUrl(url: string): boolean {
  const text = String(url || '').trim();
  if (!text) return false;
  if (text.startsWith('/api/public/image-proxy')) return true;
  if (text.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(text);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function shouldProxyImageUrl(url: string): boolean {
  const text = String(url || '').trim();
  if (!text) return false;
  if (text.startsWith('/api/public/image-proxy')) return false;
  if (text.startsWith('/')) return false;
  if (text.startsWith('data:image/') || text.startsWith('blob:')) return false;
  try {
    const parsed = new URL(text);
    const host = parsed.hostname.toLowerCase();
    return ['alicdn.com', '1688.com', 'detail.1688.com'].some((domain) => {
      const normalized = domain.toLowerCase();
      return host === normalized || host.endsWith(`.${normalized}`) || host.includes(normalized);
    });
  } catch {
    return false;
  }
}

function collectImageCandidates(input: any): string[] {
  if (!input) return [];
  if (typeof input === 'string') return [input];
  if (Array.isArray(input)) return input.flatMap((item) => collectImageCandidates(item));
  if (typeof input !== 'object') return [];

  const keys = ['imageUrl', 'image_url', 'publicUrl', 'public_url', 'thumbnail_url', 'thumbnailUrl', 'url', 'src', 'mainImage', 'mainImageUrl'];
  const values: string[] = [];
  for (const key of keys) {
    if (key in input) values.push(...collectImageCandidates(input[key]));
  }
  return values;
}

function proxyImageUrl(url: string): string {
  const text = String(url || '').trim();
  if (!text) return '';
  if (text.startsWith('data:image/')) return text;
  if (!shouldProxyImageUrl(text)) return text;
  try {
    const parsed = new URL(text);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return buildImageProxyUrl(text);
    }
  } catch {
    return text;
  }
  return text;
}

function pickBestImage(product: any): string {
  const sources = [
    ...collectImageCandidates(product?.imageUrl),
    ...collectImageCandidates(product?.images),
    ...collectImageCandidates(product?.raw),
  ]
    .map((img) => String(img || '').trim())
    .filter(Boolean);

  const renderable = sources.find(isRenderableImageUrl);
  return proxyImageUrl(renderable || sources[0] || '');
}

const imageSrc = computed(() => pickBestImage(props.product));
const imageFailed = ref(false);

watch(imageSrc, () => {
  imageFailed.value = false;
});

function buildCartProduct(product: any) {
  const sourcePriceMin = product?.priceMin;
  const sourcePriceMax = product?.priceMax;
  const displayCurrency = 'BDT';
  const displayPriceMin = typeof sourcePriceMin === 'number' ? sourcePriceMin : undefined;
  const displayPriceMax = typeof sourcePriceMax === 'number' ? sourcePriceMax : undefined;

  return {
    ...product,
    currency: displayCurrency,
    sourceCurrency: product?.currency || 'BDT',
    sourcePriceMin,
    sourcePriceMax,
    displayCurrency,
    displayPriceMin,
    displayPriceMax,
    priceMin: displayPriceMin ?? product?.priceMin,
    priceMax: displayPriceMax ?? product?.priceMax,
  };
}

function emitAddToCart() {
  const payload = buildCartProduct(props.product);
  emit('request-buy', payload);
  emit('add-to-cart', payload);
}

function formatPrice(price: number): string {
  return `BDT ${Number(price || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

</script>


