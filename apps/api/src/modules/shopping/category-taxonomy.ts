export type ShoppingCategorySeed = {
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  description?: string;
  children: ShoppingCategorySeed[];
};

export const SHOPPING_CATEGORY_TREE: ShoppingCategorySeed[] = [
  {
    name: 'Phone Accessories',
    slug: 'phone-accessories',
    icon: 'smartphone',
    sort_order: 1,
    description: 'Matrix Ecommerce local phone accessories catalog.',
    children: [
      { name: 'Phone Cover', slug: 'phone-cover', icon: 'smartphone', sort_order: 1, children: [] },
      { name: 'Screen Protector', slug: 'screen-protector', icon: 'shield', sort_order: 2, children: [] },
      { name: 'Camera Lens Protector', slug: 'camera-lens-protector', icon: 'camera', sort_order: 3, children: [] },
      { name: 'Charger', slug: 'charger', icon: 'plug', sort_order: 4, children: [] },
      { name: 'Cable', slug: 'cable', icon: 'cable', sort_order: 5, children: [] },
      { name: 'Earphone', slug: 'earphone', icon: 'headphones', sort_order: 6, children: [] },
      { name: 'Power Bank', slug: 'power-bank', icon: 'battery', sort_order: 7, children: [] },
      { name: 'Holder & Stand', slug: 'holder-stand', icon: 'package', sort_order: 8, children: [] },
    ],
  },
  {
    name: 'Gadgets',
    slug: 'gadgets',
    icon: 'cpu',
    sort_order: 2,
    description: 'Matrix Ecommerce local gadget catalog.',
    children: [
      { name: 'Bluetooth Speaker', slug: 'bluetooth-speaker', icon: 'speaker', sort_order: 1, children: [] },
      { name: 'Power Bank', slug: 'power-bank', icon: 'battery', sort_order: 2, children: [] },
      { name: 'Adapter', slug: 'adapter', icon: 'plug', sort_order: 3, children: [] },
      { name: 'Cable Organizer', slug: 'cable-organizer', icon: 'cable', sort_order: 4, children: [] },
      { name: 'Smart Gadget', slug: 'smart-gadget', icon: 'cpu', sort_order: 5, children: [] },
    ],
  },
  {
    name: 'Watches',
    slug: 'watches',
    icon: 'watch',
    sort_order: 3,
    description: 'Matrix Ecommerce local watch catalog.',
    children: [
      { name: 'Smart Watch Strap', slug: 'smart-watch-strap', icon: 'watch', sort_order: 1, children: [] },
      { name: 'Watch Protector', slug: 'watch-protector', icon: 'shield', sort_order: 2, children: [] },
      { name: 'Charging Dock', slug: 'charging-dock', icon: 'plug', sort_order: 3, children: [] },
      { name: 'Watch Case', slug: 'watch-case', icon: 'package', sort_order: 4, children: [] },
    ],
  },
];
