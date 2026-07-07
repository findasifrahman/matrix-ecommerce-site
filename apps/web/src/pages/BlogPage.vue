<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-[linear-gradient(180deg,#f8fafc_0%,#fff7ed_45%,#ffffff_100%)]">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section class="overflow-hidden rounded-[32px] border border-orange-100 bg-[linear-gradient(135deg,#0f172a_0%,#7c2d12_55%,#f97316_100%)] px-6 py-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:px-8 lg:px-10">
        <div class="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.36em] text-orange-200">SEO Blog</p>
            <h1 class="mt-3 max-w-4xl text-[34px] font-black tracking-tight sm:text-[48px]">
              Bangladesh mobile accessories blog built around what people actually search
            </h1>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-orange-50/90 sm:text-base">
              We now target high-intent phrases around mobile cover, tempered glass, fast charger, earbuds, power bank, cable, and smart watch shopping in Bangladesh.
            </p>

            <div class="mt-6 flex flex-wrap gap-2">
              <span v-for="keyword in topKeywords" :key="keyword" class="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
                {{ keyword }}
              </span>
            </div>
          </div>

          <div class="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-100/80">Keyword Focus</p>
            <div class="mt-4 space-y-3">
              <div v-for="cluster in keywordClusters" :key="cluster.title" class="rounded-2xl bg-white/10 p-4">
                <p class="text-sm font-bold text-white">{{ cluster.title }}</p>
                <p class="mt-1 text-xs leading-6 text-orange-50/85">{{ cluster.copy }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <article class="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div class="bg-[radial-gradient(circle_at_top_left,#fed7aa,transparent_35%),linear-gradient(135deg,#fff7ed,#ffffff)] p-6 sm:p-8">
            <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-orange-700">Featured article</p>
            <h2 class="mt-3 text-[28px] font-black tracking-tight text-slate-950 sm:text-[36px]">
              {{ featuredPost?.title || 'Loading keyword-driven ecommerce articles...' }}
            </h2>
            <p class="mt-3 text-sm leading-7 text-slate-600">
              {{ featuredPost?.excerpt || 'We are preparing practical articles for Bangladesh shoppers and search engines.' }}
            </p>
            <div class="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
              <span>{{ formatDate(featuredPost?.published_at) }}</span>
              <span v-if="featuredPost">| {{ featuredPost.readingTimeMinutes }} min read</span>
            </div>
          </div>

          <div class="space-y-4 p-6 sm:p-8">
            <div
              v-for="section in parseSections(featuredPost?.content_md)"
              :key="section.heading"
              class="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
            >
              <h3 class="text-lg font-black tracking-tight text-slate-950">{{ section.heading }}</h3>
              <div class="mt-2 space-y-2">
                <p v-for="paragraph in section.paragraphs" :key="paragraph" class="text-sm leading-7 text-slate-600">
                  {{ paragraph }}
                </p>
              </div>
            </div>
          </div>
        </article>

        <aside class="space-y-6">
          <div class="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-slate-400">Why these keywords</p>
            <div class="mt-4 grid gap-3">
              <div v-for="insight in seoInsights" :key="insight.title" class="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <h3 class="text-sm font-black text-slate-950">{{ insight.title }}</h3>
                <p class="mt-2 text-xs leading-6 text-slate-600">{{ insight.copy }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-[30px] border border-orange-200 bg-orange-50 p-6">
            <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-orange-700">Content map</p>
            <div class="mt-4 space-y-3">
              <div v-for="post in secondaryPosts" :key="post.slug" class="rounded-[22px] border border-orange-100 bg-white p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-black text-slate-950">{{ post.title }}</p>
                  <span class="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-700">{{ post.readingTimeMinutes }} min</span>
                </div>
                <p class="mt-2 text-xs leading-6 text-slate-600">{{ post.excerpt }}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section class="mt-6 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-slate-400">All articles</p>
            <h2 class="mt-2 text-[28px] font-black tracking-tight text-slate-950">Keyword-rich accessory content for Bangladesh shoppers</h2>
          </div>
          <p class="max-w-2xl text-sm leading-6 text-slate-600">
            These posts help the site rank for product-intent searches while also guiding shoppers toward the right accessory category.
          </p>
        </div>

        <div class="mt-6 grid gap-4 lg:grid-cols-3">
          <article v-for="post in posts" :key="post.slug" class="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Bangladesh SEO</p>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{{ post.readingTimeMinutes }} min</span>
            </div>
            <h3 class="mt-3 text-[20px] font-black tracking-tight text-slate-950">{{ post.title }}</h3>
            <p class="mt-3 text-sm leading-7 text-slate-600">{{ post.excerpt }}</p>
            <p class="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">{{ formatDate(post.published_at) }}</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { useSeo } from '@/utils/seo';

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  published_at?: string;
  readingTimeMinutes: number;
};

const posts = ref<BlogPost[]>([]);

const topKeywords = [
  'mobile accessories bd',
  'mobile cover price in bangladesh',
  'tempered glass price in bangladesh',
  'fast charger price in bangladesh',
  'wireless earbuds price in bangladesh',
  'power bank price in bangladesh',
  'smart watch price in bangladesh',
];

const keywordClusters = [
  { title: 'Protection', copy: 'Phone cover, mobile cover, camera protector, and tempered glass keywords bring strong purchase intent.' },
  { title: 'Charging', copy: 'Fast charger, type C cable, and power bank phrases align with everyday repeat-demand accessories.' },
  { title: 'Wearables', copy: 'Wireless earbuds and smart watch keywords add gadget traffic beyond basic phone accessories.' },
];

const seoInsights = [
  { title: 'Location intent matters', copy: 'Bangladesh shoppers often add "price in bangladesh", "bd", or "online shop" to commercial searches.' },
  { title: 'Category + compatibility wins', copy: 'Queries that combine accessory type with model names like iPhone or Samsung usually convert better than generic blog traffic.' },
  { title: 'Bundle linking helps rankings', copy: 'Internal links between cover, glass, charger, cable, power bank, and watch pages help search engines understand product relevance.' },
];

const featuredPost = computed(() => posts.value[0] || null);
const secondaryPosts = computed(() => posts.value.slice(1, 4));

function parseSections(markdown?: string) {
  const source = String(markdown || '').trim();
  if (!source) return [];

  return source
    .split('\n## ')
    .map((chunk, index) => {
      const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
      const heading = index === 0 ? String(lines.shift() || '').replace(/^#\s*/, '') : lines.shift() || 'Section';
      const paragraphs = lines
        .map((line) => line.replace(/^- /, ''))
        .filter((line) => !line.startsWith('#'));
      return { heading, paragraphs };
    })
    .filter((section) => section.heading && section.paragraphs.length > 0);
}

function formatDate(value?: string) {
  if (!value) return 'Published recently';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function loadPosts() {
  try {
    const response = await axios.get('/api/public/blog', { suppressGlobalErrorToast: true } as any);
    posts.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    posts.value = [];
  }
}

useSeo(() => ({
  title: 'Blog | Mobile Accessories Bangladesh SEO Guides | Matrix Shop',
  description: 'Explore Bangladesh-focused articles on mobile accessories, mobile cover, tempered glass, charger, earbuds, power bank, and smart watch buying keywords.',
  keywords: topKeywords.join(', '),
}));

onMounted(loadPosts);
</script>
