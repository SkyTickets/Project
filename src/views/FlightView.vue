<script setup>
import { computed, onBeforeMount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import useFlightStore from '@/stores/flight.js'
import useUserStore from '@/stores/user.js'
import useBookingStore from '@/stores/booking.js'
import usePassengerStore from '@/stores/passenger.js'

const flightStore = useFlightStore()
const bookingStore = useBookingStore()
const passengerStore = usePassengerStore()
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const flightId = Number(route.params.id)
const passengers = ref({ adults: 1, children: 0, infants: 0 })

const passengerCount = computed(
  () => passengers.value.adults + passengers.value.children + passengers.value.infants
)
const selectedClass = ref(route.query.class || 'Эконом')

const gottenFlight = ref(null)
const showPassengerForm = ref(false)
const buying = ref(false)

const passengerForms = ref(
  Array.from({ length: passengerCount.value}, () => ({
    pSurname: '',
    pName: '',
    pPatronymic: '',
    pBirthdate: '',
    pPassportSerial: '',
    pPassportNumber: '',
  }))
)

watch(passengerCount, (newCount, oldCount) => {
  if (newCount > oldCount) {
    for (let i = oldCount; i < newCount; i++) {
      passengerForms.value.push({
        pSurname: '',
        pName: '',
        pPatronymic: '',
        pBirthdate: '',
        pPassportSerial: '',
        pPassportNumber: '',
      })
    }
  } else if (newCount < oldCount) {
    passengerForms.value.splice(newCount)
  }
})

onBeforeMount(async () => {
  gottenFlight.value = await flightStore.getFlight(flightId)
  if (flightStore.flightError) toast.error(flightStore.flightError)
})

const classMultipliers = { 'Эконом': 1, 'Комфорт': 1.5, 'Бизнес': 2, 'Первый класс': 3 }

const tariffRules = {
  'Эконом':       { handLuggage: { allowed: true, weight: '8 кг',  size: '55×23×40 см' }, baggage: { allowed: false }, refund: { allowed: false } },
  'Комфорт':      { handLuggage: { allowed: true, weight: '10 кг', size: '55×23×40 см' }, baggage: { allowed: true, weight: '23 кг', count: 1 }, refund: { allowed: false } },
  'Бизнес':       { handLuggage: { allowed: true, weight: '15 кг', size: '55×23×40 см' }, baggage: { allowed: true, weight: '32 кг', count: 2 }, refund: { allowed: true } },
  'Первый класс': { handLuggage: { allowed: true, weight: '15 кг', size: '55×23×40 см' }, baggage: { allowed: true, weight: '32 кг', count: 3 }, refund: { allowed: true } },
}

const currentTariff = computed(() => tariffRules[selectedClass.value])
const flight = computed(() => gottenFlight.value)

const pricePerPassenger = computed(() => {
  if (!flight.value) return 0
  return Math.round(flight.value.fBasePrice * classMultipliers[selectedClass.value])
})

const totalPrice = computed(() => pricePerPassenger.value * passengerCount.value)

const formatTime = (d) => format(new Date(d), 'HH:mm', { locale: ru })
const formatDate = (d) => format(new Date(d), 'd MMM', { locale: ru })
const formatDay  = (d) => format(new Date(d), 'EEE', { locale: ru }).slice(0, 3)

const duration = computed(() => {
  if (!flight.value) return ''
  const diff = (new Date(flight.value.fArrivalTime) - new Date(flight.value.fDepartureTime)) / 60000
  return `${Math.floor(diff / 60)}ч ${diff % 60}м в полёте`
})

const initiateBooking = () => {
  if (!userStore.currentUser) {
    toast.error('Войдите в аккаунт')
    return
  }

  let availableSeats = 0;

  switch (selectedClass.value) {
    case 'Эконом':
      availableSeats = flight.value.fAvailableEconomySeats;
      break;
    case 'Комфорт':
      availableSeats = flight.value.fAvailableComfortSeats;
      break;
    case 'Бизнес':
      availableSeats = flight.value.fAvailableBusinessSeats;
      break;
    case 'Первый класс':
      availableSeats = flight.value.fAvailableFirstClassSeats;
      break;
  }

  if (availableSeats < passengerCount.value) {
    toast.error(`Недостаточно мест в класса ${selectedClass.value}. Доступно: ${availableSeats}/${passengerCount.value}`)
    return
  }

  showPassengerForm.value = true
}

const buyTicket = async () => {
  if (buying.value) return

  for (let i = 0; i < passengerForms.value.length; i++) {
    const f = passengerForms.value[i]
    if (!f.pSurname || !f.pName || !f.pBirthdate || !f.pPassportSerial || !f.pPassportNumber) {
      toast.error(`Заполните все обязательные поля для пассажира ${i + 1}`)
      return
    }
    if (f.pPassportSerial.length !== 4) { toast.error(`Серия паспорта пассажира ${i + 1} — 4 цифры`); return }
    if (f.pPassportNumber.length !== 6) { toast.error(`Номер паспорта пассажира ${i + 1} — 6 цифр`); return }
  }

  buying.value = true
  try {
    const passengers = await Promise.all(
      passengerForms.value.map((f) =>
        passengerStore.getOrCreatePassenger({
          pSurname: f.pSurname,
          pName: f.pName,
          pPatronymic: f.pPatronymic || null,
          pBirthdate: f.pBirthdate,
          pPassportSerial: f.pPassportSerial,
          pPassportNumber: f.pPassportNumber,
        })
      )
    )

    if (passengers.some((p) => !p)) {
      toast.error('Ошибка при создании одного из пассажиров')
      return
    }

    const result = await bookingStore.addBooking({
      bUser: userStore.currentUser.uId,
      bFlight: flight.value.fId,
      bTotalPrice: totalPrice.value,
      tickets: passengers.map((p) => ({
        tPassengerId: p.pId,
        tClass: selectedClass.value,
        tPrice: pricePerPassenger.value,
        serviceIds: [],
      })),
    })

    if (bookingStore.bookingError || !result) {
      toast.error(bookingStore.bookingError || 'Ошибка при бронировании')
      return
    }

    toast.success('Бронирование оформлено!')
    router.back()
  } finally {
    buying.value = false
  }
}
</script>

<template>
  <div class="flight-detail-page" v-if="flight">

    <div class="card">
      <h3>Пассажиры</h3>
      <div class="passenger-config-menu">
        <div class="passenger-row">
          <div class="info"><span>Взрослые</span><small>14+ лет</small></div>
          <div class="counter">
            <button class="btn-cnt" @click="passengers.adults = Math.max(1, passengers.adults - 1)">−</button>
            <span class="cnt">{{ passengers.adults }}</span>
            <button class="btn-cnt" @click="passengers.adults++">+</button>
          </div>
        </div>
        <!--
        <div class="passenger-row">
          <div class="info"><span>Дети</span><small>2–11 лет</small></div>
          <div class="counter">
            <button class="btn-cnt" @click="passengers.children = Math.max(0, passengers.children - 1)">−</button>
            <span class="cnt">{{ passengers.children }}</span>
            <button class="btn-cnt" @click="passengers.children++">+</button>
          </div>
        </div>
        <div class="passenger-row">
          <div class="info"><span>Младенцы</span><small>до 2 лет</small></div>
          <div class="counter">
            <button class="btn-cnt" @click="passengers.infants = Math.max(0, passengers.infants - 1)">−</button>
            <span class="cnt">{{ passengers.infants }}</span>
            <button class="btn-cnt" @click="passengers.infants++">+</button>
          </div>
        </div>
        -->
      </div>
    </div>

    <div class="card">
      <h3>Класс обслуживания</h3>
      <div class="class-options">
        <label v-for="cls in ['Эконом', 'Комфорт', 'Бизнес', 'Первый класс']" :key="cls">
          <input type="radio" v-model="selectedClass" :value="cls" name="flightClass" />
          <span>{{ cls }}</span>
          <span class="price-preview">{{ Math.round(flight.fBasePrice * classMultipliers[cls]) }} ₽</span>
        </label>
      </div>
    </div>

    <div class="card">
      <h3>Условия тарифа</h3>
      <ul class="tariff-list">
        <li>
          <span>{{ currentTariff.handLuggage.allowed ? '✔️' : '❌' }}</span>
          Ручная кладь {{ currentTariff.handLuggage.weight }}
          <span class="dim">{{ currentTariff.handLuggage.size }}</span>
        </li>
        <li>
          <span>{{ currentTariff.baggage.allowed ? '✔️' : '❌' }}</span>
          Багаж
          <template v-if="currentTariff.baggage.allowed">
            {{ currentTariff.baggage.weight }} — {{ currentTariff.baggage.count }} шт
          </template>
        </li>
        <li>
          <span>{{ currentTariff.refund.allowed ? '✔️' : '❌' }}</span>
          Возврат
        </li>
      </ul>
    </div>

    <div class="card">
      <div class="airline-row">
        <span class="airline-name">{{ flight.fAirline }}</span>
        <span class="duration-text">{{ duration }}</span>
      </div>
      <div class="timeline">
        <div class="point">
          <div class="time">{{ formatTime(flight.fDepartureTime) }}</div>
          <div class="airport">{{ flight.fDepartureAirport }}</div>
          <div class="date">{{ formatDate(flight.fDepartureTime) }}, {{ formatDay(flight.fDepartureTime) }}</div>
        </div>
        <div class="line"><div class="dot"></div></div>
        <div class="point text-right">
          <div class="time">{{ formatTime(flight.fArrivalTime) }}</div>
          <div class="airport">{{ flight.fArrivalAirport }}</div>
          <div class="date">{{ formatDate(flight.fArrivalTime) }}, {{ formatDay(flight.fArrivalTime) }}</div>
        </div>
      </div>
    </div>

    <div class="card price-card">
      <div class="price-info">
        <div v-if="passengerCount.value> 1" class="price-breakdown">
          {{ pricePerPassenger.toLocaleString('ru-RU') }} ₽ × {{ passengerCount.value}} пасс.
        </div>
        <div class="total">{{ totalPrice.toLocaleString('ru-RU') }} ₽</div>
      </div>
      <button class="buy-btn" @click="initiateBooking">Забронировать</button>
    </div>

    <!-- Модальная форма пассажиров -->
    <div v-if="showPassengerForm" class="overlay" @click.self="showPassengerForm = false">
      <div class="modal">
        <h3>Данные пассажиров</h3>
        <p class="modal-hint">{{ passengerCount.value }} {{ passengerCount.value === 1 ? 'пассажир' : passengerCount.value < 5 ? 'пассажира' : 'пассажиров' }} · {{ selectedClass }}</p>

        <div
          v-for="(form, idx) in passengerForms"
          :key="idx"
          class="passenger-block"
        >
          <div class="passenger-block-title">Пассажир {{ idx + 1 }}</div>
          <div class="modal-grid">
            <div class="field">
              <label>Фамилия *</label>
              <input v-model="form.pSurname" type="text" placeholder="Иванов" />
            </div>
            <div class="field">
              <label>Имя *</label>
              <input v-model="form.pName" type="text" placeholder="Иван" />
            </div>
            <div class="field">
              <label>Отчество</label>
              <input v-model="form.pPatronymic" type="text" placeholder="Иванович" />
            </div>
            <div class="field">
              <label>Дата рождения *</label>
              <input v-model="form.pBirthdate" type="date" />
            </div>
            <div class="field">
              <label>Серия паспорта * (4 цифры)</label>
              <input v-model="form.pPassportSerial" type="text" maxlength="4" placeholder="1234" />
            </div>
            <div class="field">
              <label>Номер паспорта * (6 цифр)</label>
              <input v-model="form.pPassportNumber" type="text" maxlength="6" placeholder="567890" />
            </div>
          </div>
        </div>

        <div class="modal-summary">
          Итого: <strong>{{ totalPrice.toLocaleString('ru-RU') }} ₽</strong>
          ({{ passengerCount.value}} пасс. · {{ selectedClass }})
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="showPassengerForm = false">Отмена</button>
          <button class="btn-primary" :disabled="buying" @click="buyTicket">
            {{ buying ? 'Оформляем...' : 'Подтвердить бронирование' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; font-family: inherit; }

.flight-detail-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

/* Стиль для контейнера внутри card */
.passenger-config-menu {
  display: flex;
  flex-direction: column;
  color: #111419;
}

/* Переиспользуем логику рядов из дропдауна */
.passenger-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.passenger-row:last-child {
  border-bottom: none;
}

.info { display: flex; flex-direction: column; }
.info span { font-size: 14px; font-weight: 500; color: #111419; }
.info small { font-size: 12px; color: #8b949e; margin-top: 2px; }

.counter { display: flex; align-items: center; gap: 10px; }

/* Кнопки счетчика */
.btn-cnt {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  background: #f1f5f9;
  color: #8b949e;
  transition: all 0.2s;
  padding-bottom: 2px;
}

.btn-cnt:hover:not(.disabled) { background: #e2e8f0; }
.btn-cnt.disabled { background: #f8fafc; color: #cbd4e6; cursor: default; }
.btn-cnt:nth-child(3) { background: #0066ff; color: white; } /* Кнопка + */
.btn-cnt:nth-child(3):hover { background: #0052cc; }

.cnt { width: 16px; text-align: center; font-weight: 600; font-size: 14px; color: #111419; }

.card h3 { font-size: 16px; font-weight: 600; margin-bottom: 14px; }

/* Класс */
.class-options { display: flex; flex-direction: column; gap: 10px; }
.class-options label {
  display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer;
}
.class-options input[type='radio'] { accent-color: #7c3aed; }
.price-preview { margin-left: auto; color: #6b7280; font-size: 13px; }

/* Тариф */
.tariff-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.tariff-list li { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.dim { color: #9ca3af; font-size: 12px; }

/* Маршрут */
.airline-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.airline-name { font-weight: 600; color: #dc2626; }
.duration-text { color: #6b7280; font-size: 13px; }

.timeline { display: flex; align-items: center; justify-content: space-between; }
.point { flex: 1; }
.text-right { text-align: right; }
.time { font-size: 32px; font-weight: 700; line-height: 1; }
.airport { font-size: 14px; color: #374151; margin-top: 4px; }
.date { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.line { flex: 1; height: 1px; background: #d1d5db; margin: 0 16px; position: relative; }
.line::after {
  content: ''; position: absolute; top: -6px; left: 50%; transform: translateX(-50%);
  width: 12px; height: 12px; background: white; border: 3px solid #9ca3af; border-radius: 50%;
}

/* Цена */
.price-card { display: flex; justify-content: space-between; align-items: center; }
.price-breakdown { font-size: 13px; color: #6b7280; margin-bottom: 2px; }
.total { font-size: 28px; font-weight: 700; }
.buy-btn {
  padding: 12px 28px; background: var(--color-purple-blue); color: white;
  border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer;
}

/* Модалка */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  overflow-y: auto;
}

.modal {
  background: white; border-radius: 16px; padding: 28px;
  width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.modal h3 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.modal-hint { font-size: 13px; color: #6b7280; margin-bottom: 20px; }

.passenger-block { margin-bottom: 20px; }
.passenger-block-title {
  font-size: 13px; font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;
  padding-bottom: 8px; border-bottom: 1px solid #f3f4f6;
}

.modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 12px; font-weight: 600; color: #374151; }
.field input {
  padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 8px;
  font-size: 14px; outline: none; transition: border-color 0.2s;
}
.field input:focus { border-color: var(--color-purple-blue); }

.modal-summary {
  background: #f8f7ff; border: 1px solid #e0dfff; border-radius: 8px;
  padding: 12px 16px; font-size: 14px; color: #374151; margin-bottom: 20px;
}

.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }

.btn-secondary {
  padding: 10px 20px; border: 1px solid #d1d5db; border-radius: 8px;
  background: white; color: #374151; font-size: 14px; font-weight: 600; cursor: pointer;
}

.btn-primary {
  padding: 10px 24px; border: none; border-radius: 8px;
  background: var(--color-purple-blue); color: white;
  font-size: 14px; font-weight: 600; cursor: pointer;
}

.btn-primary:disabled { background: #a0a0ff; cursor: not-allowed; }
</style>
