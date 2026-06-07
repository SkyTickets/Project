<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick, computed } from 'vue'
import { useTemplateRef } from 'vue'
import { useToast } from 'vue-toastification'
import { ru } from 'date-fns/locale'
import { format } from 'date-fns'
import { useRoute, useRouter } from 'vue-router'

import useFlightStore from '@/stores/flight.js'
import useAirlineStore from '@/stores/airline.js'
import useAirportStore from '@/stores/airport.js'
import useBookingStore from '@/stores/booking.js'
import usePassengerStore from '@/stores/passenger.js'
import useUserStore from '@/stores/user.js'
import FlightCard from '@/components/flight-card.vue'

const toast = useToast()
const flightStore = useFlightStore()
const airlineStore = useAirlineStore()
const airportStore = useAirportStore()
const bookingStore = useBookingStore()
const passengerStore = usePassengerStore()
const userStore = useUserStore()

const route = useRoute()
const router = useRouter()

const dates = ref(null)
const returnDates = ref(null)
const cities = ref([])
const airlines = ref([])

const fromInput = useTemplateRef('from-input')
const toInput = useTemplateRef('to-input')

const tripType = ref('oneway')

const passengers = ref({ adults: 1, children: 0, infants: 0 })
const selectedClass = ref('Эконом')
const showPassengerPanel = ref(false)
const totalPassengers = computed(
  () => passengers.value.adults + passengers.value.children + passengers.value.infants,
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

const returnFlights = ref([])
const returnFlightError = ref(null)

const classMultipliers = { Эконом: 1, Комфорт: 1.5, Бизнес: 2, 'Первый класс': 3 }

const totalSeats = (f) =>
  (f.fAvailableEconomySeats || 0) +
  (f.fAvailableComfortSeats || 0) +
  (f.fAvailableBusinessSeats || 0) +
  (f.fAvailableFirstClassSeats || 0)

const pairTotalSeats = (pair) => totalSeats(pair.outbound) + totalSeats(pair.return)

const isRoundtripSearchValid = computed(() => {
  return (
    searchParams.value.cityFrom && searchParams.value.cityTo && dates.value && returnDates.value
  )
})

const pairedFlights = computed(() => {
  if (tripType.value !== 'roundtrip') return []

  if (!isRoundtripSearchValid.value) return []

  const outbound = flightStore.flightsList || []
  const returnList = flightStore.returnFlightsList || []
  const pairs = []

  for (const outFlight of outbound) {
    for (const retFlight of returnList) {
      pairs.push({
        outbound: outFlight,
        return: retFlight,
        index: `${outFlight.fId}-${retFlight.fId}`,
      })
    }
  }

  return pairs.sort((a, b) => pairTotalSeats(b) - pairTotalSeats(a))
})

const toFlight = (id) => {
  router.push({
    name: 'Flight',
    params: { id },
    query: { class: selectedClass.value, passengers: searchParams.value.passengers || 1 },
  })
}

const toRoundtripFlight = (pair) => {
  if (!userStore.currentUser) {
    toast.error('Войдите в аккаунт для бронирования')
    return
  }

  router.push({
    name: 'Flight',
    params: { id: pair.outbound.fId },
    query: {
      returnFlightId: pair.return.fId,
      tripType: 'roundtrip',
      class: selectedClass.value,
      passengers: searchParams.value.passengers || 1,
    },
  })
}

const fmtTime = (d) => format(new Date(d), 'HH:mm', { locale: ru })
const fmtDate = (d) => format(new Date(d), 'd MMM', { locale: ru })
const fmtDay = (d) => format(new Date(d), 'EEE', { locale: ru }).slice(0, 3)

const dur = (f) => {
  const diff = (new Date(f.fArrivalTime) - new Date(f.fDepartureTime)) / 60000
  return `${Math.floor(diff / 60)}ч ${diff % 60}м`
}

const seatsLabel = (f) => {
  const n = totalSeats(f)
  if (n === 0) return 'Нет мест'
  if (n < 10) return `⚠ ${n} мест`
  return `${n} мест`
}

const seatsClass = (f) => {
  const n = totalSeats(f)
  return n === 0 ? 'seats-none' : n < 10 ? 'seats-low' : 'seats-ok'
}

const scrollTrigger = ref(null)
let scrollObserver = null

const setupObserver = () => {
  if (scrollObserver) scrollObserver.disconnect()
  scrollObserver = new IntersectionObserver(
    async (entries) => {
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
    },
    { threshold: 0.1 },
  )
  if (scrollTrigger.value) scrollObserver.observe(scrollTrigger.value)
}

const debounce = (fn, delay = 350) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

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
  if (flightStore.flightError) toast.error(flightStore.flightError)
}

