<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <PageHeader title="Admin Dashboard" subtitle="Sales, orders, products, and customer activity" />
      <Button variant="ghost" size="sm" @click="loadDashboard" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <section
        v-for="stat in stats"
        :key="stat.label"
        class="overflow-hidden rounded-xl border bg-white shadow-sm"
        :class="stat.border"
      >
        <div class="flex items-start justify-between gap-4 p-5">
          <div>
            <div class="text-xs font-semibold uppercase tracking-[0.18em]" :class="stat.text">{{ stat.label }}</div>
            <div class="mt-2 text-3xl font-bold text-slate-950">{{ stat.value }}</div>
            <div class="mt-2 text-sm text-slate-600">{{ stat.hint }}</div>
          </div>
          <div class="rounded-xl p-3" :class="stat.iconBg">
            <component :is="stat.icon" class="h-5 w-5" :class="stat.text" />
          </div>
        </div>
        <div class="h-1" :class="stat.bar"></div>
      </section>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <ShoppingBag class="h-5 w-5 text-teal-700" />
              <h3 class="text-lg font-semibold text-slate-950">Recent Orders</h3>
            </div>
            <Button variant="ghost" size="sm" @click="$router.push('/admin/orders')">View all</Button>
          </div>
        </CardHeader>
        <CardBody>
          <div v-if="recentOrders.length === 0" class="py-10 text-center text-slate-500">
            No orders yet
          </div>
          <div v-else class="space-y-3">
            <article v-for="order in recentOrders" :key="order.id" class="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 transition hover:border-teal-200 hover:shadow-sm">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <PackageCheck class="h-5 w-5" />
                  </div>
                  <div>
                    <div class="font-semibold text-slate-950">Order #{{ order.order_number }}</div>
                    <div class="text-sm text-slate-600">{{ order.user?.customerProfile?.full_name || order.user?.email || order.user?.phone || 'Customer' }}</div>
                    <div class="text-xs text-slate-500">{{ order.items?.length || 0 }} item(s) · {{ formatDateTime(order.created_at) }}</div>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Badge :variant="badgeVariant(order.status)">{{ order.status }}</Badge>
                  <Badge :variant="badgeVariant(order.payment_status)">{{ order.payment_status }}</Badge>
                </div>
              </div>
              <div class="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <div class="rounded-lg bg-white px-3 py-2 text-slate-600">Subtotal <span class="font-semibold text-slate-950">{{ money(order.subtotal, order.currency) }}</span></div>
                <div class="rounded-lg bg-white px-3 py-2 text-slate-600">Total <span class="font-semibold text-slate-950">{{ money(order.total, order.currency) }}</span></div>
                <div class="rounded-lg bg-white px-3 py-2 text-slate-600">Proofs <span class="font-semibold text-slate-950">{{ order.paymentProofs?.length || 0 }}</span></div>
              </div>
            </article>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Zap class="h-5 w-5 text-violet-700" />
            <h3 class="text-lg font-semibold text-slate-950">Quick Actions</h3>
          </div>
        </CardHeader>
        <CardBody class="space-y-3">
          <router-link v-for="action in quickActions" :key="action.title" class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-teal-300 hover:bg-teal-50" :to="action.to">
            <div class="rounded-lg p-2" :class="action.bg">
              <component :is="action.icon" class="h-4 w-4" :class="action.color" />
            </div>
            <div>
              <div class="font-semibold text-slate-950">{{ action.title }}</div>
              <div class="text-sm text-slate-600">{{ action.copy }}</div>
            </div>
          </router-link>
        </CardBody>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <h3 class="text-base font-semibold text-slate-950">Weekly sales</h3>
        </CardHeader>
        <CardBody class="space-y-2">
          <div v-if="(dashboard.weeklySales || []).length === 0" class="text-sm text-slate-500">No weekly report data yet</div>
          <div v-else class="space-y-2">
            <div v-for="row in dashboard.weeklySales.slice(0, 8)" :key="row.period" class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <div class="text-slate-700">{{ formatPeriod(row.period, 'week') }}</div>
              <div class="font-medium text-slate-900">{{ money(row.revenue, 'BDT') }} · {{ row.orders }} orders</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 class="text-base font-semibold text-slate-950">Monthly sales</h3>
        </CardHeader>
        <CardBody class="space-y-2">
          <div v-if="(dashboard.monthlySales || []).length === 0" class="text-sm text-slate-500">No monthly report data yet</div>
          <div v-else class="space-y-2">
            <div v-for="row in dashboard.monthlySales.slice(0, 8)" :key="row.period" class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <div class="text-slate-700">{{ formatPeriod(row.period, 'month') }}</div>
              <div class="font-medium text-slate-900">{{ money(row.revenue, 'BDT') }} · {{ row.orders }} orders</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge } from '@matrix-ecommerce/ui';
