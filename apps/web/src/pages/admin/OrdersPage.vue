<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <PageHeader
        title="Orders"
        subtitle="Daywise checkout queue with seller approvals, customer lookup, and compact fulfillment control"
      />
      <Button variant="ghost" size="sm" @click="loadOrders" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardBody class="space-y-3">
        <div class="grid gap-3 lg:grid-cols-5">
          <Input v-model="filters.search" label="Search" placeholder="Order, email, phone, city" @input="onFilterChange" />
          <Select v-model="filters.status" label="Status" :options="statusOptions" @update:modelValue="onFilterChange" />
          <Select v-model="filters.paymentStatus" label="Payment" :options="paymentOptions" @update:modelValue="onFilterChange" />
          <Input v-model="filters.from" label="From" type="date" @input="onFilterChange" />
          <Input v-model="filters.to" label="To" type="date" @input="onFilterChange" />
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <button
            class="rounded-full border px-3 py-1.5 transition"
            :class="pendingFirst ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600'"
            @click="togglePendingFirst"
          >
            Pending review first
          </button>
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{{ total }} total orders</span>
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{{ dayGroups.length }} days shown</span>
        </div>
      </CardBody>
    </Card>

    <Card>
      <CardBody class="p-0">
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-slate-500">Loading orders...</div>
        <div v-else-if="orders.length === 0" class="px-4 py-10 text-center text-sm text-slate-500">No orders found</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-[11px]">
            <thead class="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Order</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Customer</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Items</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Status</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Payment</th>
                <th class="border-b border-slate-200 px-2 py-2 text-right">Weight</th>
                <th class="border-b border-slate-200 px-2 py-2 text-right">Total</th>
                <th class="border-b border-slate-200 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in dayGroups" :key="group.day">
                <tr>
                  <td colspan="8" class="bg-slate-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                    {{ group.dayLabel }}
                    <span class="ml-2 rounded-full bg-white px-2 py-0.5 text-slate-500">{{ group.orders.length }}</span>
                  </td>
                </tr>
                <tr v-for="order in group.orders" :key="order.id" class="align-top hover:bg-slate-50/80">
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <div class="font-semibold text-slate-900">#{{ order.order_number }}</div>
                      <div class="text-slate-500">{{ formatDateTime(order.created_at) }}</div>
                      <div class="text-slate-500">{{ order.shippingAddress?.city || 'No city' }}</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <div class="font-medium text-slate-900">{{ customerName(order) }}</div>
                      <div class="text-slate-500">{{ customerEmail(order) }}</div>
                      <div class="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" class="h-6 px-2 text-[10px]" @click="openCustomer(order)">
                          View customer
                        </Button>
                      </div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <div class="text-slate-900">{{ order.items?.length || 0 }} items</div>
                      <div class="max-w-[18rem] text-slate-500">
                        <span
                          v-for="item in order.items.slice(0, 2)"
                          :key="item.id"
                          class="mr-1 inline-block rounded-full bg-slate-100 px-2 py-0.5"
                        >
                          {{ item.title_snapshot || item.product?.title }}
                        </span>
                        <span v-if="order.items.length > 2" class="text-slate-400">+{{ order.items.length - 2 }}</span>
                      </div>
                      <div v-if="order.items?.[0]" class="mt-1 max-w-[18rem] text-[10px] text-slate-500">
                        {{ sellerLabel(order.items[0]) }}
                        <span v-if="vendorId(order.items[0])"> · Vendor {{ vendorId(order.items[0]) }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-2">
                      <Badge :variant="badgeVariant(order.status)" class="text-[10px]">{{ order.status }}</Badge>
                      <div class="w-36">
                        <Select
                          :model-value="order.status"
                          :options="fulfillmentOptions"
                          @update:model-value="updateStatus(order.id, $event)"
                        />
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <Badge
                          v-for="state in sellerStateSummary(order)"
                          :key="state"
                          :variant="badgeVariant(state)"
                          class="text-[11px]"
                        >
                          {{ state }}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <Badge :variant="badgeVariant(order.payment_status)" class="text-[10px]">{{ order.payment_method === 'cash_on_delivery' ? 'Cash on delivery' : order.payment_status }}</Badge>
                      <Badge v-if="latestProof(order)" :variant="badgeVariant(latestProof(order).status)" class="text-[10px]">
                        {{ latestProof(order).status }}
                      </Badge>
                      <div v-else class="text-slate-500">{{ order.payment_method === 'cash_on_delivery' ? 'No advance payment required' : 'No slip uploaded' }}</div>
                      <div class="text-slate-500">{{ order.paymentProofs?.length || 0 }} proof(s)</div>
                      <a
                        v-if="latestProof(order)?.asset?.public_url"
                        :href="latestProof(order).asset.public_url"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Open slip
                      </a>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2 text-right">
                    <div class="font-semibold text-slate-900">{{ formatWeight(orderWeight(order)) }}</div>
                    <div class="text-[10px] text-slate-500">total weight</div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2 text-right">
                    <div class="space-y-1">
                      <div class="font-semibold text-slate-900">{{ money(order.total, order.currency) }}</div>
                      <div class="text-slate-500">Shipping {{ money(order.shipping_fee, order.currency) }}</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2 text-right">
                    <div class="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" class="h-6 px-2 text-[10px]" @click="openOrderDetails(order)">Details</Button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="border-t border-slate-200">
          <Pagination :current-page="page" :total-pages="totalPages" :total="total" :page-size="limit" @update:currentPage="handlePageChange" />
        </div>
      </CardBody>
    </Card>

    <Modal v-model="customerModalOpen" :title="customerModalTitle" size="xl">
      <div v-if="selectedCustomer" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Customer profile</div>
            <div class="mt-1 text-lg font-semibold text-slate-900">{{ selectedCustomer.customerProfile?.full_name || selectedCustomer.email || 'Customer' }}</div>
            <div class="mt-2 space-y-1 text-sm text-slate-600">
              <div>Email: {{ selectedCustomer.email || 'N/A' }}</div>
              <div>Phone: {{ selectedCustomer.phone || 'N/A' }}</div>
              <div>Preferred currency: {{ selectedCustomer.customerProfile?.preferred_currency || 'BDT' }}</div>
              <div>Current rating: {{ selectedCustomer.customerProfile?.internal_rating ?? '—' }}/10</div>
            </div>
          </div>

          <div class="space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input v-model.number="customerReview.rating" type="number" min="1" max="10" label="Internal rating" />
            <Textarea v-model="customerReview.note" label="Internal note" rows="4" placeholder="Premium client, high return risk, sensitive buyer, etc." />
            <div class="flex justify-end gap-2">
              <Button variant="ghost" class="text-rose-600" :loading="deletingCustomer" @click="deleteSelectedCustomer">Delete customer</Button>
              <Button variant="primary" :loading="savingCustomerReview" @click="saveCustomerReview">Save review</Button>
            </div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <Card class="shadow-none">
            <CardBody>
              <div class="mb-2 text-sm font-semibold text-slate-900">Addresses</div>
              <div v-if="selectedCustomer.addresses?.length" class="space-y-2">
                <div v-for="address in selectedCustomer.addresses" :key="address.id" class="rounded-xl border border-slate-200 p-3 text-sm">
                  <div class="font-medium text-slate-900">{{ address.name }}</div>
                  <div class="text-slate-600">{{ address.phone }} • {{ address.city }}</div>
                  <div class="text-slate-500">{{ address.address_line }}</div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-500">No addresses saved.</div>
            </CardBody>
          </Card>

          <Card class="shadow-none">
            <CardBody>
              <div class="mb-2 text-sm font-semibold text-slate-900">Recent orders</div>
              <div v-if="selectedCustomer.orders?.length" class="space-y-2">
                <div v-for="order in selectedCustomer.orders" :key="order.id" class="rounded-xl border border-slate-200 p-3 text-sm">
                  <div class="font-medium text-slate-900">#{{ order.order_number }}</div>
                  <div class="text-slate-600">{{ formatDateTime(order.created_at) }} • {{ money(order.total, order.currency) }}</div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-500">No recent orders.</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Modal>

    <Modal v-if="false" v-model="orderModalOpen" title="Order details" size="xl">
      <div v-if="selectedOrder" class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 p-3 text-sm">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Order</div>
            <div class="font-semibold text-slate-900">#{{ selectedOrder.order_number }}</div>
            <div class="text-slate-600">{{ formatDateTime(selectedOrder.created_at) }}</div>
          </div>
          <div class="rounded-2xl border border-slate-200 p-3 text-sm">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Customer</div>
            <div class="font-semibold text-slate-900">{{ customerName(selectedOrder) }}</div>
            <div class="text-slate-600">{{ customerEmail(selectedOrder) }}</div>
          </div>
          <div class="rounded-2xl border border-slate-200 p-3 text-sm">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Shipping</div>
            <div class="font-semibold text-slate-900">{{ selectedOrder.shippingAddress?.city || 'N/A' }}</div>
            <div class="text-slate-600">{{ selectedOrder.shipping_method || 'air' }}</div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200">
          <div class="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Items</div>
          <div class="divide-y divide-slate-100">
            <div v-for="item in selectedOrder.items" :key="item.id" class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div class="min-w-0 flex-1">
                <div class="font-medium text-slate-900">{{ item.title_snapshot || item.product?.title }}</div>
                <div class="mt-2 grid gap-1 text-[11px] text-slate-500 md:grid-cols-2">
                  <div>Seller: <span class="text-slate-700">{{ sellerLabel(item) }}</span></div>
                  <div>Vendor ID: <span class="text-slate-700">{{ vendorId(item) || 'N/A' }}</span></div>
                  <a v-if="productUrl(item)" :href="productUrl(item)" target="_blank" rel="noreferrer" class="font-medium text-teal-700 hover:underline">
                    Product URL
                  </a>
                  <a v-if="shopUrl(item)" :href="shopUrl(item)" target="_blank" rel="noreferrer" class="font-medium text-teal-700 hover:underline">
                    Shop URL
                  </a>
                </div>
                <div class="text-slate-500">Qty {{ item.qty }} • {{ money(item.price_snapshot, item.currency_snapshot) }}</div>
              </div>
              <Badge :variant="badgeVariant(item.seller_status)" class="text-[11px]">{{ item.seller_status }}</Badge>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    <Teleport to="body">
      <div v-if="orderModalOpen && selectedOrder" class="fixed inset-0 z-50 overflow-y-auto bg-slate-100">
        <div class="mx-auto min-h-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
          <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <button class="mb-2 text-sm font-medium text-teal-700 hover:text-teal-900" @click="orderModalOpen = false">← Back to orders</button>
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-3xl font-bold tracking-tight text-slate-950">Order #{{ selectedOrder.order_number }}</h2>
                <Badge :variant="badgeVariant(selectedOrder.status)">{{ selectedOrder.status }}</Badge>
              </div>
              <p class="mt-1 text-sm text-slate-500">Placed {{ formatDateTime(selectedOrder.created_at) }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="ghost" @click="downloadInvoice"><Download class="mr-2 h-4 w-4" />Download invoice</Button>
              <Button variant="primary" @click="openOrderEditor"><Pencil class="mr-2 h-4 w-4" />Edit order</Button>
              <Button variant="ghost" @click="orderModalOpen = false"><X class="h-4 w-4" /></Button>
            </div>
          </div>

          <div class="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div class="space-y-5">
              <div class="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-3">
                <section class="p-5 md:border-r md:border-slate-100">
                  <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><UserRound class="h-4 w-4 text-teal-600" />Customer</div>
                  <div class="font-semibold text-slate-950">{{ selectedOrder.shippingAddress?.name || customerName(selectedOrder) }}</div>
                  <div class="mt-1 text-sm text-slate-600">{{ selectedOrder.user?.phone || selectedOrder.shippingAddress?.phone || 'No phone' }}</div>
                  <div class="text-sm text-slate-600">{{ selectedOrder.user?.email || 'No email' }}</div>
                </section>
                <section class="p-5 md:border-r md:border-slate-100">
                  <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><MapPin class="h-4 w-4 text-teal-600" />Shipping address</div>
                  <div class="text-sm leading-6 text-slate-700">{{ selectedOrder.shippingAddress?.address_line || 'No address' }}</div>
                  <div class="text-sm text-slate-600">{{ [selectedOrder.shippingAddress?.city, selectedOrder.shippingAddress?.postal_code].filter(Boolean).join(', ') }}</div>
                  <div class="text-sm text-slate-600">{{ selectedOrder.shippingAddress?.country || 'Bangladesh' }}</div>
                </section>
                <section class="p-5">
                  <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><CreditCard class="h-4 w-4 text-teal-600" />Payment</div>
                  <div class="flex flex-wrap gap-2"><Badge :variant="badgeVariant(selectedOrder.payment_status)">{{ selectedOrder.payment_status }}</Badge></div>
                  <div class="mt-2 text-sm capitalize text-slate-600">{{ String(selectedOrder.payment_method || '').replaceAll('_', ' ') }}</div>
                  <a v-if="latestProof(selectedOrder)?.asset?.public_url" :href="latestProof(selectedOrder).asset.public_url" target="_blank" class="mt-2 inline-block text-sm font-medium text-teal-700">View payment slip</a>
                </section>
              </div>

              <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div><h3 class="font-semibold text-slate-950">Cart details</h3><p class="text-xs text-slate-500">{{ selectedOrder.items.length }} line item(s)</p></div>
                  <Button size="sm" variant="primary" @click="openOrderEditor"><Pencil class="mr-2 h-4 w-4" /> Edit cart</Button>
                </div>
                <div class="divide-y divide-slate-100">
                  <div v-for="item in selectedOrder.items" :key="item.id" class="grid gap-3 p-5 sm:grid-cols-[56px_1fr_auto] sm:items-center">
                    <img :src="itemImage(item)" class="h-14 w-14 rounded-xl border border-slate-200 object-cover" alt="" />
                    <div class="min-w-0">
                      <div class="font-semibold text-slate-900">{{ item.title_snapshot || item.product?.title }}</div>
                      <div class="mt-1 text-xs text-slate-500">{{ skuDetails(item) }} · {{ sellerLabel(item) }}</div>
                      <div class="mt-2 flex gap-2"><Badge :variant="badgeVariant(item.seller_status)" class="text-[10px]">{{ item.seller_status }}</Badge><span class="text-xs text-slate-500">Qty {{ item.qty }}</span></div>
                    </div>
                    <div class="text-right"><div class="font-semibold text-slate-950">{{ money(item.price_snapshot * item.qty, item.currency_snapshot) }}</div><div class="text-xs text-slate-500">{{ money(item.price_snapshot, item.currency_snapshot) }} each</div></div>
                  </div>
                </div>
              </section>
            </div>

            <aside class="space-y-5">
              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 class="mb-4 font-semibold text-slate-950">Order summary</h3>
                <div class="space-y-3 text-sm"><div class="flex justify-between text-slate-600"><span>Subtotal</span><span>{{ money(selectedOrder.subtotal, selectedOrder.currency) }}</span></div><div class="flex justify-between text-slate-600"><span>Shipping</span><span>{{ money(selectedOrder.shipping_fee, selectedOrder.currency) }}</span></div><div class="flex justify-between text-slate-600"><span>Total weight</span><span>{{ formatWeight(orderWeight(selectedOrder)) }}</span></div><div v-if="selectedOrder.discount_amount" class="flex justify-between text-emerald-700"><span>Discount</span><span>-{{ money(selectedOrder.discount_amount, selectedOrder.currency) }}</span></div><div class="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-950"><span>Total</span><span>{{ money(selectedOrder.total, selectedOrder.currency) }}</span></div></div>
              </section>
              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 class="mb-2 font-semibold text-slate-950">Customer note</h3><p class="whitespace-pre-wrap text-sm leading-6 text-slate-600">{{ selectedOrder.notes || 'No note was added to this order.' }}</p></section>
            </aside>
          </div>
        </div>
      </div>
    </Teleport>

    <Modal v-model="editOrderOpen" title="Edit order" size="full">
      <div class="max-h-[calc(100vh-150px)] space-y-6 overflow-y-auto pr-1">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input v-model="editForm.name" label="Customer name" />
          <Input v-model="editForm.phone" label="Phone number" />
          <Input v-model="editForm.email" label="Email" type="email" />
          <Input v-model="editForm.city" label="City / Thana" />
          <Input v-model="editForm.postalCode" label="Postal code" />
          <Input v-model="editForm.country" label="Country" />
          <Input v-model.number="editForm.estimatedWeightKg" type="number" min="0" step="0.01" label="Total weight (kg)" />
          <div class="md:col-span-2 lg:col-span-3"><Textarea v-model="editForm.address" label="Shipping address" rows="2" /></div>
          <div class="md:col-span-2 lg:col-span-3"><Textarea v-model="editForm.notes" label="Customer note" rows="2" /></div>
        </div>
        <section class="rounded-xl border border-slate-200">
          <div class="border-b border-slate-200 bg-slate-50 px-4 py-3"><h3 class="font-semibold text-slate-950">Cart items</h3></div>
          <div class="divide-y divide-slate-100">
            <div v-for="(item, index) in editItems" :key="item.key" class="grid gap-3 p-4 md:grid-cols-[1fr_130px_100px_120px_40px] md:items-end">
              <div class="flex items-center gap-3"><img :src="item.image" class="h-12 w-12 rounded-lg border object-cover" alt="" /><div><div class="font-medium text-slate-900">{{ item.title }}</div><div class="text-xs text-slate-500">{{ item.sku || 'No SKU' }}</div></div></div>
              <Input v-model.number="item.price" type="number" min="0" step="0.01" label="Unit price" />
              <Input v-model.number="item.qty" type="number" min="1" label="Qty" />
              <div class="pb-2 text-right font-semibold text-slate-900">{{ money(item.price * item.qty, selectedOrder?.currency) }}</div>
              <button class="mb-2 rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="Remove item" @click="removeEditItem(index)"><Trash2 class="h-4 w-4" /></button>
            </div>
          </div>
          <div class="relative border-t border-slate-200 bg-slate-50 p-4">
            <Input v-model="productSearch" label="Add product" placeholder="Search product name or SKU" autocomplete="off" @keyup.escape="closeProductResults" />
            <div v-if="showProductSuggestions" class="absolute left-4 right-4 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
              <div v-if="productSearching" class="px-3 py-3 text-sm text-slate-500">Searching products...</div>
              <div v-if="!productSearching && productResults.length === 0" class="px-3 py-3 text-sm text-slate-500">No matching products found.</div>
              <button v-for="product in productResults" :key="product.id" class="flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left hover:bg-teal-50" @click="addProduct(product)"><img :src="productImage(product)" class="h-10 w-10 rounded-lg border object-cover" alt="" /><span class="min-w-0 flex-1"><span class="block truncate font-medium text-slate-900">{{ product.title }}</span><span class="text-xs text-slate-500">{{ product.sku || 'No SKU' }} · {{ money(product.price, product.currency) }}</span></span></button>
            </div>
          </div>
        </section>
        <div class="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-slate-50 p-4"><Input v-model.number="editForm.shippingFee" class="w-52" type="number" min="0" step="0.01" label="Shipping charge" /><div class="text-right"><div class="text-sm text-slate-500">Calculated item weight {{ formatWeight(editCalculatedWeight) }}</div><div class="text-sm text-slate-500">New total</div><div class="text-xl font-bold text-slate-950">{{ money(editTotal, selectedOrder?.currency) }}</div></div></div>
        <div class="flex justify-end gap-2"><Button variant="ghost" @click="editOrderOpen = false">Cancel</Button><Button variant="primary" :loading="savingOrder" @click="saveOrder">Update order</Button></div>
      </div>
    </Modal>

    <ConfirmDialog
      v-model="deleteCustomerConfirmOpen"
      title="Delete customer"
      message="Delete this customer and all related orders? This action cannot be undone."
      confirm-text="Delete"
      confirm-variant="danger"
      @confirm="confirmDeleteSelectedCustomer"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@matrix-ecommerce/ui';
import { Button, Card, CardBody, Badge, ConfirmDialog, Input, Modal, Pagination, PageHeader, Select, Textarea } from '@matrix-ecommerce/ui';
import { CreditCard, Download, MapPin, Pencil, RefreshCw, Trash2, UserRound, X } from 'lucide-vue-next';

const toast = useToast();
const loading = ref(false);
const orders = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(25);
const totalPages = ref(1);
const pendingFirst = ref(true);
const filters = reactive({
  search: '',
  status: '',
  paymentStatus: '',
  from: '',
  to: '',
});

const customerModalOpen = ref(false);
const customerModalTitle = ref('Customer');
const selectedCustomer = ref<any>(null);
const customerReview = reactive({
  rating: 10,
  note: '',
});
const savingCustomerReview = ref(false);
const deletingCustomer = ref(false);
const deleteCustomerConfirmOpen = ref(false);

const orderModalOpen = ref(false);
const selectedOrder = ref<any>(null);
const editOrderOpen = ref(false);
const savingOrder = ref(false);
const productSearch = ref('');
const productResults = ref<any[]>([]);
const productSearching = ref(false);
const editItems = ref<any[]>([]);
let productSearchTimer: ReturnType<typeof setTimeout> | undefined;
let productSearchController: AbortController | undefined;
let productSearchSequence = 0;
const editForm = reactive({ name: '', phone: '', email: '', address: '', city: '', postalCode: '', country: 'Bangladesh', notes: '', shippingFee: 0, estimatedWeightKg: 0 });
const placeholderImage = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22 viewBox=%220 0 120 120%22%3E%3Crect width=%22120%22 height=%22120%22 fill=%22%23f1f5f9%22/%3E%3Cpath d=%22M35 82l18-22 13 15 9-10 15 17H35z%22 fill=%22%2394a3b8%22/%3E%3C/svg%3E';

const editSubtotal = computed(() => editItems.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0));
const editCalculatedWeight = computed(() => editItems.value.reduce((sum, item) => sum + Number(item.weight_kg || 0) * Number(item.qty || 0), 0));
const editTotal = computed(() => Math.max(0, editSubtotal.value - Number(selectedOrder.value?.discount_amount || 0) + Number(editForm.shippingFee || 0)));
const showProductSuggestions = computed(() => editOrderOpen.value && productSearch.value.trim().length >= 1);

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending_purchase', label: 'Pending purchase' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'in_warehouse', label: 'In warehouse' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const paymentOptions = [
  { value: '', label: 'All payment states' },
  { value: 'unsubmitted', label: 'Unsubmitted' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const fulfillmentOptions = [
  { value: 'pending_purchase', label: 'Pending purchase' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'in_warehouse', label: 'In warehouse' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const dayGroups = computed(() => {
  const map = new Map<string, any[]>();
  for (const order of orders.value) {
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(order);
  }
  return Array.from(map.entries()).map(([day, items]) => ({
    day,
    dayLabel: new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    orders: items,
  }));
});

function badgeVariant(value: string) {
  if (['approved', 'shipped', 'received', 'purchased', 'completed'].includes(value)) return 'success';
  if (['submitted', 'pending_payment', 'pending_review', 'pending_purchase', 'in_warehouse'].includes(value)) return 'warning';
  if (['rejected', 'cancelled'].includes(value)) return 'danger';
  return 'default';
}

function money(amount: number | null | undefined, currency = 'BDT') {
  return `${currency} ${(amount ?? 0).toLocaleString()}`;
}

function itemWeight(item: any) {
  return Number(item?.estimated_weight_kg ?? item?.product?.weight_kg ?? 0);
}

function orderWeight(order: any) {
  if (order?.estimated_weight_kg !== null && order?.estimated_weight_kg !== undefined) return Number(order.estimated_weight_kg || 0);
  return (order?.items || []).reduce((sum: number, item: any) => sum + itemWeight(item) * Number(item.qty || 0), 0);
}

function formatWeight(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function customerName(order: any) {
  return order?.user?.customerProfile?.full_name || order?.user?.email || 'Customer';
}

function customerEmail(order: any) {
  return order?.user?.phone || order?.user?.email || 'N/A';
}

function sellerStateSummary(order: any) {
  const states = Array.from(new Set((order.items || []).map((item: any) => item.seller_status).filter(Boolean)));
  return states.slice(0, 3);
}

function latestProof(order: any) {
  return proofList(order)[0] || null;
}

function proofList(order: any) {
  return [...(order?.paymentProofs || [])]
    .filter((proof: any) => proof?.asset?.public_url)
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

function inputValue(event: Event) {
  return (event.target as HTMLInputElement)?.value || '';
}

function skuDetails(item: any) {
  const details = item?.sku_details_snapshot;
  if (!details) return 'No SKU details';
  if (typeof details === 'string') return details;
  if (Array.isArray(details)) {
    return details
      .map((entry) => (typeof entry === 'string' ? entry : entry?.label || entry?.name || entry?.value))
      .filter(Boolean)
      .join(', ') || 'No SKU details';
  }
  if (typeof details === 'object') {
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }
  return 'No SKU details';
}

function sellerLabel(item: any) {
  return item?.seller_name_snapshot || item?.product?.vendor_name || item?.seller?.sellerProfile?.shop_name || item?.seller?.email || 'N/A';
}

function vendorId(item: any) {
  return item?.vendor_id_snapshot || item?.product?.vendor_id || '';
}

function productUrl(item: any) {
  return item?.product_url_snapshot || item?.source_url_snapshot || item?.product?.product_url || item?.product?.source_url || '';
}

function shopUrl(item: any) {
  return item?.shop_url_snapshot || item?.product?.shop_url || '';
}

async function loadOrders() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/orders', {
      params: {
        page: page.value,
        limit: limit.value,
        search: filters.search || undefined,
        status: filters.status || undefined,
        payment_status: filters.paymentStatus || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        pending_first: pendingFirst.value ? '1' : '0',
      },
    });
    const payload = response.data || {};
    orders.value = payload.orders || [];
    total.value = payload.total || 0;
    totalPages.value = payload.totalPages || 1;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load orders');
  } finally {
    loading.value = false;
  }
}

function onFilterChange() {
  page.value = 1;
  loadOrders();
}

function togglePendingFirst() {
  pendingFirst.value = !pendingFirst.value;
  loadOrders();
}

function handlePageChange(nextPage: number) {
  page.value = nextPage;
  loadOrders();
}

async function updateStatus(orderId: string, status: string | number) {
  try {
    await axios.patch(`/api/admin/orders/${orderId}/status`, { status: String(status) });
    toast.success('Order status updated');
    await loadOrders();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update status');
  }
}

async function updateItemFulfillment(item: any, field: 'purchase_order_no' | 'tracking_no', value: string) {
  const nextValue = value.trim();
  if ((item[field] || '') === nextValue) return;
  try {
    const response = await axios.patch(`/api/admin/order-items/${item.id}/fulfillment`, {
      [field]: nextValue || null,
    });
    item[field] = response.data?.[field] || '';
    toast.success(field === 'purchase_order_no' ? 'Purchase order saved' : 'Tracking number saved');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save fulfillment field');
  }
}

async function openCustomer(order: any) {
  const customerId = order?.user?.id;
  if (!customerId) return;
  customerModalTitle.value = `${customerName(order)} profile`;
  customerModalOpen.value = true;
  selectedCustomer.value = null;
  try {
    const response = await axios.get(`/api/admin/customers/${customerId}`);
    selectedCustomer.value = response.data;
    customerReview.rating = response.data?.customerProfile?.internal_rating ?? 10;
    customerReview.note = response.data?.customerProfile?.internal_note ?? '';
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load customer');
  }
}

function openOrderDetails(order: any) {
  selectedOrder.value = order;
  orderModalOpen.value = true;
}

function itemImage(item: any) {
  return item?.image_url_snapshot || item?.product?.coverAsset?.thumbnail_url || item?.product?.coverAsset?.public_url || placeholderImage;
}

function productImage(product: any) {
  return product?.image_url || product?.coverAsset?.thumbnail_url || product?.coverAsset?.public_url || placeholderImage;
}

function openOrderEditor() {
  const order = selectedOrder.value;
  if (!order) return;
  const address = order.shippingAddress || {};
  Object.assign(editForm, {
    name: address.name || customerName(order), phone: order.user?.phone || address.phone || '', email: order.user?.email || '',
    address: address.address_line || '', city: address.city || '', postalCode: address.postal_code || '', country: address.country || 'Bangladesh',
    notes: order.notes || '', shippingFee: Number(order.shipping_fee || 0), estimatedWeightKg: orderWeight(order),
  });
  editItems.value = (order.items || []).map((item: any) => ({
    key: item.id, id: item.id, product_id: item.product_id, title: item.title_snapshot || item.product?.title,
    sku: item.product?.sku || skuDetails(item), image: itemImage(item), price: Number(item.price_snapshot), qty: Number(item.qty), weight_kg: itemWeight(item),
  }));
  productSearch.value = '';
  productResults.value = [];
  editOrderOpen.value = true;
}

function searchProducts() {
  if (productSearchTimer) clearTimeout(productSearchTimer);
  const search = productSearch.value.trim();
  if (search.length < 2) {
    productSearchController?.abort();
    productSearching.value = false;
    productResults.value = [];
    return;
  }
  productSearching.value = true;
  productResults.value = [];
  productSearchTimer = setTimeout(async () => {
    productSearchController?.abort();
    const controller = new AbortController();
    productSearchController = controller;
    const sequence = ++productSearchSequence;
    try {
      const response = await axios.get('/api/admin/products', { params: { search, limit: 20, source_kind: 'all', autocomplete: '1' }, signal: controller.signal });
      if (sequence === productSearchSequence) productResults.value = response.data?.products || [];
    } catch (error: any) {
      if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') productResults.value = [];
    } finally {
      if (sequence === productSearchSequence) productSearching.value = false;
    }
  }, 180);
}

watch(productSearch, () => {
  if (!editOrderOpen.value) return;
  searchProducts();
});

function closeProductResults() {
  productSearch.value = '';
  productResults.value = [];
  productSearching.value = false;
  productSearchController?.abort();
}

function addProduct(product: any) {
  const existing = editItems.value.find((item) => item.product_id === product.id);
  if (existing) existing.qty += 1;
  else editItems.value.push({ key: `new-${product.id}-${Date.now()}`, product_id: product.id, title: product.title, sku: product.sku, image: productImage(product), price: Number(product.price), qty: 1, weight_kg: Number(product.weight_kg || 0) });
  editForm.estimatedWeightKg = Number(editCalculatedWeight.value.toFixed(2));
  productSearch.value = '';
  productResults.value = [];
  productSearching.value = false;
}

function removeEditItem(index: number) {
  editItems.value.splice(index, 1);
  editForm.estimatedWeightKg = Number(editCalculatedWeight.value.toFixed(2));
}

async function saveOrder() {
  if (!selectedOrder.value || editItems.value.length === 0) { toast.error('An order must contain at least one product'); return; }
  savingOrder.value = true;
  try {
    await axios.patch(`/api/admin/orders/${selectedOrder.value.id}`, {
      customer: { phone: editForm.phone, email: editForm.email || null },
      shipping: { name: editForm.name, phone: editForm.phone, address_line: editForm.address, city: editForm.city, postal_code: editForm.postalCode || null, country: editForm.country },
      notes: editForm.notes || null, shipping_fee: Number(editForm.shippingFee || 0),
      estimated_weight_kg: Number(editForm.estimatedWeightKg || 0),
      items: editItems.value.map((item) => ({ id: item.id, product_id: item.product_id, qty: Number(item.qty), price: Number(item.price) })),
    });
    toast.success('Order updated');
    editOrderOpen.value = false;
    const orderId = selectedOrder.value.id;
    await loadOrders();
    selectedOrder.value = orders.value.find((order) => order.id === orderId) || null;
    if (!selectedOrder.value) orderModalOpen.value = false;
  } catch (error: any) { toast.error(error.response?.data?.error || 'Failed to update order'); }
  finally { savingOrder.value = false; }
}

function escapeInvoice(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
}

function downloadInvoice() {
  const order = selectedOrder.value;
  if (!order) return;
  const rows = order.items.map((item: any) => `<tr><td>${escapeInvoice(item.title_snapshot || item.product?.title)}</td><td>${item.qty}</td><td>${escapeInvoice(money(item.price_snapshot, item.currency_snapshot))}</td><td>${escapeInvoice(money(item.price_snapshot * item.qty, item.currency_snapshot))}</td></tr>`).join('');
  const invoice = `<!doctype html><html><head><title>Invoice ${escapeInvoice(order.order_number)}</title><style>body{font:14px Arial;color:#172033;max-width:850px;margin:36px auto;padding:24px}h1{color:#0f766e;margin-bottom:4px}.meta{color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:32px 0}table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}th:last-child,td:last-child{text-align:right}.totals{margin:24px 0 0 auto;width:320px}.totals div{display:flex;justify-content:space-between;padding:7px}.total{font-size:18px;font-weight:bold;border-top:2px solid #172033}@media print{button{display:none}}</style></head><body><h1>Matrix E-Commerce</h1><div class="meta">Invoice #${escapeInvoice(order.order_number)} · ${escapeInvoice(new Date(order.created_at).toLocaleString())}</div><div class="grid"><div><b>Bill to</b><p>${escapeInvoice(order.shippingAddress?.name)}<br>${escapeInvoice(order.user?.phone || order.shippingAddress?.phone)}<br>${escapeInvoice(order.user?.email || '')}</p></div><div><b>Ship to</b><p>${escapeInvoice(order.shippingAddress?.address_line)}<br>${escapeInvoice(order.shippingAddress?.city)} ${escapeInvoice(order.shippingAddress?.postal_code || '')}<br>${escapeInvoice(order.shippingAddress?.country || 'Bangladesh')}</p></div></div><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>Subtotal</span><span>${escapeInvoice(money(order.subtotal, order.currency))}</span></div><div><span>Shipping</span><span>${escapeInvoice(money(order.shipping_fee, order.currency))}</span></div><div class="total"><span>Total</span><span>${escapeInvoice(money(order.total, order.currency))}</span></div></div><script>window.onload=()=>window.print()<\/script></body></html>`;
  const popup = window.open('', '_blank');
  if (!popup) { toast.error('Allow pop-ups to download the invoice'); return; }
  popup.document.write(invoice);
  popup.document.close();
}

async function saveCustomerReview() {
  if (!selectedCustomer.value?.id) return;
  savingCustomerReview.value = true;
  try {
    await axios.patch(`/api/admin/customers/${selectedCustomer.value.id}/review`, {
      rating: Number(customerReview.rating || 10),
      note: customerReview.note || undefined,
    });
    toast.success('Customer review saved');
    const response = await axios.get(`/api/admin/customers/${selectedCustomer.value.id}`);
    selectedCustomer.value = response.data;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save customer review');
  } finally {
    savingCustomerReview.value = false;
  }
}

async function deleteSelectedCustomer() {
  if (!selectedCustomer.value?.id) return;
  deleteCustomerConfirmOpen.value = true;
}

async function confirmDeleteSelectedCustomer() {
  if (!selectedCustomer.value?.id) return;
  deletingCustomer.value = true;
  try {
    await axios.delete(`/api/admin/users/${selectedCustomer.value.id}`);
    toast.success('Customer deleted');
    customerModalOpen.value = false;
    deleteCustomerConfirmOpen.value = false;
    await loadOrders();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete customer');
  } finally {
    deletingCustomer.value = false;
  }
}

onMounted(loadOrders);
</script>
