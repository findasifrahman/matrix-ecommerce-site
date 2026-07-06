<template>
  <router-view />
  <Toast :toasts="toasts" @remove="removeToast" />
  <CartWidget />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Toast, useToast } from '@matrix-ecommerce/ui';
import CartWidget from '@/components/shopping/CartWidget.vue';

const toast = useToast();
const toasts = computed(() => toast.toasts.value);
const removeToast = (id: string) => toast.removeToast(id);
</script>
