<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import useTicketStore from '@/stores/ticket.js'
import useBookingStore from '@/stores/booking.js'
import useUserStore from '@/stores/user.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const ticketStore = useTicketStore()
const userStore = useUserStore()
const bookingStore = useBookingStore()

const ticket = ref(null)
const booking = ref(null)
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

  await bookingStore.getBooking(ticket.value.tBooking)
  if (bookingStore.bookingError) {
    toast.error(bookingStore.bookingError)
    router.back()
    return
  }
  booking.value = bookingStore.currentBooking

  if (
    booking.value.bUser !== userStore.currentUser.uId &&
    userStore.currentUser.uRole !== 'Менеджер'
  ) {
    toast.error('У вас нет прав для просмотра этого билета')
    router.replace('/')
    return
  }

  loading.value = false
})

const formatTime = (date) => format(new Date(date), 'HH:mm')
const formatDate = (date) => format(new Date(date), 'd MMM yyyy', { locale: ru })
const formatDay = (date) => format(new Date(date), 'EEE', { locale: ru })

const duration = computed(() => {
  if (!ticket.value?.fDepartureTime || !ticket.value?.fArrivalTime) return ''
  const diff = (new Date(ticket.value.fArrivalTime) - new Date(ticket.value.fDepartureTime)) / 60000
  return `${Math.floor(diff / 60)}ч ${diff % 60}м`
})

const classColor = computed(
  () =>
    ({
      Эконом: '#2196F3',
      Комфорт: '#4CAF50',
      Бизнес: '#FF9800',
      'Первый класс': '#9C27B0',
    })[ticket.value?.tClass] || '#2196F3',
)

const isCancelled = computed(() => booking.value?.bStatus === 'Отменен')

const servicesTotal = computed(() =>
  (ticket.value?.services ?? []).reduce((sum, s) => sum + (s?.asPrice ?? 0), 0),
)

const totalPrice = computed(() => (ticket.value?.tPrice ?? 0) + servicesTotal.value)

