<script setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import useFlightStore from '@/stores/flight.js'
import useUserStore from '@/stores/user.js'
import useTicketStore from '@/stores/ticket.js'

const flightStore = useFlightStore()
const ticketStore = useTicketStore()
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const flightId = Number(route.params.id)
const selectedClass = ref('Эконом')

const gottenFlight = ref(null)

onBeforeMount(async () => {
  gottenFlight.value = await flightStore.getFlight(flightId)

  if (flightStore.flightError) {
    toast.error(flightStore.flightError)
  }
})

const classMultipliers = {
  'Эконом': 1,
  'Комфорт': 1.5,
  'Бизнес': 2,
  'Первый класс': 3,
}

const tariffRules = {
  'Эконом': {
    handLuggage: { allowed: true, weight: '8 кг', size: '55×23×40 см' },
    baggage: { allowed: false },
    refund: { allowed: false },
  },
  'Комфорт': {
    handLuggage: { allowed: true, weight: '10 кг', size: '55×23×40 см' },
    baggage: { allowed: true, weight: '23 кг', count: 1 },
    refund: { allowed: false },
  },
  'Бизнес': {
    handLuggage: { allowed: true, weight: '15 кг', size: '55×23×40 см' },
    baggage: { allowed: true, weight: '32 кг', count: 2 },
    refund: { allowed: true },
  },
  'Первый класс': {
    handLuggage: { allowed: true, weight: '15 кг', size: '55×23×40 см' },
    baggage: { allowed: true, weight: '32 кг', count: 3 },
    refund: { allowed: true },
  },
}

const currentTariff = computed(() => tariffRules[selectedClass.value])
const flight = computed(() => gottenFlight.value)
const finalPrice = computed(() => {
  if (!flight.value) return 0
  const basePrice = flight.value.fPrice
  const multiplier = classMultipliers[selectedClass.value]
  return Math.round(basePrice * multiplier)
})

const formatTime = (date) => format(new Date(date), 'HH:mm', { locale: ru })
const formatDate = (date) => format(new Date(date), 'd MMM', { locale: ru })
const formatDay = (date) => format(new Date(date), 'EEE', { locale: ru }).slice(0, 3)

const duration = computed(() => {
  if (!flight.value) return ''
  const dep = new Date(flight.value.fDepartureTime)
  const arr = new Date(flight.value.fArrivalTime)
  const diff = (arr - dep) / 60000
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return `${h}ч ${m}м в полёте`
})

const buyTicket = async () => {
  if (!flight.value) return
  if (!userStore.currentUser) {
    toast.error('Войдите в аккаунт')
    return
  }

  const ticketData = {
    flightId: flight.value.fId,
    userEmail: userStore.currentUser.uEmail,
    class: selectedClass.value,
    price: finalPrice.value,
  }
  await ticketStore.addTicket(ticketData)

  if (ticketStore.ticketError) {
    toast.error(ticketStore.ticketError)
    return
  }
  toast.success('Билет успешно оформлен!')
  router.back()
}
</script>

<template>
  <div class="flight-detail-page" v-if="flight">
    <div class="class-selector">
      <h3>Класс обслуживания</h3>
      <div class="class-options">
        <label v-for="cls in ['Эконом', 'Комфорт', 'Бизнес', 'Первый класс']" :key="cls">
          <input type="radio" v-model="selectedClass" :value="cls" name="flightClass" />
          <span>{{ cls }}</span>
          <span class="price-preview" v-if="flight">
            {{ Math.round(flight.fPrice * classMultipliers[cls]) }} ₽
          </span>
        </label>
      </div>
    </div>
    <div class="tariff-card">
      <h3>Условия тарифа</h3>
      <ul>
        <li>
          <span :class="['check', currentTariff.handLuggage.allowed ? 'green' : 'cross']">
            {{ currentTariff.handLuggage.allowed ? '✔️' : '❌' }}
          </span>
          Ручная кладь {{ currentTariff.handLuggage.weight }} — 1 шт
          <span class="size">{{ currentTariff.handLuggage.size }}</span>
        </li>
        <li>
          <span :class="['check', currentTariff.baggage.allowed ? 'green' : 'cross']">
            {{ currentTariff.baggage.allowed ? '✔️' : '❌' }}
          </span>
          Багаж
          <template v-if="currentTariff.baggage.allowed">
            {{ currentTariff.baggage.weight }} — {{ currentTariff.baggage.count }} шт
          </template>
        </li>
        <li>
          <span :class="['check', currentTariff.refund.allowed ? 'green' : 'cross']">
            {{ currentTariff.refund.allowed ? '✔️' : '❌' }}
          </span>
          Возврат
        </li>
      </ul>
    </div>

    <div class="route-card">
      <div class="segment">
        <div class="segment-header">
          <div class="airline">
            <span class="logo">{{ flight.fAirline }}</span>
            <span class="duration">{{ duration }}</span>
          </div>
        </div>

        <div class="timeline">
          <div class="point">
            <div class="time">{{ formatTime(flight.fDepartureTime) }}</div>
            <div class="airport">{{ flight.fDepartureAirport }}</div>
            <div class="date">
              {{ formatDate(flight.fDepartureTime) }},
              {{ formatDay(flight.fDepartureTime) }}
            </div>
          </div>
          <div class="line">
            <div class="dot"></div>
          </div>
          <div class="point text-right">
            <div class="time">{{ formatTime(flight.fArrivalTime) }}</div>
            <div class="airport">{{ flight.fArrivalAirport }}</div>
            <div class="date">
              {{ formatDate(flight.fArrivalTime) }},
              {{ formatDay(flight.fArrivalTime) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="prices-card">
      <div class="price-item best">
        <div class="seller">
          <span>Напрямую у SkyTickets</span>
        </div>
        <div class="price-block">
          <span class="price">{{ finalPrice }} ₽</span>
          <button class="buy-btn primary" @click="buyTicket">Купить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: --font-family-nunito-sans, sans-serif;
}
.flight-detail-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}

.tariff-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}
.tariff-card h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}
.tariff-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.tariff-card li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 8px;
}
.check {
  font-size: 18px;
}
.size {
  color: #6b7280;
  font-size: 12px;
}
.route-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}
.segment {
  padding: 20px;
  border-bottom: 1px solid #f3f4f6;
}
.segment:last-child {
  border: none;
}
.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.airline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.airline .logo {
  color: #dc2626;
  font-weight: 600;
}
.duration {
  color: #6b7280;
}
.timeline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}
.point {
  flex: 1;
}
.time {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
.airport {
  font-size: 14px;
  color: #374151;
  margin-top: 4px;
}
.date {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.line {
  flex: 1;
  height: 1px;
  background: #d1d5db;
  margin: 0 16px;
  position: relative;
}
.line::after {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: white;
  border: 3px solid #9ca3af;
  border-radius: 50%;
}
.text-right {
  text-align: right;
}
.prices-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}
.price-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}
.price-item:last-child {
  border: none;
}
.best {
  border-left: 4px solid #f97316;
  padding-left: 12px;
  margin-left: -16px;
}
.seller {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.price-block {
  display: flex;
  align-items: center;
  gap: 12px;
}
.price {
  font-size: 24px;
  font-weight: 700;
}
.buy-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  background: var(--color-purple-blue);
  color: white;
  border: none;
}
.class-selector {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.class-selector h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.class-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.class-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.class-options input[type='radio'] {
  accent-color: #7c3aed;
}

.price-preview {
  margin-left: auto;
  color: #6b7280;
  font-size: 13px;
}
</style>
