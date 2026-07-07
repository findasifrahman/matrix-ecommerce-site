export type HomepageVisualMenuItemSeed = {
  section_key: string;
  section_label: string;
  section_sort_order: number;
  title: string;
  search_keyword: string;
  image_url: string;
  image_alt: string;
  sort_order: number;
};

export type HomepageVisualMenuSectionSeed = {
  section_key: string;
  section_label: string;
  section_sort_order: number;
  items: Array<Omit<HomepageVisualMenuItemSeed, 'section_key' | 'section_label' | 'section_sort_order'>>;
};

function placeholderImage(label: string): string {
  return `https://placehold.co/600x450/f8fafc/0f172a?text=${encodeURIComponent(label)}`;
}

const PHONE_COVER_IMAGE = '/menu_round_icons/charger.png';
const CHARGER_IMAGE = 'https://cbu01.alicdn.com/img/ibank/O1CN01rMc9TR1uqol85owES_!!1627406089-0-cib.jpg';
const PHONE_GLASS_IMAGE = 'https://cbu01.alicdn.com/img/ibank/O1CN01kc2INO1ocituoDdXA_!!1865165246-0-cib.jpg';
const POWER_BANK_IMAGE = 'https://cbu01.alicdn.com/img/ibank/O1CN01UN76QO2GOo6gcHTlZ_!!2210980869006-0-cib.jpg';
const HOLDER_IMAGE = 'https://cbu01.alicdn.com/img/ibank/O1CN01qKi0sm2A8QFIA4KyN_!!2221515018158-0-cib.jpg';
const EARBUD_IMAGE = placeholderImage('Earbud');
const CABLE_IMAGE = placeholderImage('Cable');
const WATCH_IMAGE = placeholderImage('Watch');

export const HOMEPAGE_VISUAL_MENU_SECTIONS: HomepageVisualMenuSectionSeed[] = [
  {
    section_key: 'quick-menu',
    section_label: 'Quick menu',
    section_sort_order: 0,
    items: [
      { title: 'Phone Cover', search_keyword: 'mobile cover price in bangladesh', image_url: PHONE_COVER_IMAGE, image_alt: 'Phone cover', sort_order: 1 },
      { title: 'Charger', search_keyword: 'fast charger price in bangladesh', image_url: CHARGER_IMAGE, image_alt: 'Charger', sort_order: 2 },
      { title: 'Phone Glass', search_keyword: 'tempered glass price in bangladesh', image_url: PHONE_GLASS_IMAGE, image_alt: 'Phone glass', sort_order: 3 },
      { title: 'Earbud', search_keyword: 'wireless earbuds price in bangladesh', image_url: EARBUD_IMAGE, image_alt: 'Earbud', sort_order: 4 },
      { title: 'Cable', search_keyword: 'type c cable price in bangladesh', image_url: CABLE_IMAGE, image_alt: 'Cable', sort_order: 5 },
      { title: 'Power Bank', search_keyword: 'power bank price in bangladesh', image_url: POWER_BANK_IMAGE, image_alt: 'Power bank', sort_order: 6 },
      { title: 'Phone Holder', search_keyword: 'phone holder for bike car in bangladesh', image_url: HOLDER_IMAGE, image_alt: 'Phone holder', sort_order: 7 },
      { title: 'Watch', search_keyword: 'smart watch price in bangladesh', image_url: WATCH_IMAGE, image_alt: 'Watch', sort_order: 8 },
    ],
  },
  {
    section_key: 'you-may-like',
    section_label: 'You may like',
    section_sort_order: 1,
    items: [
      { title: 'You may like', search_keyword: 'mobile accessories bd online shop', image_url: PHONE_COVER_IMAGE, image_alt: 'You may like', sort_order: 1 },
    ],
  },
  {
    section_key: 'phone-cover',
    section_label: 'Phone cover',
    section_sort_order: 2,
    items: [
      { title: 'Phone cover', search_keyword: 'best mobile cover in bangladesh', image_url: PHONE_COVER_IMAGE, image_alt: 'Phone cover', sort_order: 1 },
    ],
  },
  {
    section_key: 'charger',
    section_label: 'Charger',
    section_sort_order: 3,
    items: [
      { title: 'Charger', search_keyword: 'original mobile charger in bangladesh', image_url: CHARGER_IMAGE, image_alt: 'Charger', sort_order: 1 },
    ],
  },
  {
    section_key: 'power-bank',
    section_label: 'Power bank',
    section_sort_order: 4,
    items: [
      { title: 'Power Bank', search_keyword: '10000mah power bank price in bangladesh', image_url: POWER_BANK_IMAGE, image_alt: 'Power bank', sort_order: 1 },
    ],
  },
  {
    section_key: 'earbud',
    section_label: 'Earbud',
    section_sort_order: 5,
    items: [
      { title: 'Earbud', search_keyword: 'bluetooth earbuds price in bangladesh', image_url: EARBUD_IMAGE, image_alt: 'Earbud', sort_order: 1 },
    ],
  },
];

export const HOMEPAGE_VISUAL_MENU_SEED: HomepageVisualMenuItemSeed[] = HOMEPAGE_VISUAL_MENU_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    section_key: section.section_key,
    section_label: section.section_label,
    section_sort_order: section.section_sort_order,
    ...item,
  }))
);
