<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick, computed } from 'vue'
import { useTemplateRef } from 'vue'
import { useToast } from 'vue-toastification'
import { ru } from 'date-fns/locale'
import { useRoute, useRouter } from 'vue-router'

import useFlightStore from '@/stores/flight.js'
import useAirlineStore from '@/stores/airline.js'
import useAirportStore from '@/stores/airport.js'
import FlightCard from '@/components/flight-card.vue'

const toast = useToast()
const flightStore = useFlightStore()
const airlineStore = useAirlineStore()
const airportStore = useAirportStore()

const route = useRoute()
const router = useRouter()

// Даты вылета (туда)
const dates = ref(null)
// Даты обратного рейса
const returnDates = ref(null)

const cities = ref([])
const airlines = ref([])

const fromInput = useTemplateRef('from-input')
const toInput = useTemplateRef('to-input')

// Тип поездки — может прийти из query
const tripType = ref('oneway')

// Пассажиры и класс
const passengers = ref({ adults: 1, children: 0, infants: 0 })
const selectedClass = ref('Эконом')
const showPassengerPanel = ref(false)
const totalPassengers = computed(
  () => passengers.value.adults + passengers.value.children + passengers.value.infants
)

const searchParams = ref({
  cityFrom: '',
  cityTo: '',
  startDate: null,
  endDate: null,
  minCost: null,
  maxCost: null,
  airline: null,
  passengers: 1,
  classOfService: null,
})

// Результаты обратных рейсов (для roundtrip)
const returnFlights = ref([])
const returnFlightError = ref(null)

const debounce = (fn, delay = 350) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

// Инфинит-скролл
const scrollTrigger = ref(null)
let scrollObserver = null

const setupObserver = () => {
  if (scrollObserver) scrollObserver.disconnect()
  scrollObserver = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting || !flightStore.hasMore) return
    if (searchParams.value.cityFrom || searchParams.value.cityTo) {
      await flightStore.loadMoreSearchFlights(
        searchParams.value.cityFrom,
        searchParams.value.cityTo,
        searchParams.value.startDate,
        searchParams.value.endDate,
        searchParams.value.minCost || -1,
        searchParams.value.maxCost || -1,
        searchParams.value.airline,
        searchParams.value.passengers,
        searchParams.value.classOfService,
      )
    } else {
      await flightStore.loadMoreCurrentFlights()
    }
  }, { threshold: 0.1 })
  if (scrollTrigger.value) scrollObserver.observe(scrollTrigger.value)
}

const toFlight = (id) => {
  router.push({
    name: 'Flight',
    params: { id },
    query: {
      class: selectedClass.value,
      passengers: searchParams.value.passengers || 1,
    },
  })
}

// Единый вызов поиска через store
const runSearch = async (params) => {
  await flightStore.searchFlights(
    params.cityFrom || '',
    params.cityTo || '',
    params.startDate,
    params.endDate,
    params.minCost || -1,
    params.maxCost || -1,
    params.airline || null,
    params.passengers || 1,
    params.classOfService || null,
  )
  if (flightStore.flightError) {
    toast.error(flightStore.flightError)
  }
}

// Поиск обратных рейсов (города меняются местами)
const runReturnSearch = async () => {
  if (tripType.value !== 'roundtrip' || !returnDates.value) return

  // Используем cities наоборот
  await flightStore.searchReturnFlights(
    searchParams.value.cityTo,
    searchParams.value.cityFrom,
    returnDates.value[0],
    returnDates.value[1] || returnDates.value[0],
    searchParams.value.minCost,
    searchParams.value.maxCost,
    searchParams.value.airline,
    searchParams.value.passengers,
    searchParams.value.classOfService
  )

  returnFlights.value = flightStore.returnFlightsList
}

const applyFilters = debounce(async () => {
  await runSearch(searchParams.value)
  if (tripType.value === 'roundtrip') {
    await runReturnSearch()
  }
}, 350)

const extraFilters = computed(() => ({
  minCost: searchParams.value.minCost,
  maxCost: searchParams.value.maxCost,
  airline: searchParams.value.airline,
  passengers: totalPassengers.value,
  classOfService: selectedClass.value
}))

watch(extraFilters, (newVals) => {
  searchParams.value.passengers = newVals.passengers
  searchParams.value.classOfService = newVals.classOfService

  applyFilters()
}, { deep: true })

