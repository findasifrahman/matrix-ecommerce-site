<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_48%,#ffffff_100%)]">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section class="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.1)]">
        <div class="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          <div class="bg-[radial-gradient(circle_at_top_left,#fdba74,transparent_25%),linear-gradient(135deg,#0f172a_0%,#1e293b_46%,#9a3412_100%)] px-6 py-8 text-white sm:px-8 lg:px-10">
            <p class="text-[10px] font-bold uppercase tracking-[0.36em] text-orange-200">Contact Matrix Shop</p>
            <h1 class="mt-3 max-w-2xl text-[34px] text-orange-50/90 tracking-tight sm:text-[48px]">
              Dhaka support for mobile accessories, gadgets, and smart watch buyers
            </h1>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-100/90 sm:text-base">
              Reach our team for product support, order help, delivery questions, wholesale accessory sourcing, and Bangladesh-wide mobile accessory shopping assistance.
            </p>

            <div class="mt-8 grid gap-4 sm:grid-cols-2">
              <div class="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
                <PhoneCall class="h-5 w-5 text-orange-200" />
                <p class="mt-3 text-[10px] font-bold uppercase tracking-[0.28em] text-orange-100/80">Phone</p>
                <a href="tel:+8801735494275" class="mt-2 block text-2xl font-black tracking-tight text-white">01735494275</a>
                <p class="mt-2 text-xs leading-6 text-slate-100/80">Fastest option for order updates and accessory availability.</p>
              </div>

              <div class="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
                <Mail class="h-5 w-5 text-orange-200" />
                <p class="mt-3 text-[10px] font-bold uppercase tracking-[0.28em] text-orange-100/80">Email</p>
                <a href="mailto:support@matrix-ecommerce.com" class="mt-2 block text-lg font-black tracking-tight text-white">support@matrix-ecommerce.com</a>
                <p class="mt-2 text-xs leading-6 text-slate-100/80">Best for business orders, quotations, and supplier conversations.</p>
              </div>
            </div>

            <div class="mt-6 rounded-[28px] border border-white/15 bg-white/10 p-6 backdrop-blur">
              <div class="flex items-start gap-3">
                <MapPin class="mt-1 h-5 w-5 text-orange-200" />
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-orange-100/80">Office location</p>
                  <p class="mt-2 text-lg font-black tracking-tight text-white">Mirpur, Pallabi Thana, Section-12, Dhaka-1216, Bangladesh</p>
                  <p class="mt-2 text-sm leading-6 text-slate-100/85">Local support base for Bangladesh buyers, with broader sourcing coordination for China-based supply and repeat orders.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="p-6 sm:p-8 lg:p-10">
            <div class="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-slate-400">How we help</p>
              <h2 class="mt-3 text-[28px] font-black tracking-tight text-slate-950">Clear answers, readable design, and quicker support</h2>
              <p class="mt-3 text-sm leading-7 text-slate-600">
                This page now focuses on strong contrast, cleaner information grouping, and trust-building details that help customers contact you without friction.
              </p>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div v-for="item in supportCards" :key="item.title" class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <component :is="item.icon" class="h-5 w-5 text-orange-600" />
                <h3 class="mt-3 text-sm font-black text-slate-950">{{ item.title }}</h3>
                <p class="mt-2 text-xs leading-6 text-slate-600">{{ item.copy }}</p>
              </div>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <a href="tel:+8801735494275" class="inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-700">
                Call support
              </a>
              <a href="mailto:support@matrix-ecommerce.com" class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition-colors hover:border-orange-300 hover:text-orange-700">
                Email for quote
              </a>
            </div>

            <div class="mt-6 overflow-hidden rounded-[28px] border border-slate-200">
              <iframe
                title="Matrix Shop Dhaka Office Location"
                class="h-[320px] w-full"
                loading="lazy"
                allowfullscreen
                referrerpolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=Mirpur%20Pallabi%20Section%2012%20Dhaka%201216%20Bangladesh&z=15&output=embed"
              />
            </div>

            <div class="mt-4 rounded-[24px] border border-orange-200 bg-orange-50 p-5">
              <div class="flex items-start gap-3">
                <Clock3 class="mt-0.5 h-5 w-5 text-orange-700" />
                <div>
                  <p class="text-sm font-black text-slate-950">Response window</p>
                  <p class="mt-1 text-xs leading-6 text-slate-700">For common phone accessories, charger, gadget, and smart watch questions, customers should expect a response during normal business hours with quick follow-up on stock and delivery.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Clock3, Mail, MapPin, MessageCircle, PackageCheck, PhoneCall, ShieldCheck, Truck } from 'lucide-vue-next';
import { useSeo } from '@/utils/seo';

const supportCards = [
  { title: 'Accessory recommendations', copy: 'Help choosing mobile cover, tempered glass, charger, earbuds, power bank, cable, or smart watch options.', icon: MessageCircle },
  { title: 'Order confirmation', copy: 'Support for product availability, pricing clarity, and checkout questions before customers place an order.', icon: PackageCheck },
  { title: 'Delivery help', copy: 'Answers about delivery charges inside Dhaka and outside Dhaka, plus shipment tracking follow-up.', icon: Truck },
  { title: 'Trust and after-sales', copy: 'Guidance on compatibility, warranty expectations, and safer buying decisions for daily-use gadgets.', icon: ShieldCheck },
];

useSeo(() => ({
  title: 'Contact Matrix Shop | Mobile Accessories Support in Dhaka, Bangladesh',
  description: 'Contact Matrix Shop for mobile accessories, gadgets, charger, earbuds, power bank, and smart watch support in Dhaka, Bangladesh.',
  keywords: 'contact mobile accessories shop bangladesh, dhaka gadget shop contact, charger earbuds power bank support bangladesh',
}));
</script>
