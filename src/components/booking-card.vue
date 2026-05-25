<script setup>
import { computed, ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import useBookingStore from '@/stores/booking.js'
import useAdditionalServiceStore from '@/stores/additionalService.js'

const props = defineProps({
  booking: { type: Object, required: true },
})

const bookingStore = useBookingStore()
const serviceStore = useAdditionalServiceStore()
const toast = useToast()
const router = useRouter()

const expanded = ref(false)
const cancelling = ref(false)
const showPayModal = ref(false)
const paying = ref(false)

// Выбранные услуги: { [ticketId]: Set<serviceId> }
const selectedServices = ref({})

const status = computed(() => props.booking.bStatus)
const isCancelled = computed(() => status.value === 'Отменен')
const isPaid = computed(() => status.value === 'Оплачен')
const canCancel = computed(() => !isCancelled.value && !isPaid.value)
const canPay = computed(() => !isCancelled.value && !isPaid.value)

const statusClass = computed(() => ({
  'status-booked': status.value === 'Забронирован',
  'status-paid': isPaid.value,
  'status-cancelled': isCancelled.value,
}))

const fmtDate = (d) => {
  if (!d) return '—'
  return format(new Date(d), 'd MMM yyyy, HH:mm', { locale: ru })
}

onMounted(async () => {
  if (!serviceStore.servicesList.length) {
    await serviceStore.getServices()
  }
})

// Инициализировать выбор услуг при открытии модалки
const openPayModal = () => {
  selectedServices.value = {}
  props.booking.tickets?.forEach((t) => {
    selectedServices.value[t.tId] = new Set(t.services?.map((s) => s.asId) ?? [])
  })
  showPayModal.value = true
}

const toggleService = (ticketId, serviceId) => {
  if (!selectedServices.value[ticketId]) {
    selectedServices.value[ticketId] = new Set()
  }
  const set = selectedServices.value[ticketId]
  if (set.has(serviceId)) {
    set.delete(serviceId)
  } else {
    set.add(serviceId)
  }
  // Trigger reactivity
  selectedServices.value = { ...selectedServices.value }
}

const isServiceSelected = (ticketId, serviceId) =>
  selectedServices.value[ticketId]?.has(serviceId) ?? false

// Итоговая стоимость с учётом выбранных услуг
const computedTotal = computed(() => {
  let total = 0
  props.booking.tickets?.forEach((ticket) => {
    total += ticket.tPrice ?? 0
    const selected = selectedServices.value[ticket.tId] ?? new Set()
    serviceStore.servicesList.forEach((s) => {
      if (selected.has(s.asId)) total += s.asPrice
    })
  })
  return total
})

const pay = async () => {
  if (paying.value) return
  paying.value = true

  const services = Object.entries(selectedServices.value).map(([ticketId, set]) => ({
    ticketId: Number(ticketId),
    serviceIds: [...set],
  }))

  const result = await bookingStore.payBooking({
    bId: props.booking.bId,
    services,
  })

  if (bookingStore.bookingError || !result) {
    toast.error(bookingStore.bookingError || 'Ошибка при оплате')
  } else {
    toast.success('Оплачено! Билеты отправлены на вашу почту')
    showPayModal.value = false
  }
  paying.value = false
}

const cancel = async () => {
  if (!confirm('Отменить бронирование? Это действие нельзя отменить.')) return
  cancelling.value = true
  await bookingStore.changeBookingStatus({ ...props.booking, bStatus: 'Отменен' })
  if (bookingStore.bookingError) {
    toast.error(bookingStore.bookingError)
  } else {
    toast.success('Бронирование отменено')
  }
  cancelling.value = false
}

const viewTicket = (ticketId) => {
  router.push({ name: 'TicketView', params: { id: ticketId } })
}
</script>

<template>
  <div class="booking-card" :class="{ cancelled: isCancelled }">
    <!-- Шапка -->
    <div class="card-header" @click="expanded = !expanded">
      <div class="header-left">
        <div class="airline-badge">{{ (booking.fAirline || '?').charAt(0) }}</div>
        <div class="route-info">
          <span class="route">{{ booking.fDepartureAirport }} → {{ booking.fArrivalAirport }}</span>
          <span class="dates">
            {{ fmtDate(booking.fDepartureTime) }} — {{ fmtDate(booking.fArrivalTime) }}
          </span>
        </div>
      </div>
      <div class="header-right">
        <div class="total-price">{{ booking.bTotalPrice?.toLocaleString('ru-RU') }} ₽</div>
        <span class="status-badge" :class="statusClass">{{ status }}</span>
        <span class="expand-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </div>

    <!-- Раскрытый блок -->
    <div v-if="expanded" class="tickets-section">
      <div class="section-label">Пассажиры и билеты</div>

      <div
        v-for="ticket in booking.tickets"
        :key="ticket.tId"
        class="ticket-row"
        @click="isPaid ? viewTicket(ticket.tId) : null"
        :style="isPaid ? 'cursor:pointer' : ''"
      >
        <div class="ticket-passenger">{{ ticket.tPassenger || '—' }}</div>
        <div class="ticket-class">{{ ticket.tClass }}</div>
        <div class="ticket-price">{{ ticket.tPrice?.toLocaleString('ru-RU') }} ₽</div>
        <div v-if="ticket.services?.length" class="ticket-services-chips">
          <span v-for="s in ticket.services" :key="s.asId" class="chip">{{ s.asName }}</span>
        </div>
        <div v-if="isPaid" class="ticket-view">Просмотр →</div>
      </div>

      <!-- Действия -->
      <div class="card-actions">
        <button
          v-if="canPay"
          class="btn-pay"
          @click.stop="openPayModal"
        >
          Выбрать услуги и оплатить
        </button>
        <button
          v-if="canCancel"
          class="btn-cancel"
          :disabled="cancelling"
          @click.stop="cancel"
        >
          {{ cancelling ? 'Отменяем...' : 'Отменить' }}
        </button>
        <span v-if="isPaid" class="paid-note">✓ Оплачено — билеты отправлены на почту</span>
        <span v-if="isCancelled" class="cancelled-note">Бронирование отменено</span>
      </div>
    </div>
  </div>

  <!-- Модалка оплаты с услугами -->
  <Teleport to="body">
    <div v-if="showPayModal" class="modal-overlay" @click.self="showPayModal = false">
      <div class="pay-modal">
        <div class="pay-modal-header">
          <h3>Дополнительные услуги и оплата</h3>
          <button class="close-btn" @click="showPayModal = false">✕</button>
        </div>

        <div class="pay-modal-body">
          <div
            v-for="ticket in booking.tickets"
            :key="ticket.tId"
            class="ticket-services-block"
          >
            <div class="ticket-services-title">
              {{ ticket.tPassenger || 'Пассажир' }}
              <span class="ticket-class-badge">{{ ticket.tClass }}</span>
              <span class="ticket-base-price">{{ ticket.tPrice?.toLocaleString('ru-RU') }} ₽</span>
            </div>

            <div class="services-grid">
              <label
                v-for="svc in serviceStore.servicesList"
                :key="svc.asId"
                class="service-option"
                :class="{ selected: isServiceSelected(ticket.tId, svc.asId) }"
                @click="toggleService(ticket.tId, svc.asId)"
              >
                <div class="service-check">
                  <span v-if="isServiceSelected(ticket.tId, svc.asId)">✓</span>
                </div>
                <div class="service-info">
                  <span class="service-name">{{ svc.asName }}</span>
                  <span class="service-price">+{{ svc.asPrice.toLocaleString('ru-RU') }} ₽</span>
                </div>
              </label>

              <p v-if="!serviceStore.servicesList.length" class="no-services">
                Дополнительных услуг нет
              </p>
            </div>
          </div>
        </div>

        <div class="pay-modal-footer">
          <div class="total-line">
            <span>Итого к оплате:</span>
            <strong>{{ computedTotal.toLocaleString('ru-RU') }} ₽</strong>
          </div>
          <p class="email-note">
            После оплаты билеты будут отправлены на вашу почту
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showPayModal = false">Отмена</button>
            <button class="btn-confirm-pay" :disabled="paying" @click="pay">
              {{ paying ? 'Оплачиваем...' : `Оплатить ${computedTotal.toLocaleString('ru-RU')} ₽` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.booking-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: visible;
  transition: box-shadow 0.2s;
}
.booking-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.booking-card.cancelled { opacity: 0.65; }

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
}

.header-left { display: flex; align-items: center; gap: 14px; }

.airline-badge {
  width: 42px; height: 42px; border-radius: 10px;
  background: #e8f0fe; color: #1565c0;
  font-size: 20px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.route-info { display: flex; flex-direction: column; gap: 3px; }
.route { font-size: 15px; font-weight: 600; color: #111; }
.dates { font-size: 13px; color: #6b7280; }

.header-right { display: flex; align-items: center; gap: 14px; }
.total-price { font-size: 17px; font-weight: 700; color: #111; }

.status-badge {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
}
.status-booked { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
.status-paid { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.status-cancelled { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.expand-icon { color: #9ca3af; font-size: 12px; }

.tickets-section {
  border-top: 1px solid #f3f4f6;
  padding: 16px 20px;
  background: #fafafa;
}
.section-label {
  font-size: 12px; font-weight: 600; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;
}

.ticket-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 8px;
  transition: background 0.15s;
}
.ticket-row:hover { background: #f5f4ff; }
.ticket-passenger { font-size: 14px; font-weight: 500; color: #111; flex: 1; min-width: 120px; }
.ticket-class {
  font-size: 13px; color: #6b7280; background: #f3f4f6;
  padding: 2px 8px; border-radius: 6px;
}
.ticket-price { font-size: 14px; font-weight: 600; color: #111; }
.ticket-services-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip {
  font-size: 11px; background: #ede9fe; color: #6d28d9;
  padding: 2px 7px; border-radius: 10px;
}
.ticket-view { font-size: 13px; color: var(--color-purple-blue); }

.card-actions {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-pay {
  padding: 8px 20px;
  background: var(--color-purple-blue);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-pay:hover { opacity: 0.9; }

.btn-cancel {
  padding: 8px 16px;
  background: #fff0f0; color: #dc2626;
  border: 1px solid #fecaca; border-radius: 8px;
  font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-cancel:hover:not(:disabled) { background: #fee2e2; }
.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.paid-note { font-size: 13px; color: #16a34a; font-weight: 500; }
.cancelled-note { font-size: 13px; color: #dc2626; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}

.pay-modal {
  background: white;
  border-radius: 16px;
  width: 100%; max-width: 580px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.pay-modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
}
.pay-modal-header h3 { font-size: 17px; font-weight: 700; color: #111; }
.close-btn {
  background: none; border: none; font-size: 18px;
  color: #9ca3af; cursor: pointer; padding: 4px;
}
.close-btn:hover { color: #374151; }

.pay-modal-body {
  flex: 1; overflow-y: auto;
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 20px;
}

.ticket-services-block { }

.ticket-services-title {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; font-weight: 600; color: #111;
  margin-bottom: 12px;
}
.ticket-class-badge {
  font-size: 11px; background: #ede9fe; color: #6d28d9;
  padding: 2px 8px; border-radius: 10px;
}
.ticket-base-price { font-size: 13px; color: #6b7280; margin-left: auto; }

.services-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}

.service-option {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb; border-radius: 8px;
  cursor: pointer; transition: all 0.15s;
  user-select: none;
}
.service-option:hover { border-color: #a5b4fc; background: #faf9ff; }
.service-option.selected { border-color: #7c3aed; background: #f5f3ff; }

.service-check {
  width: 20px; height: 20px; border-radius: 4px;
  border: 2px solid #d1d5db; background: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #7c3aed;
  flex-shrink: 0; transition: all 0.15s;
}
.service-option.selected .service-check {
  border-color: #7c3aed; background: #7c3aed; color: white;
}

.service-info { display: flex; flex-direction: column; gap: 2px; }
.service-name { font-size: 13px; color: #374151; font-weight: 500; }
.service-price { font-size: 12px; color: #6b7280; }

.no-services { color: #9ca3af; font-size: 13px; grid-column: 1/-1; }

.pay-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
}

.total-line {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 16px; color: #111; margin-bottom: 8px;
}
.total-line strong { font-size: 22px; color: #1565c0; }

.email-note {
  font-size: 12px; color: #9ca3af; margin-bottom: 14px;
}

.modal-actions {
  display: flex; gap: 10px; justify-content: flex-end;
}

.btn-secondary {
  padding: 10px 20px; border: 1px solid #d1d5db; border-radius: 8px;
  background: white; color: #374151; font-size: 14px; font-weight: 600; cursor: pointer;
}

.btn-confirm-pay {
  padding: 10px 24px; border: none; border-radius: 8px;
  background: #16a34a; color: white;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
}
.btn-confirm-pay:hover:not(:disabled) { background: #15803d; }
.btn-confirm-pay:disabled { background: #86efac; cursor: not-allowed; }
</style>
