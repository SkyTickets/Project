<script setup>
import { onMounted, ref, useTemplateRef } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import { ru } from 'date-fns/locale'
import useAirportStore from '@/stores/airport.js'

const toast = useToast()
const airportStore = useAirportStore()
const router = useRouter()

const outboundDates = ref('')
const returnDates = ref('')
const cities = ref([])
const fromInput = useTemplateRef('from-input')
const toInput = useTemplateRef('to-input')
const tripType = ref('oneway')

const showPassengerPanel = ref(false)
const passengers = ref({
  adults: 1,
  children: 0,
  infants: 0
})
const selectedClass = ref('Эконом')
const totalPassengers = () => passengers.value.adults + passengers.value.children + passengers.value.infants

onMounted(async () => {
  if (!cities.value.length) {
    cities.value = await airportStore.getCities()
  }
})

const searchFlights = () => {
  const from = fromInput.value?.value?.trim()
  const to = toInput.value?.value?.trim()

  if (!from || !to) {
    toast.error('Укажите "Откуда" и "Куда"')
    return
  }

  if (!outboundDates.value || outboundDates.value.length === 0) {
    toast.error('Выберите даты вылета')
    return
  }

  if (from === to) {
    toast.error('Города не могут быть одинаковыми')
    return
  }

  const outboundStart = outboundDates.value[0]
  const outboundEnd = outboundDates.value[1] || outboundDates.value[0]

  let returnStart = null
  let returnEnd = null

  if (tripType.value === 'roundtrip') {
    if (!returnDates.value || returnDates.value.length === 0) {
      toast.error('Выберите даты обратного рейса')
      return
    }
    returnStart = returnDates.value[0]
    returnEnd = returnDates.value[1] || returnDates.value[0]
  }

  router.push({
    name: 'Flights',
    query: {
      cityFrom: from,
      cityTo: to,
      outboundStartDate: outboundStart.toLocaleDateString('en-US'),
      outboundEndDate: outboundEnd.toLocaleDateString('en-US'),
      returnStartDate: returnStart ? returnStart.toLocaleDateString('en-US') : null,
      returnEndDate: returnEnd ? returnEnd.toLocaleDateString('en-US') : null,
      tripType: tripType.value,
      passengers: totalPassengers(),
      class: selectedClass.value,
    }
  })
}
</script>

<template>
  <div>
    <div class="search">
      <h1 class="slogan"><span>Больше чем</span> <br /><span>простая поездка</span></h1>
      <div class="trip-type">
        <button :class="{ active: tripType === 'oneway' }" @click="tripType = 'oneway'">Только туда</button>
        <button :class="{ active: tripType === 'roundtrip' }" @click="tripType = 'roundtrip'">Туда и обратно</button>
      </div>
      <div class="search-options">
        <input list="countries" name="departure" id="departure" placeholder="Откуда?" ref="from-input" />
        <input list="countries" name="arrival" id="arrival" placeholder="Куда?" ref="to-input" />
        <date-picker
          v-model="outboundDates"
          class="datepicker"
          range
          :time-config="{ enableTimePicker: false }"
          :min-date="Date.now()"
          :locale="ru"
          placeholder="Когда"
        />
        <date-picker
          v-if="tripType === 'roundtrip'"
          v-model="returnDates"
          class="datepicker"
          range
          :time-config="{ enableTimePicker: false }"
          :min-date="outboundDates?.[0] || Date.now()"
          :locale="ru"
          placeholder="Обратно"
        />

        <div class="passenger-dropdown-wrapper">
          <div class="passenger-selector" @click="showPassengerPanel = !showPassengerPanel">
            {{ totalPassengers() }} пассажир{{ totalPassengers() > 1 && totalPassengers() < 5 ? 'а' : (totalPassengers() >= 5 ? 'ов' : '') }} • {{ selectedClass }}
          </div>

          <div v-if="showPassengerPanel" class="dropdown-overlay" @click="showPassengerPanel = false"></div>

          <div v-if="showPassengerPanel" class="passenger-dropdown-menu">
            <h4>Количество пассажиров</h4>

            <div class="passenger-row">
              <div class="passenger-info">
                <span class="title">Взрослые</span>
                <span class="subtitle">12 лет и старше</span>
              </div>
              <div class="counter">
                <button type="button" class="btn-minus" :class="{ disabled: passengers.adults <= 1 }" @click="passengers.adults = Math.max(1, passengers.adults-1)">−</button>
                <span class="count">{{ passengers.adults }}</span>
                <button type="button" class="btn-plus" @click="passengers.adults++">+</button>
              </div>
            </div>

            <div class="passenger-row">
              <div class="passenger-info">
                <span class="title">Дети</span>
                <span class="subtitle">от 2 до 11 лет</span>
              </div>
              <div class="counter">
                <button type="button" class="btn-minus" :class="{ disabled: passengers.children <= 0 }" @click="passengers.children = Math.max(0, passengers.children-1)">−</button>
                <span class="count">{{ passengers.children }}</span>
                <button type="button" class="btn-plus" @click="passengers.children++">+</button>
              </div>
            </div>

            <div class="passenger-row border-none">
              <div class="passenger-info">
                <span class="title">Младенцы</span>
                <span class="subtitle">Младше 2 лет, без места</span>
              </div>
              <div class="counter">
                <button type="button" class="btn-minus" :class="{ disabled: passengers.infants <= 0 }" @click="passengers.infants = Math.max(0, passengers.infants-1)">−</button>
                <span class="count">{{ passengers.infants }}</span>
                <button type="button" class="btn-plus" @click="passengers.infants++">+</button>
              </div>
            </div>

            <h4 class="section-title">Класс обслуживания</h4>
            <label v-for="cls in ['Эконом', 'Комфорт', 'Бизнес', 'Первый класс']" :key="cls" class="radio-row">
              <span class="radio-label">{{ cls }}</span>
              <div class="custom-radio">
                <input type="radio" v-model="selectedClass" :value="cls" />
                <span class="radio-circle"></span>
              </div>
            </label>
          </div>
        </div>

        <button type="button" @click="searchFlights">Найти</button>
      </div>
    </div>
  </div>

  <datalist id="countries">
    <option v-for="el in cities" :value="el"/>
  </datalist>