watch(returnDates, () => {
  if (tripType.value === 'roundtrip') runReturnSearch()
})

const parseUSDate = (str) => {
  if (!str) return null
  const [m, d, y] = str.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

onMounted(async () => {
  await Promise.all([airportStore.getAirports(), airlineStore.getAirlines()])
  cities.value = await airportStore.getCities()
  airlines.value = await airlineStore.getNameAirlines()

  const q = route.query

  // Восстанавливаем тип поездки
  if (q.tripType) tripType.value = q.tripType

  if (q.cityFrom || q.cityTo) {
    // Восстанавливаем пассажиров и класс
    if (q.passengers) passengers.value.adults = Number(q.passengers) || 1
    if (q.class) selectedClass.value = q.class

    const startDate = parseUSDate(q.outboundStartDate)
    const endDate = parseUSDate(q.outboundEndDate)

    searchParams.value = {
      cityFrom: q.cityFrom || '',
      cityTo: q.cityTo || '',
      startDate,
      endDate,
      minCost: null,
      maxCost: null,
      airline: null,
      passengers: Number(q.passengers) || 1,
      classOfService: q.class || null,
    }

    await nextTick()
    if (fromInput.value) fromInput.value.value = q.cityFrom || ''
    if (toInput.value) toInput.value.value = q.cityTo || ''

    // Заполняем датапикер вылета
    if (startDate) {
      dates.value = [startDate, endDate || startDate]
    }

    // Восстанавливаем даты обратного рейса
    if (q.tripType === 'roundtrip' && q.returnStartDate) {
      const rStart = parseUSDate(q.returnStartDate)
      const rEnd = parseUSDate(q.returnEndDate)
      returnDates.value = [rStart, rEnd || rStart]
    }

    await runSearch(searchParams.value)

    if (tripType.value === 'roundtrip') {
      await runReturnSearch()
    }
  } else {
    await flightStore.getCurrentFlights()
  }

  await nextTick()
  setupObserver()
})

onBeforeUnmount(() => {
  flightStore.clearFlights()
  if (scrollObserver) scrollObserver.disconnect()
})

const searchFlights = async () => {
  const from = fromInput.value?.value?.trim()
  const to = toInput.value?.value?.trim()

  if (!from || !to) {
    toast.error('Укажите откуда и куда')
    return
  }
  if (!dates.value) {
    toast.error('Выберите даты вылета')
    return
  }
  if (from === to) {
    toast.error('Города не могут быть одинаковыми')
    return
  }
  if (tripType.value === 'roundtrip' && !returnDates.value) {
    toast.error('Выберите даты обратного рейса')
    return
  }

  searchParams.value = {
    ...searchParams.value,
    cityFrom: from,
    cityTo: to,
    startDate: dates.value[0],
    endDate: dates.value[1] || dates.value[0],
    passengers: totalPassengers.value,
    classOfService: selectedClass.value,
  }

  updateUrlQuery()

  await runSearch(searchParams.value)
  if (tripType.value === 'roundtrip') await runReturnSearch()
}

const showAll = async () => {
  // Сбрасываем все поля
  searchParams.value = {
    cityFrom: '',
    cityTo: '',
    startDate: null,
    endDate: null,
    minCost: null,
    maxCost: null,
    airline: null,
    passengers: 1,
    classOfService: null,
  }
  dates.value = null
  returnDates.value = null
  returnFlights.value = []
  returnFlightError.value = null
  tripType.value = 'oneway'
  passengers.value = { adults: 1, children: 0, infants: 0 }
  selectedClass.value = 'Эконом'

  await nextTick()
  if (fromInput.value) fromInput.value.value = ''
  if (toInput.value) toInput.value.value = ''

  // Очищаем URL
  router.replace({ name: 'Flights' })

  await flightStore.getCurrentFlights()
}


const toUSDateString = (dateObj) => {
  if (!dateObj) return null
  const d = new Date(dateObj)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

const updateUrlQuery = () => {
  const query = { ...route.query, tripType: tripType.value }

  if (searchParams.value.cityFrom) query.cityFrom = searchParams.value.cityFrom
  if (searchParams.value.cityTo) query.cityTo = searchParams.value.cityTo

  if (dates.value?.[0]) query.outboundStartDate = toUSDateString(dates.value[0])
  if (dates.value?.[1]) query.outboundEndDate = toUSDateString(dates.value[1] || dates.value[0])

  if (tripType.value === 'roundtrip' && returnDates.value?.[0]) {
    query.returnStartDate = toUSDateString(returnDates.value[0])
    query.returnEndDate = toUSDateString(returnDates.value[1] || returnDates.value[0])
  }

  query.passengers = totalPassengers.value
  query.class = selectedClass.value

  router.replace({ query })
}
</script>

<template>
  <div class="flights">
    <div class="search-filters">
      <div class="trip-toggle">
        <button :class="{ active: tripType === 'oneway' }" @click="tripType = 'oneway'">
          Туда
        </button>
        <button :class="{ active: tripType === 'roundtrip' }" @click="tripType = 'roundtrip'">
          Туда-обратно
        </button>
      </div>

      <input list="countries-from" name="departure" id="departure" placeholder="Откуда?" ref="from-input" />
      <input list="countries-to" name="arrival" id="arrival" placeholder="Куда?" ref="to-input" />
      <date-picker
        v-model="dates"
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
        :min-date="dates?.[0] || Date.now()"
        :locale="ru"
        placeholder="Обратно"
      />

      <button type="button" @click="searchFlights">Найти</button>

      <datalist id="countries-from">
        <option v-for="el in cities" :key="el" :value="el" />
      </datalist>
      <datalist id="countries-to">
        <option v-for="el in cities" :key="el" :value="el" />
      </datalist>
    </div>

    <div class="additional-filters">
      <input class="additional-filter" type="number" placeholder="Цена от" v-model="searchParams.minCost" />
      <input class="additional-filter" type="number" placeholder="Цена до" v-model="searchParams.maxCost" />
      <input class="additional-filter" type="text" list="airlines" placeholder="Авиакомпания" v-model="searchParams.airline" />
      <div class="passenger-dropdown-wrapper">
        <div class="passenger-selector" @click="showPassengerPanel = !showPassengerPanel">
          {{ totalPassengers }} пассажир{{ totalPassengers > 1 && totalPassengers < 5 ? 'а' : totalPassengers >= 5 ? 'ов' : '' }} • {{ selectedClass }}
        </div>

        <div v-if="showPassengerPanel" class="dropdown-overlay" @click="showPassengerPanel = false" />

        <div v-if="showPassengerPanel" class="passenger-dropdown-menu">
          <h4>Пассажиры</h4>

          <div class="passenger-row">
            <div class="passenger-info">
              <span class="p-title">Взрослые</span>
              <span class="p-sub">14 лет и старше</span>
            </div>
            <div class="counter">
              <button type="button" :class="['btn-cnt', { disabled: passengers.adults <= 1 }]"
                      @click="passengers.adults = Math.max(1, passengers.adults - 1)">−</button>
              <span class="cnt">{{ passengers.adults }}</span>
              <button type="button" class="btn-cnt btn-plus" @click="passengers.adults++">+</button>
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
      <datalist id="airlines">
        <option v-for="el in airlines" :key="el" :value="el" />
      </datalist>
    </div>

    <p style="color: var(--color-grey-600)">
      Выберите рейс <span style="color: var(--color-purple-blue)">вылета</span>
    </p>
    <div class="output">
      <div class="flights-header">
        <span class="text-right"> </span>
        <span class="text-center">Авиакомпания</span>
        <span class="text-center">Направление</span>
        <span class="text-center">Свободные места</span>
        <span class="text-right">Цена</span>
      </div>
      <div class="flights-output" v-if="flightStore.flightsList.length">
        <flight-card v-for="el in flightStore.flightsList" :key="el.fId" @click="toFlight(el.fId)" :flight="el" />
      </div>
      <p v-else style="text-align: center; color: var(--color-grey-600)">
        По вашему запросу ничего не найдено
      </p>
    </div>

    <template v-if="tripType === 'roundtrip'">
      <p style="color: var(--color-grey-600); margin-top: 8px">
        Выберите рейс <span style="color: var(--color-purple-blue)">обратно</span>
      </p>
      <div class="output">
        <div class="flights-output" v-if="flightStore.returnFlightsList.length">
          <flight-card
            v-for="el in flightStore.returnFlightsList"
            :key="el.fId"
            @click="toFlight(el.fId)"
            :flight="el"
          />
        </div>
        <p v-else style="text-align: center; color: var(--color-grey-600)">
          {{ returnFlightError || 'Укажите даты обратного рейса' }}
        </p>
      </div>
    </template>

    <!-- Инфинит-скролл триггер -->
    <div ref="scrollTrigger" class="scroll-trigger">
      <span v-if="flightStore.hasMore" class="loading-more">Загружаем ещё рейсы...</span>
    </div>

    <button v-if="searchParams.cityFrom" class="search-all" type="button" @click="showAll">
      Посмотреть все
    </button>
  </div>
</template>

<style>
input:focus { outline: none; }
input::-webkit-calendar-picker-indicator { display: none !important; }

.search-filters input {
  color: var(--color-grey-400);
  background-color: #ffffff;
  border: 1px solid #cbd4e6;
  border-radius: 4px;
  font-size: 16px;
  height: 5vh;
  padding-left: 40px;
}

.additional-filters input {
  color: #7c8db0;
  background-color: #ffffff;
  border: 1px solid #cbd4e6;
  border-radius: 4px;
  font-size: 16px;
  min-width: 20vw;
  height: 5vh;
  padding-left: 14px;
}
</style>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.flights {
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 16px;
}

.search-filters {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  border-radius: 6px;
}

.trip-toggle {
  display: flex;
  border: 1px solid #cbd4e6;
  border-radius: 4px;
  overflow: hidden;
  height: 5vh;
  min-height: 36px;
}

.trip-toggle button {
  padding: 0 14px;
  border: none;
  background: white;
  color: #7c8db0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.trip-toggle button.active {
  background: var(--color-purple-blue);
  color: white;
}

.search-filters > button {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  height: 5vh;
  min-height: 36px;
  font-size: 16px;
  background: var(--color-purple-blue);
  color: white;
  cursor: pointer;
  white-space: nowrap;
}

.search-filters > button:hover { opacity: 0.9; }

.datepicker {
  width: 20vw;
}

.passenger-dropdown-wrapper { position: relative; }

.passenger-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  height: 5vh;
  min-height: 36px;
  padding: 0 14px;
  background: white;
  border: 1px solid #cbd4e6;
  color: #7c8db0;
  font-size: 15px;
  white-space: nowrap;
  cursor: pointer;
  min-width: 200px;
  user-select: none;
}

.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.passenger-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #ffffff;
  border-radius: 16px;
  width: 300px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  color: #111419;
}