const imageUrl = computed(() => {
  if (!ticket.value?.airlineImage) return null
  return `http://localhost:5267/images${ticket.value.airlineImage}`
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
      <!-- Панель действий -->
      <div class="actions-bar no-print">
        <button class="btn-back" @click="goBack">← Назад</button>
        <button class="btn-print" @click="print">🖨 Распечатать</button>
      </div>

      <!-- Сам билет -->
      <div class="ticket" :class="{ cancelled: isCancelled }">
        <!-- Шапка: авиакомпания + номер + статус бронирования -->
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
              <div
                class="airline-logo-placeholder"
                :style="{ display: imageUrl ? 'none' : 'flex' }"
              >
                {{ (ticket.fAirline || '?').charAt(0) }}
              </div>
            </div>
            <div>
              <div class="airline-name">{{ ticket.fAirline }}</div>
              <div class="ticket-num">
                Электронный билет № {{ ticket.tId }} · Бронирование № {{ ticket.tBooking }}
              </div>
            </div>
          </div>
          <div class="status-badge" :class="booking.bStatus?.toLowerCase().replace(' ', '-')">
            {{ booking.bStatus }}
          </div>
        </div>

        <div class="divider-line"></div>

        <!-- Маршрут -->
        <div class="route-section">
          <div class="route-point">
            <div class="route-time">{{ formatTime(ticket.fDepartureTime) }}</div>
            <div class="route-airport">{{ ticket.fDepartureAirport }}</div>
            <div class="route-date">
              {{ formatDate(ticket.fDepartureTime) }}, {{ formatDay(ticket.fDepartureTime) }}
            </div>
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
            <div class="route-date">
              {{ formatDate(ticket.fArrivalTime) }}, {{ formatDay(ticket.fArrivalTime) }}
            </div>
          </div>
        </div>

        <!-- Линия отрыва -->
        <div class="tear-line">
          <div class="tear-circle left"></div>
          <div class="tear-dashes"></div>
          <div class="tear-circle right"></div>
        </div>

        <!-- Пассажир / Класс / Дата покупки / Тариф -->
        <div class="details-section">
          <div class="detail-group">
            <div class="detail-label">ПАССАЖИР</div>
            <div class="detail-value">{{ ticket.tPassenger }}</div>
            <div class="detail-latin" v-if="ticket.tPassengerLatin">
              {{ ticket.tPassengerLatin }}
            </div>
          </div>
          <div class="detail-group">
            <div class="detail-label">КЛАСС</div>
            <div class="detail-value class-badge" :style="{ background: classColor }">
              {{ ticket.tClass }}
            </div>
          </div>
          <div class="detail-group">
            <div class="detail-label">ДАТА ПОКУПКИ</div>
            <div class="detail-value">{{ formatDate(booking.bCreatedAt) }}</div>
          </div>
          <div class="detail-group price-group">
            <div class="detail-label">ТАРИФ</div>
            <div class="detail-value price">{{ ticket.tPrice?.toLocaleString('ru-RU') }} ₽</div>
          </div>
        </div>

        <!-- Дополнительные услуги (если есть — зеркалит servicesHtml из SendEmail.cs) -->
        <div v-if="ticket.services?.length" class="services-section">
          <div class="detail-label">ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ</div>
          <div class="services-list">
            <div v-for="svc in ticket.services" :key="svc?.asId" class="service-row">
              <span class="service-name">{{ svc?.asName }}</span>
              <span class="service-price">{{ svc?.asPrice?.toLocaleString('ru-RU') }} ₽</span>
            </div>
            <div class="services-subtotal">
              <span>Итого за услуги</span>
              <span>{{ servicesTotal.toLocaleString('ru-RU') }} ₽</span>
            </div>
          </div>
        </div>

        <!-- Итоговая стоимость (тариф + услуги, как в email) -->
        <div class="total-section">
          <div class="total-bar">
            <span class="total-label">Итого к оплате</span>
            <span class="total-price">{{ totalPrice.toLocaleString('ru-RU') }} ₽</span>
          </div>
        </div>

        <!-- Водяной знак для отменённых -->
        <div v-if="isCancelled" class="cancelled-watermark">ОТМЕНЁН</div>
      </div>

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
  border-top-color: #2196f3;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

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
  color: #2196f3;
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

.ticket {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
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
  background: linear-gradient(135deg, #1565c0 0%, #1976d2 100%);
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
  color: #1565c0;
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
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.status-badge.забронирован {
  background: rgba(255, 193, 7, 0.35);
}
.status-badge.оплачен {
  background: rgba(76, 175, 80, 0.35);
}
.status-badge.отменен {
  background: rgba(244, 67, 54, 0.35);
}

.divider-line {
  height: 1px;
  background: #e8ecf0;
}

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
  background: #1976d2;
  flex-shrink: 0;
}
.route-arrow {
  flex: 1;
  text-align: center;
  font-size: 18px;
  color: #1976d2;
}
.route-direct {
  font-size: 12px;
  color: #4caf50;
  margin-top: 6px;
  font-weight: 500;
}

.tear-line {
  display: flex;
  align-items: center;
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
.tear-circle.left {
  left: -12px;
}
.tear-circle.right {
  right: -12px;
}
.tear-dashes {
  flex: 1;
  border-top: 2px dashed #ddd;
  margin: 0 20px;
}

.details-section {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0;
  padding: 24px 28px 20px;
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
  color: #aaa;
  letter-spacing: 0.8px;
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
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}
.price {
  font-size: 18px;
  color: #1565c0;
}
.price-group {
  text-align: right;
  border-right: none;
}

.services-section {
  margin: 0 28px 20px;
  background: #f8f7ff;
  border-radius: 10px;
  padding: 16px 20px;
}
.services-section .detail-label {
  margin-bottom: 12px;
}
.services-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.service-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #555;
}
.service-name {
  flex: 1;
}
.service-price {
  font-weight: 600;
  color: #374151;
}
.services-subtotal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  margin-top: 6px;
  border-top: 1px solid #e0dfff;
  font-size: 14px;
  font-weight: 700;
  color: #1e1b4b;
}

.total-section {
  padding: 0 28px 28px;
}
.total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1e1b4b;
  border-radius: 10px;
  padding: 14px 20px;
}
.total-label {
  font-size: 14px;
  color: #a5b4fc;
}
.total-price {
  font-size: 24px;
  font-weight: 800;
  color: white;
}

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
  .detail-group:nth-child(2) {
    border-right: none;
  }
  .detail-group:nth-child(3) {
    border-right: 1px solid #f0f0f0;
    padding-left: 0;
  }
  .route-time {
    font-size: 28px;
  }
  .price-group {
    text-align: left;
  }
}

@media print {
  .no-print {
    display: none !important;
  }
  .ticket-page {
    background: white;
    padding: 0;
  }
  .ticket {
    box-shadow: none;
    border: 1px solid #eee;
  }
}
</style>
