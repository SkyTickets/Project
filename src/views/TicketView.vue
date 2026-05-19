<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import useTicketStore from '@/stores/ticket.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const ticketStore = useTicketStore()

const ticket = ref(null)
const loading = ref(true)

const ticketId = Number(route.params.id)

onMounted(async () => {
  await ticketStore.getTicket(ticketId)
  if (ticketStore.ticketError) {
    toast.error(ticketStore.ticketError)
    router.back()
    return
  }
  ticket.value = ticketStore.currentTicket
  loading.value = false
})

const formatTime = (date) => format(new Date(date), 'HH:mm')
const formatDate = (date) => format(new Date(date), 'd MMM yyyy', { locale: ru })
const formatDay = (date) => format(new Date(date), 'EEE', { locale: ru })

const duration = computed(() => {
  if (!ticket.value?.fDepartureTime || !ticket.value?.fArrivalTime) return ''
  const dep = new Date(ticket.value.fDepartureTime)
  const arr = new Date(ticket.value.fArrivalTime)
  const diff = (arr - dep) / 60000
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return `${h}ч ${m}м`
})

const classColor = computed(() => {
  const colors = {
    'Эконом': '#2196F3',
    'Комфорт': '#4CAF50',
    'Бизнес': '#FF9800',
    'Первый класс': '#9C27B0',
  }
  return colors[ticket.value?.tClass] || '#2196F3'
})

const isCancelled = computed(() => ticket.value?.tStatus === 'Отменен')

const imageUrl = computed(() => {
  if (!ticket.value?.airlineImage) return null
  return `http://localhost:3000/images${ticket.value.airlineImage}`
})

const onImageError = (e) => {
  e.target.style.display = 'none'
  e.target.nextElementSibling?.style.setProperty('display', 'flex')
}

const print = () => window.print()
const goBack = () => router.back()
</script>

<template>
  <div class="ticket-page">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Загрузка билета...</p>
    </div>

    <div v-else-if="ticket" class="ticket-wrapper">
      <!-- Actions bar -->
      <div class="actions-bar no-print">
        <button class="btn-back" @click="goBack">← Назад</button>
        <div class="actions-right">
          <button class="btn-print" @click="print">🖨 Распечатать</button>
        </div>
      </div>

      <!-- Ticket card -->
      <div class="ticket" :class="{ cancelled: isCancelled }">
        <!-- Header -->
        <div class="ticket-header">
          <div class="airline-info">
            <div class="airline-logo-wrap">
              <img
                v-if="imageUrl"
                :src="imageUrl"
                :alt="ticket.fAirline"
                class="airline-logo"
                @error="onImageError"
              />
              <div class="airline-logo-placeholder" :style="{ display: imageUrl ? 'none' : 'flex' }">
                {{ (ticket.fAirline || '?').charAt(0) }}
              </div>
            </div>
            <div>
              <div class="airline-name">{{ ticket.fAirline }}</div>
              <div class="ticket-num">Билет № {{ ticket.tId }}</div>
            </div>
          </div>
          <div class="status-badge" :class="ticket.tStatus?.toLowerCase().replace(' ', '-')">
            {{ ticket.tStatus }}
          </div>
        </div>

        <!-- Divider -->
        <div class="divider-line"></div>

        <!-- Route -->
        <div class="route-section">
          <div class="route-point">
            <div class="route-time">{{ formatTime(ticket.fDepartureTime) }}</div>
            <div class="route-airport">{{ ticket.fDepartureAirport }}</div>
            <div class="route-date">{{ formatDate(ticket.fDepartureTime) }}, {{ formatDay(ticket.fDepartureTime) }}</div>
          </div>

          <div class="route-middle">
            <div class="route-duration">{{ duration }}</div>
            <div class="route-line">
              <div class="route-dot left"></div>
              <div class="route-arrow">✈</div>
              <div class="route-dot right"></div>
            </div>
            <div class="route-direct">Прямой рейс</div>
          </div>

          <div class="route-point right">
            <div class="route-time">{{ formatTime(ticket.fArrivalTime) }}</div>
            <div class="route-airport">{{ ticket.fArrivalAirport }}</div>
            <div class="route-date">{{ formatDate(ticket.fArrivalTime) }}, {{ formatDay(ticket.fArrivalTime) }}</div>
          </div>
        </div>

        <!-- Tear line -->
        <div class="tear-line">
          <div class="tear-circle left"></div>
          <div class="tear-dashes"></div>
          <div class="tear-circle right"></div>
        </div>

        <!-- Passenger & details -->
        <div class="details-section">
          <div class="detail-group">
            <div class="detail-label">ПАССАЖИР</div>
            <div class="detail-value">{{ ticket.tUser }}</div>
            <div class="detail-latin">{{ ticket.tUserLatin }}</div>
          </div>

          <div class="detail-group">
            <div class="detail-label">КЛАСС</div>
            <div class="detail-value class-badge" :style="{ background: classColor }">
              {{ ticket.tClass }}
            </div>
          </div>

          <div class="detail-group">
            <div class="detail-label">ДАТА ПОКУПКИ</div>
            <div class="detail-value">{{ formatDate(ticket.tBoughtDate) }}</div>
          </div>

          <div class="detail-group price-group">
            <div class="detail-label">СТОИМОСТЬ</div>
            <div class="detail-value price">{{ ticket.tTotalPrice.toLocaleString('ru-RU') }} ₽</div>
          </div>
        </div>

        <!-- Watermark for cancelled -->
        <div v-if="isCancelled" class="cancelled-watermark">ОТМЕНЁН</div>
      </div>

      <!-- Info note -->
      <p class="info-note no-print">
        Для посадки на борт предъявите этот билет и документ, удостоверяющий личность.
      </p>
    </div>
  </div>
