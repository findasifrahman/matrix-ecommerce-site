<template>
  <div class="space-y-6">
    <PageHeader
      title="Store Policy"
      subtitle="Matrix Ecommerce uses one local currency and admin-uploaded product prices."
    />

    <Card>
      <CardHeader>
        <h3 class="text-lg font-semibold text-slate-900">Local ecommerce pricing</h3>
      </CardHeader>
      <CardBody class="space-y-4 text-sm leading-6 text-slate-600">
        <p>
          Product prices are entered directly on each product in BDT. Marketplace markup,
          shipping-rate, and global MOQ settings are no longer used by this project.
        </p>
        <div class="grid gap-3 md:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Currency</p>
            <p class="mt-2 text-2xl font-black text-slate-900">BDT</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Catalog</p>
            <p class="mt-2 text-lg font-black text-slate-900">Admin uploaded</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Delivery fee</p>
            <p class="mt-2 text-lg font-black text-slate-900">Not configured</p>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { PageHeader, Card, CardHeader, CardBody } from '@matrix-ecommerce/ui';
</script>
