import { onMounted, watchEffect } from 'vue';

type SeoInput = {
  title: string;
  description: string;
  keywords?: string;
};

function ensureMeta(name: string) {
  let tag = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  return tag;
}

export function useSeo(getSeo: () => SeoInput) {
  onMounted(() => {
    watchEffect(() => {
      const seo = getSeo();
      document.title = seo.title;
      ensureMeta('description').setAttribute('content', seo.description);
      if (seo.keywords) {
        ensureMeta('keywords').setAttribute('content', seo.keywords);
      }
    });
  });
}
