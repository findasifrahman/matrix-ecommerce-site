<template>
  <OpsLayoutComponent @logout="handleLogout">
    <router-view />
  </OpsLayoutComponent>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import OpsLayoutComponent from '@matrix-ecommerce/ui/src/layouts/OpsLayout.vue';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