</template>

<style>
input:focus {
  outline: none;
}

input::-webkit-calendar-picker-indicator {
  display: none !important;
}

.search-options input {
  color: var(--color-grey-400);
  background-color: #ffffff;
  border: 1px solid #cbd4e6;
  border-radius: 4px;
  font-size: 16px;
  height: 5vh;
  padding-left: 40px;
}
</style>

<style scoped>
* {
  box-sizing: border-box;
  color: var(--color-grey-400);
  margin: 0;
  padding: 0;
}

.search-filters button:hover {
  cursor: pointer;
}

.search {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-image: url(../assets/images/mainbg.png);
  width: auto;
  height: 100vh;
  padding: 24px;
  gap: 16px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.slogan {
  font-size: 96px;
  line-height: 90px;
  text-align: center;
  background: url('../assets/images/sloganmask.png') no-repeat;
  background-clip: text;
  font-weight: bold;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.search-options {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  padding: 24px;
  z-index: 0;
  width: auto;
}

.search-options button {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  height: 5vh;
  font-size: 16px;
  background: var(--color-purple-blue);
  color: white;
}

.search-options button:hover {
  cursor: pointer;
}

.trip-type {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

.trip-type button {
  padding: 8px 24px;
  border: 1px solid #cbd4e6;
  background: white;
  border-radius: 30px;
  cursor: pointer;
}

.trip-type button.active {
  background: var(--color-purple-blue);
  color: white;
}

.datepicker {
  width: 20vw;
}

.passenger-dropdown-wrapper {
  position: relative;
}

.passenger-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  height: 5vh; /* Подстроено под высоту инпутов из вашего кода */
  min-height: 44px;
  padding: 0 20px;
  background: white;
  border: 1px solid #cbd4e6;
  color: var(--color-grey-400);
  font-size: 16px;
  white-space: nowrap;
  cursor: pointer;
  min-width: 220px;
  user-select: none;
}

/* --- Оверлей для закрытия меню --- */
.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999;
}

/* --- Выпадающее меню --- */
.passenger-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #ffffff;
  border-radius: 16px;
  width: 320px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  color: #111419;
  text-align: left;
}

.passenger-dropdown-menu h4 {
  font-size: 16px;
  font-weight: 700;
  color: #111419;
  margin: 0 0 16px 0;
}

.section-title {
  margin-top: 24px !important;
}

/* --- Строки с пассажирами --- */
.passenger-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.passenger-row.border-none {
  border-bottom: none;
}

.passenger-info {
  display: flex;
  flex-direction: column;
}

.passenger-info .title {
  font-size: 15px;
  color: #111419;
}

.passenger-info .subtitle {
  font-size: 13px;
  color: #8b949e;
  margin-top: 2px;
}

/* --- Кнопки счетчика --- */
.counter {
  display: flex;
  align-items: center;
  gap: 12px;
}

.counter button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding-bottom: 2px; /* Легкая центровка символов */
}

.btn-minus {
  background-color: #f1f5f9;
  color: #8b949e;
}

.btn-minus:hover:not(.disabled) {
  background-color: #e2e8f0;
}

.btn-minus.disabled {
  background-color: #f8fafc;
  color: #cbd4e6;
  cursor: default;
}

.btn-plus {
  background-color: #0066ff;
  color: #ffffff;
}

.btn-plus:hover {
  background-color: #0052cc;
}

.count {
  width: 16px;
  text-align: center;
  font-weight: 600;
  font-size: 15px;
  color: #111419;
}

/* --- Радио-кнопки класса обслуживания --- */
.radio-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
}

.radio-row:last-child {
  border-bottom: none;
}

.radio-label {
  font-size: 15px;
  color: #111419;
}

.custom-radio {
  position: relative;
  width: 22px;
  height: 22px;
}

.custom-radio input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.radio-circle {
  position: absolute;
  top: 0;
  left: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #cbd4e6;
  background-color: white;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

/* Состояние "Выбрано" (синий круг с белой точкой) */
.custom-radio input:checked ~ .radio-circle {
  border: 6px solid #0066ff;
}
</style>
