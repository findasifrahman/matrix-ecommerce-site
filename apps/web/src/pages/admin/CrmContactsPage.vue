<template>
  <div class="space-y-4">
    <div>
      <div class="text-sm font-medium text-teal-700">CRM</div>
      <PageHeader title="Contacts" subtitle="Customer contact list with order audiences, remaining orders, and lifetime value" />
    </div>

    <Card>
      <CardBody class="space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <div class="w-full sm:w-64">
            <Input v-model="filters.search" label="Search" placeholder="Search name, phone, email" @input="onFilterChange" />
          </div>
          <div class="w-full sm:w-56">
            <Select v-model="filters.audience" label="Audience" :options="audienceOptions" @update:modelValue="onFilterChange" />
          </div>
          <div class="w-28">
            <Select v-model.number="limit" label="Show" :options="limitOptions" @update:modelValue="onLimitChange" />
          </div>
          <Button variant="ghost" size="sm" :loading="loading" @click="loadContacts">
            <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </Button>
        </div>
        <div class="flex flex-wrap gap-2 text-xs text-slate-600">
          <span class="rounded-full bg-slate-100 px-3 py-1.5">{{ total }} contacts</span>
          <span class="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">{{ totals.placed }} placed orders</span>
          <span class="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">{{ totals.remaining }} remaining orders</span>
        </div>
      </CardBody>
    </Card>

    <Card>
      <CardBody class="p-0">
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-slate-500">Loading contacts...</div>
        <div v-else-if="contacts.length === 0" class="px-4 py-10 text-center text-sm text-slate-500">No contacts found</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-[12px]">
            <thead class="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase tracking-[0.16em] text-slate-600">
              <tr>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Name</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Phone</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Email</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Audiences</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Orders</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">LTV</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Created</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="contact in contacts" :key="contact.id" class="align-top hover:bg-slate-50">
                <td class="border-b border-slate-100 px-3 py-3">
                  <button class="font-semibold text-violet-700 hover:underline" @click="openCustomer(contact)">
                    {{ contact.name }}
                  </button>
                </td>
                <td class="border-b border-slate-100 px-3 py-3 text-slate-700">{{ contact.phone || 'N/A' }}</td>
                <td class="border-b border-slate-100 px-3 py-3 text-slate-700">{{ contact.email || 'N/A' }}</td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="flex max-w-sm flex-wrap gap-1">
                    <Badge v-for="audience in contact.audiences" :key="audience" :variant="audienceVariant(audience)" class="text-[10px]">
                      {{ audienceLabel(audience) }}
                    </Badge>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="font-medium text-slate-900">
                    <span class="text-amber-700">{{ contact.order_summary.remaining }}</span>
                    <span class="text-slate-400"> / </span>
                    <span class="text-emerald-700">{{ contact.order_summary.completed }}</span>
                    <span class="text-slate-400"> / </span>
                    <span class="text-rose-700">{{ contact.order_summary.cancelled }}</span>
                    <span class="text-slate-400"> / </span>
                    <span>{{ contact.order_summary.placed }}</span>
                  </div>
                  <div class="text-slate-500">({{ contact.order_summary.items }} items)</div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3 text-right font-semibold text-slate-900">{{ money(contact.ltv, contact.preferred_currency) }}</td>
                <td class="border-b border-slate-100 px-3 py-3 text-slate-700">{{ formatDateTime(contact.created_at) }}</td>
                <td class="border-b border-slate-100 px-3 py-3 text-right">
                  <Button size="sm" variant="ghost" class="h-7 px-2 text-[11px]" @click="openCustomer(contact)">View</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pagination :current-page="page" :total-pages="totalPages" :total="total" :page-size="limit" @update:currentPage="handlePageChange" />
      </CardBody>
    </Card>

    <Modal v-model="detailOpen" title="Contact details" size="xl">
      <div v-if="customerDetail" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Contact</div>
            <div class="mt-1 text-lg font-semibold text-slate-900">{{ customerDetail.customerProfile?.full_name || customerDetail.email || customerDetail.phone || 'Contact' }}</div>
            <div class="mt-2 space-y-1 text-sm text-slate-600">
              <div>Phone: {{ customerDetail.phone || 'N/A' }}</div>
              <div>Email: {{ customerDetail.email || 'N/A' }}</div>
              <div>Status: {{ customerDetail.status }}</div>
            </div>
          </section>
          <section class="rounded-xl border border-slate-200 p-4">
            <div class="text-sm font-semibold text-slate-900">Recent orders</div>
            <div v-if="customerDetail.orders?.length" class="mt-2 space-y-2">
              <div v-for="order in customerDetail.orders.slice(0, 5)" :key="order.id" class="rounded-lg border border-slate-200 p-3 text-sm">
                <div class="font-medium text-slate-900">#{{ order.order_number }}</div>
                <div class="text-slate-600">{{ order.status }} · {{ money(order.total, order.currency) }}</div>
              </div>
            </div>
            <div v-else class="mt-2 text-sm text-slate-500">No orders yet.</div>
          </section>
        </div>
      </div>
      <div v-else class="py-8 text-center text-sm text-slate-500">Loading contact...</div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@matrix-ecommerce/ui';
import { Badge, Button, Card, CardBody, Input, Modal, PageHeader, Pagination, Select } from '@matrix-ecommerce/ui';
import { RefreshCw } from 'lucide-vue-next';

const toast = useToast();
const contacts = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const totalPages = ref(1);
const detailOpen = ref(false);
const customerDetail = ref<any>(null);
const filters = reactive({ search: '', audience: '' });

const audienceOptions = [
  { value: '', label: 'All Audiences' },
  { value: 'placed-order', label: 'placed-order' },
  { value: 'remaining-order', label: 'remaining-order' },
  { value: 'completed-order', label: 'completed-order' },
  { value: 'cancelled-order', label: 'cancelled-order' },
  { value: 'created-account', label: 'created-account' },
];

const limitOptions = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

const totals = computed(() => contacts.value.reduce((sum, contact) => ({
  placed: sum.placed + Number(contact.order_summary?.placed || 0),
  remaining: sum.remaining + Number(contact.order_summary?.remaining || 0),
}), { placed: 0, remaining: 0 }));

function audienceLabel(value: string) {
  return value.toUpperCase();
}

function audienceVariant(value: string) {
  if (value === 'placed-order' || value === 'completed-order') return 'success';
  if (value === 'remaining-order' || value === 'created-account') return 'warning';
  if (value === 'cancelled-order') return 'danger';
  return 'default';
}

function money(amount: number | null | undefined, currency = 'BDT') {
  return `${currency} ${(amount ?? 0).toLocaleString()}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' });
}

async function loadContacts() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/crm/contacts', {
      params: {
        page: page.value,
        limit: limit.value,
        search: filters.search || undefined,
        audience: filters.audience || undefined,
      },
    });
    const payload = response.data || {};
    contacts.value = payload.contacts || [];
    total.value = payload.total || 0;
    totalPages.value = payload.totalPages || 1;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load contacts');
  } finally {
    loading.value = false;
  }
}

function onFilterChange() {
  page.value = 1;
  loadContacts();
}

function onLimitChange() {
  page.value = 1;
  loadContacts();
}

function handlePageChange(nextPage: number) {
  page.value = nextPage;
  loadContacts();
}

async function openCustomer(contact: any) {
  detailOpen.value = true;
  customerDetail.value = null;
  try {
    const response = await axios.get(`/api/admin/customers/${contact.id}`);
    customerDetail.value = response.data;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load contact');
  }
}

onMounted(loadContacts);
</script>