.passenger-dropdown-menu h4 {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 12px;
}

.section-title { margin-top: 16px !important; }

.passenger-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.passenger-row.border-none { border-bottom: none; }

.passenger-info { display: flex; flex-direction: column; }
.p-title { font-size: 14px; color: #111419; }
.p-sub { font-size: 12px; color: #8b949e; margin-top: 2px; }

.counter { display: flex; align-items: center; gap: 10px; }

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
.btn-cnt.btn-plus { background: #0066ff; color: white; }
.btn-cnt.btn-plus:hover { background: #0052cc; }

.cnt { width: 16px; text-align: center; font-weight: 600; font-size: 14px; color: #111419; }

.radio-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
}

.radio-row:last-child { border-bottom: none; }
.radio-label { font-size: 14px; color: #111419; }

.custom-radio { position: relative; width: 20px; height: 20px; }
.custom-radio input { opacity: 0; width: 0; height: 0; position: absolute; }

.radio-circle {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #cbd4e6;
  background: white;
  box-sizing: border-box;
  transition: all 0.2s;
}

.custom-radio input:checked ~ .radio-circle { border: 6px solid #0066ff; }

.additional-filters {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.additional-filter { color: var(--color-grey-900); }

.flights-header {
  display: grid;
  grid-template-columns: 45px minmax(0, 1fr) minmax(0, 3fr) minmax(0, 1fr) minmax(0, 1fr);
  padding: 5px 15px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.text-center { text-align: center; }
.text-right { text-align: right; }

.output {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flights-output {
  border: 3px solid var(--color-purple-extralight);
  border-radius: 6px;
  padding: 3px;
}

.flights-output > * {
  border-bottom: 2px solid var(--color-purple-extralight);
}

.flights-output > *:last-child { border-bottom: none; }

.search-all {
  align-self: flex-end;
  background: white;
  color: var(--color-purple-blue);
  border: 1px solid var(--color-purple-blue);
  border-radius: 4px;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
}

.search-all:hover { background: var(--color-purple-extralight); }

.scroll-trigger {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-more {
  font-size: 13px;
  color: #9ca3af;
}
</style>