import { Banknote, Boxes, CheckCircle2, Clock3, PackageCheck, RefreshCw, ShoppingBag, UsersRound, Zap } from 'lucide-vue-next';

const loading = ref(false);
const error = ref('');
const dashboard = ref<any>({});

const stats = computed(() => [
  { label: 'Amount sold this month', value: money(dashboard.value.soldThisMonth, 'BDT'), hint: 'Non-cancelled order value this month', icon: Banknote, border: 'border-emerald-100', iconBg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  { label: 'Completed orders', value: dashboard.value.completedOrders ?? 0, hint: 'Orders marked received or completed', icon: CheckCircle2, border: 'border-teal-100', iconBg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500' },
  { label: 'Pending orders', value: dashboard.value.pendingOrders ?? 0, hint: 'Orders still in active fulfillment', icon: Clock3, border: 'border-amber-100', iconBg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  { label: 'Users', value: dashboard.value.users ?? 0, hint: 'Registered customers, sellers, and admins', icon: UsersRound, border: 'border-sky-100', iconBg: 'bg-sky-50', text: 'text-sky-700', bar: 'bg-sky-500' },
  { label: 'Products', value: dashboard.value.products ?? 0, hint: 'Published and draft shopping items', icon: Boxes, border: 'border-violet-100', iconBg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500' },
  { label: 'Orders', value: dashboard.value.orders ?? 0, hint: 'All customer checkout orders', icon: ShoppingBag, border: 'border-rose-100', iconBg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' },
]);

const quickActions = [
  { title: 'Manage orders', copy: 'Update statuses, edit carts, and download invoices.', to: '/admin/orders', icon: ShoppingBag, bg: 'bg-teal-50', color: 'text-teal-700' },
  { title: 'CRM contacts', copy: 'Review customers, order audiences, and LTV.', to: '/admin/crm/contacts', icon: UsersRound, bg: 'bg-sky-50', color: 'text-sky-700' },
  { title: 'Manage products', copy: 'Create products, media, pricing, and taxonomy.', to: '/admin/shopping', icon: Boxes, bg: 'bg-violet-50', color: 'text-violet-700' },
  { title: 'Payment proofs', copy: 'Review uploaded slips and payment status.', to: '/admin/payment-proofs', icon: Banknote, bg: 'bg-emerald-50', color: 'text-emerald-700' },
];

const recentOrders = computed(() => dashboard.value.recentOrders || []);

function badgeVariant(value: string) {
  if (['approved', 'shipped', 'received', 'completed', 'purchased'].includes(value)) return 'success';
  if (['submitted', 'pending_payment', 'pending_review', 'pending_purchase', 'in_warehouse'].includes(value)) return 'warning';
  if (['rejected', 'cancelled'].includes(value)) return 'danger';
  return 'default';
}

function money(amount: number | null | undefined, currency = 'BDT') {
  const value = typeof amount === 'number' ? amount : 0;
  return `${currency} ${value.toLocaleString()}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPeriod(value: string, type: 'week' | 'month') {
  const date = new Date(value);
  if (type === 'week') {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

async function loadDashboard() {
  loading.value = true;
  error.value = '';
  try {
    const response = await axios.get('/api/admin/dashboard');
    dashboard.value = response.data || {};
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load admin dashboard';
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>