</template>

<style scoped>
.ticket-page {
  min-height: 100vh;
  background: #f0f4f8;
  padding: 24px 16px;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 16px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #2196F3;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.ticket-wrapper {
  max-width: 680px;
  margin: 0 auto;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-back {
  background: none;
  border: none;
  color: #2196F3;
  font-size: 15px;
  cursor: pointer;
  padding: 8px 0;
}

.btn-print {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  color: #333;
}

.btn-print:hover {
  background: #f5f5f5;
}

/* TICKET */
.ticket {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.12);
  overflow: hidden;
  position: relative;
}

.ticket.cancelled {
  opacity: 0.85;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 100%);
  color: white;
}

.airline-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.airline-logo-wrap {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.airline-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.airline-logo-placeholder {
  width: 100%;
  height: 100%;
  background: #e3f2fd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #1565C0;
}

.airline-name {
  font-size: 18px;
  font-weight: 600;
}

.ticket-num {
  font-size: 13px;
  opacity: 0.75;
  margin-top: 2px;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
}

.status-badge.куплен {
  background: rgba(76, 175, 80, 0.3);
}

.status-badge.отменен {
  background: rgba(244, 67, 54, 0.3);
}

.divider-line {
  height: 1px;
  background: #e8ecf0;
}

/* Route section */
.route-section {
  display: flex;
  align-items: center;
  padding: 28px 28px 20px;
  gap: 12px;
}

.route-point {
  flex: 1;
}

.route-point.right {
  text-align: right;
}

.route-time {
  font-size: 40px;
  font-weight: 700;
  color: #0d0d0d;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.route-airport {
  font-size: 15px;
  color: #333;
  margin-top: 6px;
  font-weight: 500;
}

.route-date {
  font-size: 13px;
  color: #888;
  margin-top: 3px;
}

.route-middle {
  flex: 0 0 140px;
  text-align: center;
}

.route-duration {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.route-line {
  display: flex;
  align-items: center;
  gap: 4px;
}

.route-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1976D2;
  flex-shrink: 0;
}

.route-arrow {
  flex: 1;
  text-align: center;
  font-size: 18px;
  color: #1976D2;
}

.route-direct {
  font-size: 12px;
  color: #4CAF50;
  margin-top: 6px;
  font-weight: 500;
}

/* Tear line */
.tear-line {
  display: flex;
  align-items: center;
  padding: 0 0;
  position: relative;
  height: 2px;
  background: transparent;
}

.tear-circle {
  width: 24px;
  height: 24px;
  background: #f0f4f8;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

.tear-circle.left { left: -12px; }
.tear-circle.right { right: -12px; }

.tear-dashes {
  flex: 1;
  border-top: 2px dashed #ddd;
  margin: 0 20px;
}

/* Details section */
.details-section {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0;
  padding: 24px 28px 28px;
}

.detail-group {
  padding: 0 16px 0 0;
  border-right: 1px solid #f0f0f0;
}

.detail-group:last-child {
  border-right: none;
  padding-right: 0;
}

.detail-group:not(:first-child) {
  padding-left: 16px;
}

.detail-label {
  font-size: 10px;
  font-weight: 700;
  color: #999;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.detail-value {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.detail-latin {
  font-size: 12px;
  color: #888;
  margin-top: 3px;
  font-style: italic;
  letter-spacing: 0.5px;
}

.class-badge {
  display: inline-block;
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.price {
  font-size: 20px;
  color: #1565C0;
}

.price-group {
  text-align: right;
  border-right: none;
}

/* Cancelled watermark */
.cancelled-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-25deg);
  font-size: 72px;
  font-weight: 900;
  color: rgba(244, 67, 54, 0.12);
  pointer-events: none;
  white-space: nowrap;
  letter-spacing: 8px;
}

.info-note {
  text-align: center;
  color: #999;
  font-size: 13px;
  margin-top: 16px;
}

@media (max-width: 600px) {
  .details-section {
    grid-template-columns: 1fr 1fr;
    row-gap: 20px;
  }
  .detail-group:nth-child(2) { border-right: none; }
  .detail-group:nth-child(3) { border-right: 1px solid #f0f0f0; padding-left: 0; }
  .route-time { font-size: 28px; }
  .price-group { text-align: left; }
}

@media print {
  .no-print { display: none !important; }
  .ticket-page { background: white; padding: 0; }
  .ticket { box-shadow: none; border: 1px solid #eee; }
}
</style>
