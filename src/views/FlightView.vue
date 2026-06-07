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
import useAdditionalServiceStore from '@/stores/additionalService.js' 

const flightStore = useFlightStore()
const bookingStore = useBookingStore()
const passengerStore = usePassengerStore()
const userStore = useUserStore()
const additionalServiceStore = useAdditionalServiceStore() 
const router = useRouter()
const route = useRoute()
const toast = useToast()

const flightId = Number(route.params.id)
const returnFlightId = route.query.returnFlightId ? Number(route.query.returnFlightId) : null
const isRoundtrip = computed(() => !!returnFlightId && route.query.tripType === 'roundtrip')

const passengers = ref({ adults: Number(route.query.passengers) || 1, children: 0, infants: 0 })

const passengerCount = computed(
  () => passengers.value.adults + passengers.value.children + passengers.value.infants,
)
const selectedClass = ref(route.query.class || 'Эконом')

const gottenFlight = ref(null)
const gottenReturnFlight = ref(null)
const showPassengerForm = ref(false)
const buying = ref(false)

const insuranceServices = computed(() => {
  return additionalServiceStore.servicesList.filter(
    (service) =>
      service.asName.toLowerCase().includes('страхован') ||
      service.asName.toLowerCase().includes('страховк'),
  )
})

const selectedInsurance = ref(null) 

const getInsuranceIcon = (name) => {
  if (name.toLowerCase().includes('несчастн')) return '🛡️'
  if (name.toLowerCase().includes('медицинск')) return '🏥'
  if (name.toLowerCase().includes('за рубеж') || name.toLowerCase().includes('взр')) return '🌍'
  return '⭐'
}

const getInsuranceDesc = (name) => {
  if (name.toLowerCase().includes('несчастн'))
    return 'Страхование жизни и здоровья на время поездки'
  if (name.toLowerCase().includes('медицинск'))
    return 'Покрытие медицинских расходов и экстренной эвакуации'
  if (name.toLowerCase().includes('компле') || name.toLowerCase().includes('премиал'))
    return 'Максимальная защита: задержка, отмена, потеря багажа + медицина'
  return 'Надежный страховой полис для вашего путешествия'
}

const passengerForms = ref(
  Array.from({ length: passengerCount.value }, () => ({
    pSurname: '',
    pName: '',
    pPatronymic: '',
    pBirthdate: '',
    pPassportSerial: '',
    pPassportNumber: '',
  })),
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
  } else {
    passengerForms.value.splice(newCount)
  }
})

onBeforeMount(async () => {
  gottenFlight.value = await flightStore.getFlight(flightId)
  if (flightStore.flightError) toast.error(flightStore.flightError)

  if (isRoundtrip.value && returnFlightId) {
    gottenReturnFlight.value = await flightStore.getFlight(returnFlightId)
  }

  await additionalServiceStore.getServices()
  if (additionalServiceStore.serviceError) {
    toast.error(additionalServiceStore.serviceError)
  } else if (insuranceServices.value.length > 0) {
    selectedInsurance.value = insuranceServices.value[0]
  }
})

const classMultipliers = { Эконом: 1, Комфорт: 1.5, Бизнес: 2, 'Первый класс': 3 }