const runReturnSearch = async () => {
  if (tripType.value !== 'roundtrip' || !returnDates.value) return
  await flightStore.searchReturnFlights(
    searchParams.value.cityTo,
    searchParams.value.cityFrom,
    returnDates.value[0],
    returnDates.value[1] || returnDates.value[0],
    searchParams.value.minCost,
    searchParams.value.maxCost,
    searchParams.value.airline,
    searchParams.value.passengers,
    searchParams.value.classOfService,
  )
  returnFlights.value = flightStore.returnFlightsList
}

const applyFilters = debounce(async () => {
  await runSearch(searchParams.value)
  if (tripType.value === 'roundtrip') await runReturnSearch()
}, 350)

const extraFilters = computed(() => ({
  minCost: searchParams.value.minCost,
  maxCost: searchParams.value.maxCost,
  airline: searchParams.value.airline,
  passengers: totalPassengers.value,
  classOfService: selectedClass.value,
}))

watch(
  extraFilters,
  (newVals) => {
    searchParams.value.passengers = newVals.passengers
    searchParams.value.classOfService = newVals.classOfService
    applyFilters()
  },
  { deep: true },
)

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
  if (q.tripType) tripType.value = q.tripType
  if (q.cityFrom || q.cityTo) {
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
    if (startDate) dates.value = [startDate, endDate || startDate]
    if (q.tripType === 'roundtrip' && q.returnStartDate) {
      const rStart = parseUSDate(q.returnStartDate)
      const rEnd = parseUSDate(q.returnEndDate)
      returnDates.value = [rStart, rEnd || rStart]
    }
    await runSearch(searchParams.value)
    if (tripType.value === 'roundtrip') await runReturnSearch()
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
      <input
        list="countries-from"
        name="departure"
        id="departure"
        placeholder="Откуда?"
        ref="from-input"
      />
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
      <datalist id="countries-from"><option v-for="el in cities" :key="el" :value="el" /></datalist>
      <datalist id="countries-to"><option v-for="el in cities" :key="el" :value="el" /></datalist>
    </div>

    <div class="additional-filters">
      <input
        class="additional-filter"
        type="number"
        placeholder="Цена от"
        v-model="searchParams.minCost"
      />
      <input
        class="additional-filter"
        type="number"
        placeholder="Цена до"
        v-model="searchParams.maxCost"
      />
      <input
        class="additional-filter"
        type="text"
        list="airlines"
        placeholder="Авиакомпания"
        v-model="searchParams.airline"
      />
      <div class="passenger-dropdown-wrapper">
        <div class="passenger-selector" @click="showPassengerPanel = !showPassengerPanel">
          {{ totalPassengers }} пассажир{{
            totalPassengers > 1 && totalPassengers < 5 ? 'а' : totalPassengers >= 5 ? 'ов' : ''
          }}
          • {{ selectedClass }}
        </div>
        <div
          v-if="showPassengerPanel"
          class="dropdown-overlay"
          @click="showPassengerPanel = false"
        />
        <div v-if="showPassengerPanel" class="passenger-dropdown-menu">
          <h4>Пассажиры</h4>
          <div class="passenger-row">
            <div class="passenger-info">
              <span class="p-title">Взрослые</span><span class="p-sub">14 лет и старше</span>
            </div>
            <div class="counter">
              <button
                type="button"
                :class="['btn-cnt', { disabled: passengers.adults <= 1 }]"
                @click="passengers.adults = Math.max(1, passengers.adults - 1)"
              >
                −
              </button>
              <span class="cnt">{{ passengers.adults }}</span>
              <button type="button" class="btn-cnt btn-plus" @click="passengers.adults++">+</button>
            </div>
          </div>
          <h4 class="section-title">Класс обслуживания</h4>
          <label
            v-for="cls in ['Эконом', 'Комфорт', 'Бизнес', 'Первый класс']"
            :key="cls"
            class="radio-row"
          >
            <span class="radio-label">{{ cls }}</span>
            <div class="custom-radio">
              <input type="radio" v-model="selectedClass" :value="cls" /><span
                class="radio-circle"
              ></span>
            </div>
          </label>
        </div>
      </div>
      <datalist id="airlines"><option v-for="el in airlines" :key="el" :value="el" /></datalist>
    </div>

    <template v-if="tripType === 'oneway'">
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
          <flight-card
            v-for="el in flightStore.flightsList"
            :key="el.fId"
            @click="toFlight(el.fId)"
            :flight="el"
          />
        </div>
        <p v-else style="text-align: center; color: var(--color-grey-600)">
          По вашему запросу ничего не найдено
        </p>
      </div>
    </template>

    <template v-else-if="tripType === 'roundtrip'">
      <div class="roundtrip-header">
        <div class="roundtrip-badge">✈ Туда-обратно</div>
        <p class="roundtrip-hint">Рейсы сгруппированы в пары. Выберите подходящую комбинацию.</p>
      </div>

      <div
        v-if="!isRoundtripSearchValid"
        style="text-align: center; padding: 32px 0; color: var(--color-grey-600)"
      >
        Пожалуйста, укажите «Откуда», «Куда», дату вылета и дату возвращения, чтобы увидеть
        доступные пары рейсов.
      </div>

      <div v-else-if="pairedFlights.length" class="pairs-list">
        <div v-for="pair in pairedFlights" :key="pair.index" class="pair-card">
          <div
            class="pair-priority"
            :class="
              pairTotalSeats(pair) >= 20
                ? 'priority-high'
                : pairTotalSeats(pair) >= 5
                  ? 'priority-mid'
                  : 'priority-low'
            "
          >
            {{
              pairTotalSeats(pair) >= 200
                ? '✈ Есть места'
                : pairTotalSeats(pair) >= 100
                  ? '🔥 Популярный маршрут'
                  : '⚠ Заканчиваются'
            }}
          </div>

          <div class="pair-flights">
            <div class="pair-flight">
              <div class="pair-direction-label outbound">→ Туда</div>
              <div class="pair-flight-info">
                <div class="pair-airline">{{ pair.outbound.fAirline }}</div>
                <div class="pair-timeline">
                  <div class="pair-point">
                    <div class="pair-time">{{ fmtTime(pair.outbound.fDepartureTime) }}</div>
                    <div class="pair-airport">{{ pair.outbound.fDepartureAirport }}</div>
                    <div class="pair-date">
                      {{ fmtDate(pair.outbound.fDepartureTime) }},
                      {{ fmtDay(pair.outbound.fDepartureTime) }}
                    </div>
                  </div>
                  <div class="pair-line">
                    <span class="pair-dur">{{ dur(pair.outbound) }}</span>
                    <div class="pair-arrow">✈</div>
                  </div>
                  <div class="pair-point pair-point-right">
                    <div class="pair-time">{{ fmtTime(pair.outbound.fArrivalTime) }}</div>
                    <div class="pair-airport">{{ pair.outbound.fArrivalAirport }}</div>
                    <div class="pair-date">
                      {{ fmtDate(pair.outbound.fArrivalTime) }},
                      {{ fmtDay(pair.outbound.fArrivalTime) }}
                    </div>
                  </div>
                </div>
                <div class="pair-seats" :class="seatsClass(pair.outbound)">
                  {{ seatsLabel(pair.outbound) }}
                </div>
              </div>
            </div>

            <div class="pair-divider"></div>

            <div class="pair-flight">
              <div class="pair-direction-label return">← Обратно</div>
              <div class="pair-flight-info">
                <div class="pair-airline">{{ pair.return.fAirline }}</div>
                <div class="pair-timeline">
                  <div class="pair-point">
                    <div class="pair-time">{{ fmtTime(pair.return.fDepartureTime) }}</div>
                    <div class="pair-airport">{{ pair.return.fDepartureAirport }}</div>
                    <div class="pair-date">
                      {{ fmtDate(pair.return.fDepartureTime) }},
                      {{ fmtDay(pair.return.fDepartureTime) }}
                    </div>
                  </div>
                  <div class="pair-line">
                    <span class="pair-dur">{{ dur(pair.return) }}</span>
                    <div class="pair-arrow">✈</div>
                  </div>
                  <div class="pair-point pair-point-right">
                    <div class="pair-time">{{ fmtTime(pair.return.fArrivalTime) }}</div>
                    <div class="pair-airport">{{ pair.return.fArrivalAirport }}</div>
                    <div class="pair-date">
                      {{ fmtDate(pair.return.fArrivalTime) }},
                      {{ fmtDay(pair.return.fArrivalTime) }}
                    </div>
                  </div>
                </div>
                <div class="pair-seats" :class="seatsClass(pair.return)">
                  {{ seatsLabel(pair.return) }}
                </div>
              </div>
            </div>
          </div>

          <div class="pair-footer">
            <div class="pair-price-preview">
              от
              {{
                Math.round(
                  (pair.outbound.fBasePrice + pair.return.fBasePrice) *
                    classMultipliers[selectedClass],
                ).toLocaleString('ru-RU')
              }}
              ₽ / пасс.
            </div>
            <button class="pair-book-btn" @click="toRoundtripFlight(pair)">
              Перейти к оформлению
            </button>
          </div>
        </div>
      </div>

      <p v-else style="text-align: center; color: var(--color-grey-600); padding: 32px 0">
        Нет доступных пар рейсов по вашему запросу
      </p>
    </template>

    <div ref="scrollTrigger" class="scroll-trigger">
      <span v-if="flightStore.hasMore" class="loading-more">Загружаем ещё рейсы...</span>
    </div>

    <button v-if="searchParams.cityFrom" class="search-all" type="button" @click="showAll">
      Посмотреть все
    </button>
  </div>
</template>

<style>
input:focus {
  outline: none;
}
input::-webkit-calendar-picker-indicator {
  display: none !important;
}
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
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

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
.search-filters > button:hover {
  opacity: 0.9;
}

.datepicker {
  width: 20vw;
}

.passenger-dropdown-wrapper {
  position: relative;
}
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
.section-title {
  margin-top: 16px !important;
}
.passenger-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}
.passenger-info {
  display: flex;
  flex-direction: column;
}
.p-title {
  font-size: 14px;
  color: #111419;
}
.p-sub {
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
.btn-cnt:hover:not(.disabled) {
  background: #e2e8f0;
}
.btn-cnt.disabled {
  background: #f8fafc;
  color: #cbd4e6;
  cursor: default;
}
.btn-cnt.btn-plus {
  background: #0066ff;
  color: white;
}
.btn-cnt.btn-plus:hover {
  background: #0052cc;
}
.cnt {
  width: 16px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  color: #111419;
}
.radio-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
}
.radio-row:last-child {
  border-bottom: none;
}
.radio-label {
  font-size: 14px;
  color: #111419;
}
.custom-radio {
  position: relative;
  width: 20px;
  height: 20px;
}
.custom-radio input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.radio-circle {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #cbd4e6;
  background: white;
  box-sizing: border-box;
  transition: all 0.2s;
}
.custom-radio input:checked ~ .radio-circle {
  border: 6px solid #0066ff;
}

