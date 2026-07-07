<template>
  <router-view />
  <Toast :toasts="toasts" @remove="removeToast" />
  <CartWidget />
  <WhatsAppStickyButton v-if="showWhatsAppButton" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Toast, useToast } from '@matrix-ecommerce/ui';
import CartWidget from '@/components/shopping/CartWidget.vue';
import WhatsAppStickyButton from '@/components/common/WhatsAppStickyButton.vue';

const route = useRoute();
const toast = useToast();
const toasts = computed(() => toast.toasts.value);
const removeToast = (id: string) => toast.removeToast(id);
const showWhatsAppButton = computed(() => !/^\/(admin|seller|ops)(\/|$)/.test(route.path));
</script>