const tariffRules = {
  Эконом: {
    handLuggage: { allowed: true, weight: '8 кг', size: '55×23×40 см' },
    baggage: { allowed: false },
    refund: { allowed: false },
  },
  Комфорт: {
    handLuggage: { allowed: true, weight: '10 кг', size: '55×23×40 см' },
    baggage: { allowed: true, weight: '23 кг', count: 1 },
    refund: { allowed: false },
  },
  Бизнес: {
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
const returnFlight = computed(() => gottenReturnFlight.value)

const pricePerPassenger = computed(() => {
  if (!flight.value) return 0
  return Math.round(flight.value.fBasePrice * classMultipliers[selectedClass.value])
})

const returnPricePerPassenger = computed(() => {
  if (!returnFlight.value) return 0
  return Math.round(returnFlight.value.fBasePrice * classMultipliers[selectedClass.value])
})

const insurancePricePerPassenger = computed(() =>
  selectedInsurance.value ? selectedInsurance.value.asPrice : 0,
)

const totalPricePerPassenger = computed(
  () => pricePerPassenger.value + returnPricePerPassenger.value + insurancePricePerPassenger.value,
)

const totalPrice = computed(() => totalPricePerPassenger.value * passengerCount.value)

const formatTime = (d) => format(new Date(d), 'HH:mm', { locale: ru })
const formatDate = (d) => format(new Date(d), 'd MMM', { locale: ru })
const formatDay = (d) => format(new Date(d), 'EEE', { locale: ru }).slice(0, 3)

const makeDuration = (f) => {
  if (!f) return ''
  const diff = (new Date(f.fArrivalTime) - new Date(f.fDepartureTime)) / 60000
  return `${Math.floor(diff / 60)}ч ${diff % 60}м в полёте`
}

const duration = computed(() => makeDuration(flight.value))
const returnDuration = computed(() => makeDuration(returnFlight.value))

const availableSeatsForClass = (f, cls) => {
  if (!f) return 0
  switch (cls) {
    case 'Эконом':
      return f.fAvailableEconomySeats
    case 'Комфорт':
      return f.fAvailableComfortSeats
    case 'Бизнес':
      return f.fAvailableBusinessSeats
    case 'Первый класс':
      return f.fAvailableFirstClassSeats
    default:
      return 0
  }
}

const initiateBooking = () => {
  if (!userStore.currentUser) {
    toast.error('Войдите в аккаунт для бронирования')
    return
  }

  const outSeats = availableSeatsForClass(flight.value, selectedClass.value)
  if (outSeats < passengerCount.value) {
    toast.error(`Недостаточно мест (${selectedClass.value}) на рейс туда. Доступно: ${outSeats}`)
    return
  }

  if (isRoundtrip.value && returnFlight.value) {
    const retSeats = availableSeatsForClass(returnFlight.value, selectedClass.value)
    if (retSeats < passengerCount.value) {
      toast.error(
        `Недостаточно мест (${selectedClass.value}) на обратный рейс. Доступно: ${retSeats}`,
      )
      return
    }
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
    if (f.pPassportSerial.length !== 4) {
      toast.error(`Серия паспорта пассажира ${i + 1} — 4 цифры`)
      return
    }
    if (f.pPassportNumber.length !== 6) {
      toast.error(`Номер паспорта пассажира ${i + 1} — 6 цифр`)
      return
    }
  }

  if (!selectedInsurance.value) {
    toast.error('Необходимо выбрать страхование')
    return
  }

  buying.value = true
  try {
    const passengersList = await Promise.all(
      passengerForms.value.map((f) =>
        passengerStore.getOrCreatePassenger({
          pSurname: f.pSurname,
          pName: f.pName,
          pPatronymic: f.pPatronymic || null,
          pBirthdate: f.pBirthdate,
          pPassportSerial: f.pPassportSerial,
          pPassportNumber: f.pPassportNumber,
        }),
      ),
    )

    if (passengersList.some((p) => !p)) {
      toast.error('Ошибка при создании пассажиров')
      return
    }

    const outboundPriceWithInsurance = pricePerPassenger.value + insurancePricePerPassenger.value

    const outboundResult = await bookingStore.addBooking({
      bUser: userStore.currentUser.uId,
      bFlight: flight.value.fId,
      bTotalPrice: outboundPriceWithInsurance * passengerCount.value,
      tickets: passengersList.map((p) => ({
        tPassengerId: p.pId,
        tClass: selectedClass.value,
        tPrice: pricePerPassenger.value,
        serviceIds: [selectedInsurance.value.asId],
      })),
    })

    if (bookingStore.bookingError || !outboundResult) {
      toast.error(bookingStore.bookingError || 'Ошибка при бронировании рейса туда')
      return
    }

    if (isRoundtrip.value && returnFlight.value) {
      const returnResult = await bookingStore.addBooking({
        bUser: userStore.currentUser.uId,
        bFlight: returnFlight.value.fId,
        bTotalPrice: returnPricePerPassenger.value * passengerCount.value,
        tickets: passengersList.map((p) => ({
          tPassengerId: p.pId,
          tClass: selectedClass.value,
          tPrice: returnPricePerPassenger.value,
          serviceIds: [],
        })),
      })

      if (bookingStore.bookingError || !returnResult) {
        toast.error(bookingStore.bookingError || 'Ошибка при бронировании обратного рейса')
        return
      }

      toast.success('Два бронирования оформлены: туда и обратно! 🎉')
    } else {
      toast.success('Бронирование оформлено!')
    }

    router.back()
  } finally {
    buying.value = false
  }
}
</script>

<template>
  <div class="flight-detail-page" v-if="flight">
    <!-- Roundtrip banner -->
    <div v-if="isRoundtrip" class="roundtrip-banner">
      <span class="rt-icon">⇄</span>
      <div class="rt-text">
        <strong>Бронирование туда-обратно</strong>
        <span>Будет создано 2 бронирования одновременно</span>
      </div>
    </div>

    <!-- Passengers -->
    <div class="card">
      <h3>Пассажиры</h3>
      <div class="passenger-config-menu">
        <div class="passenger-row">
          <div class="info"><span>Взрослые</span><small>14+ лет</small></div>
          <div class="counter">
            <button class="btn-cnt" @click="passengers.adults = Math.max(1, passengers.adults - 1)">
              −
            </button>
            <span class="cnt">{{ passengers.adults }}</span>
            <button class="btn-cnt" @click="passengers.adults++">+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Class of service -->
    <div class="card">
      <h3>Класс обслуживания</h3>
      <div class="class-options">
        <label v-for="cls in ['Эконом', 'Комфорт', 'Бизнес', 'Первый класс']" :key="cls">
          <input type="radio" v-model="selectedClass" :value="cls" name="flightClass" />
          <span>{{ cls }}</span>
          <span class="price-preview">
            {{ Math.round(flight.fBasePrice * classMultipliers[cls]).toLocaleString('ru-RU') }} ₽
            <template v-if="isRoundtrip && returnFlight">
              +
              {{
                Math.round(returnFlight.fBasePrice * classMultipliers[cls]).toLocaleString('ru-RU')
              }}
              ₽
            </template>
          </span>
        </label>
      </div>
    </div>

    <!-- Tariff rules -->
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

    <!-- Outbound flight card -->
    <div class="card">
      <div class="flight-leg-label outbound-label">✈ Рейс туда</div>
      <div class="airline-row">
        <span class="airline-name">{{ flight.fAirline }}</span>
        <span class="duration-text">{{ duration }}</span>
      </div>
      <div class="timeline">
        <div class="point">
          <div class="time">{{ formatTime(flight.fDepartureTime) }}</div>
          <div class="airport">{{ flight.fDepartureAirport }}</div>
          <div class="date">
            {{ formatDate(flight.fDepartureTime) }}, {{ formatDay(flight.fDepartureTime) }}
          </div>
        </div>
        <div class="line"><div class="dot"></div></div>
        <div class="point text-right">
          <div class="time">{{ formatTime(flight.fArrivalTime) }}</div>
          <div class="airport">{{ flight.fArrivalAirport }}</div>
          <div class="date">
            {{ formatDate(flight.fArrivalTime) }}, {{ formatDay(flight.fArrivalTime) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Return flight card (roundtrip only) -->
    <div class="card" v-if="isRoundtrip && returnFlight">
      <div class="flight-leg-label return-label">↩ Рейс обратно</div>
      <div class="airline-row">
        <span class="airline-name">{{ returnFlight.fAirline }}</span>
        <span class="duration-text">{{ returnDuration }}</span>
      </div>
      <div class="timeline">
        <div class="point">
          <div class="time">{{ formatTime(returnFlight.fDepartureTime) }}</div>
          <div class="airport">{{ returnFlight.fDepartureAirport }}</div>
          <div class="date">
            {{ formatDate(returnFlight.fDepartureTime) }},
            {{ formatDay(returnFlight.fDepartureTime) }}
          </div>
        </div>
        <div class="line"><div class="dot"></div></div>
        <div class="point text-right">
          <div class="time">{{ formatTime(returnFlight.fArrivalTime) }}</div>
          <div class="airport">{{ returnFlight.fArrivalAirport }}</div>
          <div class="date">
            {{ formatDate(returnFlight.fArrivalTime) }}, {{ formatDay(returnFlight.fArrivalTime) }}
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Insurance selection (required) ─── -->
    <div class="card">
      <div class="insurance-header">
        <h3>Страхование</h3>
        <span class="insurance-required-badge">Обязательно</span>
      </div>
      <p class="insurance-hint">Выберите один вид страхования для вашей поездки</p>

      <div class="insurance-grid">
        <label
          v-for="opt in insuranceServices"
          :key="opt.asId"
          class="insurance-option"
          :class="{ selected: selectedInsurance?.asId === opt.asId }"
          @click="selectedInsurance = opt"
        >
          <div class="ins-check">
            <div v-if="selectedInsurance?.asId === opt.asId" class="ins-checkmark">✓</div>
          </div>
          <div class="ins-body">
            <div class="ins-title-row">
              <span class="ins-icon">{{ getInsuranceIcon(opt.asName) }}</span>
              <span class="ins-name">{{ opt.asName }}</span>
            </div>
            <span class="ins-desc">{{ getInsuranceDesc(opt.asName) }}</span>
            <span class="ins-price">+{{ opt.asPrice.toLocaleString('ru-RU') }} ₽ / пасс.</span>
          </div>
        </label>

        <p v-if="!insuranceServices.length" class="no-services">
          Загрузка доступных полисов страхования...
        </p>
      </div>
    </div>

    <!-- Price summary -->
    <div class="card price-card">
      <div class="price-breakdown-table">
        <div class="pb-row">
          <span>Рейс туда × {{ passengerCount }} пасс.</span>
          <span>{{ (pricePerPassenger * passengerCount).toLocaleString('ru-RU') }} ₽</span>
        </div>
        <div v-if="isRoundtrip && returnFlight" class="pb-row">
          <span>Рейс обратно × {{ passengerCount }} пасс.</span>
          <span>{{ (returnPricePerPassenger * passengerCount).toLocaleString('ru-RU') }} ₽</span>
        </div>
        <div class="pb-row" v-if="selectedInsurance">
          <span>{{ selectedInsurance.asName }} × {{ passengerCount }} пасс.</span>
          <span>{{ (insurancePricePerPassenger * passengerCount).toLocaleString('ru-RU') }} ₽</span>
        </div>
        <div class="pb-total-row">
          <span>Итого</span>
          <span class="total">{{ totalPrice.toLocaleString('ru-RU') }} ₽</span>
        </div>
      </div>
      <button class="buy-btn" @click="initiateBooking">
        {{ isRoundtrip ? 'Забронировать оба рейса' : 'Забронировать' }}
      </button>
    </div>

    <!-- Passenger form modal -->
    <div v-if="showPassengerForm" class="overlay" @click.self="showPassengerForm = false">
      <div class="modal">
        <h3>Данные пассажиров</h3>
        <p class="modal-hint">
          {{ passengerCount }}
          {{
            passengerCount === 1 ? 'пассажир' : passengerCount < 5 ? 'пассажира' : 'пассажиров'
          }}
          · {{ selectedClass }}
          <template v-if="isRoundtrip"> · Туда и обратно</template>
        </p>

        <div v-if="selectedInsurance" class="modal-insurance-summary">
          <span class="ins-icon-sm">{{ getInsuranceIcon(selectedInsurance.asName) }}</span>
          <div>
            <strong>{{ selectedInsurance.asName }}</strong>
            <span>
              — {{ (insurancePricePerPassenger * passengerCount).toLocaleString('ru-RU') }} ₽</span
            >
          </div>
        </div>

        <div v-for="(form, idx) in passengerForms" :key="idx" class="passenger-block">
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
              <input
                v-model="form.pPassportNumber"
                type="text"
                maxlength="6"
                placeholder="567890"
              />
            </div>
          </div>
        </div>

        <div class="modal-summary">
          <div class="ms-row">
            <span>Рейс туда:</span>
            <strong>{{ (pricePerPassenger * passengerCount).toLocaleString('ru-RU') }} ₽</strong>
          </div>
          <div v-if="isRoundtrip && returnFlight" class="ms-row">
            <span>Рейс обратно:</span>
            <strong
              >{{ (returnPricePerPassenger * passengerCount).toLocaleString('ru-RU') }} ₽</strong
            >
          </div>
          <div class="ms-row">
            <span>Страхование ({{ selectedInsurance.asName }}):</span>
            <strong
              >{{ (insurancePricePerPassenger * passengerCount).toLocaleString('ru-RU') }} ₽</strong
            >
          </div>
          <div class="ms-row ms-total">
            <span>Итого:</span>
            <strong>{{ totalPrice.toLocaleString('ru-RU') }} ₽</strong>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="showPassengerForm = false">Отмена</button>
          <button class="btn-primary" :disabled="buying" @click="buyTicket">
            {{
              buying
                ? 'Оформляем...'
                : isRoundtrip
                  ? 'Подтвердить оба рейса'
                  : 'Подтвердить бронирование'
            }}
          </button>
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
  font-family: inherit;
}

.flight-detail-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.roundtrip-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #ede9fe 0%, #e0f2fe 100%);
  border: 1px solid #c4b5fd;
  border-radius: 12px;
  padding: 14px 18px;
}
.rt-icon {
  font-size: 22px;
}
.rt-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rt-text strong {
  font-size: 14px;
  color: #4c1d95;
}
.rt-text span {
  font-size: 12px;
  color: #6d28d9;
}

.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 14px;
}

.passenger-config-menu {
  display: flex;
  flex-direction: column;
  color: #111419;
}

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

.info {
  display: flex;
  flex-direction: column;
}
.info span {
  font-size: 14px;
  font-weight: 500;
  color: #111419;
}
.info small {
  font-size: 12px;
  color: #8b949e;
  margin-top: 2px;
}

.counter {
  display: flex;
  align-items: center;
  gap: 10px;
}

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
.btn-cnt:hover {
  background: #e2e8f0;
}
.btn-cnt:nth-child(3) {
  background: #0066ff;
  color: white;
}
.btn-cnt:nth-child(3):hover {
  background: #0052cc;
}
.cnt {
  width: 16px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  color: #111419;
}

.class-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.tariff-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tariff-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.dim {
  color: #9ca3af;
  font-size: 12px;
}

.flight-leg-label {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 10px;
  margin-bottom: 12px;
  letter-spacing: 0.3px;
}
.outbound-label {
  background: #e0f2fe;
  color: #0369a1;
}
.return-label {
  background: #fce7f3;
  color: #9d174d;
}

.airline-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.airline-name {
  font-weight: 600;
  color: #dc2626;
}
.duration-text {
  color: #6b7280;
  font-size: 13px;
}

.timeline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.point {
  flex: 1;
}
.text-right {
  text-align: right;
}
.time {
  font-size: 32px;
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
  color: #9ca3af;
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

.insurance-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.insurance-header h3 {
  margin-bottom: 0;
}
.insurance-required-badge {
  font-size: 10px;
  font-weight: 700;
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
  padding: 2px 8px;
  border-radius: 10px;
  letter-spacing: 0.3px;
}
.insurance-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 14px;
}

.insurance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.insurance-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.insurance-option:hover {
  border-color: #a5b4fc;
  background: #fafafe;
}
.insurance-option.selected {
  border-color: #7c3aed;
  background: #f5f3ff;
}

.ins-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.insurance-option.selected .ins-check {
  border-color: #7c3aed;
  background: #7c3aed;
}
.ins-checkmark {
  font-size: 11px;
  font-weight: 700;
  color: white;
}

.ins-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ins-title-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.ins-icon {
  font-size: 14px;
}
.ins-name {
  font-size: 13px;
  font-weight: 600;
  color: #111;
}
.ins-desc {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
}
.ins-price {
  font-size: 13px;
  font-weight: 700;
  color: #7c3aed;
  margin-top: 2px;
}

.price-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.price-breakdown-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pb-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b7280;
}
.pb-total-row {
  display: flex;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
  font-size: 15px;
  font-weight: 600;
  color: #111;
}
.total {
  font-size: 28px;
  font-weight: 700;
  color: #1e1b4b;
}

.buy-btn {
  padding: 14px 28px;
  background: var(--color-purple-blue);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}
.buy-btn:hover {
  opacity: 0.9;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}
.modal-hint {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 16px;
}

.modal-insurance-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #4c1d95;
  margin-bottom: 16px;
}
.ins-icon-sm {
  font-size: 16px;
}

.passenger-block {
  margin-bottom: 20px;
}
.passenger-block-title {
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
.field input {
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus {
  border-color: var(--color-purple-blue);
}

.modal-summary {
  background: #f8f7ff;
  border: 1px solid #e0dfff;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}
.ms-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #374151;
}
.ms-total {
  border-top: 1px solid #e0dfff;
  padding-top: 8px;
  margin-top: 2px;
  font-size: 15px;
}
.ms-total strong {
  font-size: 18px;
  color: #1e1b4b;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: var(--color-purple-blue);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled {
  background: #a0a0ff;
  cursor: not-allowed;
}
</style>