.additional-filters {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.additional-filter {
  color: var(--color-grey-900);
}

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
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
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
.flights-output > *:last-child {
  border-bottom: none;
}

.roundtrip-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.roundtrip-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ede9fe;
  color: #6d28d9;
  border-radius: 20px;
  padding: 4px 14px;
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
}
.roundtrip-hint {
  font-size: 13px;
  color: #9ca3af;
}

.pairs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pair-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;
}
.pair-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.pair-priority {
  padding: 7px 18px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.priority-high {
  background: #fff7ed;
  color: #c2410c;
}
.priority-mid {
  background: #f0fdf4;
  color: #15803d;
}
.priority-low {
  background: #fffbeb;
  color: #b45309;
}

.pair-flights {
  display: flex;
  flex-direction: column;
}

.pair-flight {
  padding: 16px 20px;
}
.pair-direction-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
  margin-bottom: 10px;
}
.pair-direction-label.outbound {
  color: #2563eb;
}
.pair-direction-label.return {
  color: #7c3aed;
}

.pair-flight-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.pair-airline {
  font-size: 13px;
  font-weight: 700;
  color: #dc2626;
  min-width: 80px;
}
.pair-timeline {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 8px;
}
.pair-point {
  display: flex;
  flex-direction: column;
}
.pair-point-right {
  text-align: right;
}
.pair-time {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}
.pair-airport {
  font-size: 12px;
  color: #374151;
  margin-top: 2px;
}
.pair-date {
  font-size: 11px;
  color: #9ca3af;
}
.pair-line {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.pair-dur {
  font-size: 11px;
  color: #9ca3af;
}
.pair-arrow {
  font-size: 16px;
  color: #6366f1;
}
.pair-seats {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}
.seats-ok {
  background: #f0fdf4;
  color: #15803d;
}
.seats-low {
  background: #fffbeb;
  color: #b45309;
}
.seats-none {
  background: #fef2f2;
  color: #dc2626;
}

.pair-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 0 20px;
}

.pair-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #f8f7ff;
  border-top: 1px solid #ede9fe;
}
.pair-price-preview {
  font-size: 15px;
  font-weight: 700;
  color: #1e1b4b;
}
.pair-book-btn {
  padding: 10px 22px;
  background: var(--color-purple-blue);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.pair-book-btn:hover {
  opacity: 0.9;
}

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
.search-all:hover {
  background: var(--color-purple-extralight);
}
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
