<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
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

const dates = ref(null)
const cities = ref([])
const airlines = ref([])

const fromInput = useTemplateRef('from-input')
const toInput = useTemplateRef('to-input')

// Основные параметры
const searchParams = ref({
  cityFrom: '',
  cityTo: '',
  startDate: null,
  endDate: null,
  minCost: null,
  maxCost: null,
  airline: null,
})

const debounce = (fn, delay = 350) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

const toFlight = (id) => {
  router.push({ name: 'Flight', params: { id } })
}

const applyFilters = debounce(async () => {
  console.log('🔄 applyFilters called with:', searchParams.value)

  await flightStore.searchFlights(
    searchParams.value.cityFrom || '',
    searchParams.value.cityTo || '',
    searchParams.value.startDate,
    searchParams.value.endDate,
    searchParams.value.minCost || -1,
    searchParams.value.maxCost || -1,
    searchParams.value.airline || null
  )

  if (flightStore.flightError) {
    toast.error(flightStore.flightError)
  }
}, 350)

watch(searchParams, applyFilters, { deep: true })

onMounted(async () => {
  await flightStore.getCurrentFlights()

  await Promise.all([
    airportStore.getAirports(),
    airlineStore.getAirlines()
  ])

  cities.value = await airportStore.getCities()
  airlines.value = await airlineStore.getNameAirlines()
})

onBeforeUnmount(() => {
  flightStore.clearFlights()
})

const searchFlights = async () => {
  const from = fromInput.value?.value?.trim()
  const to = toInput.value?.value?.trim()

  if (!from || !to || !dates.value) {
    toast.error('Заполните все поля')
    return
  }

  if (from === to) {
    toast.error('Города не могут быть одинаковыми')
    return
  }

  searchParams.value.cityFrom = from
  searchParams.value.cityTo = to
  searchParams.value.startDate = dates.value[0]
  searchParams.value.endDate = dates.value[1]

  await applyFilters()
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
  }
  await flightStore.getCurrentFlights()
}
</script>

<template>
  <div class="flights">
    <div class="search-filters">
      <input
        list="countries"
        name="departure"
        id="departure"
        placeholder="Откуда?"
        ref="from-input"
      />
      <input list="countries" name="arrival" id="arrival" placeholder="Куда?" ref="to-input" />
      <date-picker
        v-model="dates"
        class="datepicker"
        name="dates"
        id="dates"
        range
        :time-config="{ enableTimePicker: false }"
        :min-date="Date.now()"
        :locale="ru"
        placeholder="Сроки вылета"
      />
      <button type="button" @click="searchFlights">Найти</button>
      <datalist id="countries">
        <option v-for="el in cities" :value="el" />
      </datalist>
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
      <datalist id="airlines">
        <option v-for="el in airlines" :value="el" />
      </datalist>
    </div>
    <p style="color: var(--color-grey-600)">
      Выберите рейс <span style="color: var(--color-purple-blue)">вылета</span>
    </p>
    <div class="output">
      <div class="flights-output" v-if="flightStore.flightsList.length">
        <flight-card v-for="el in flightStore.flightsList" @click="toFlight(el.fId)" :flight="el" />
      </div>
      <p v-else style="text-align: center; color: var(--color-grey-600)">
        По вашему запросу ничего не найдено
      </p>
      <button v-if="searchParams.cityFrom" class="search-all" type="button" @click="showAll">
        Посмотреть все
      </button>
    </div>
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
  color: #7c8db0;
  background-color: #ffffff;
  border: 1px solid #cbd4e6;
  border-radius: 4px;
  font-size: 16px;
  min-width: 20vw;
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
  padding-left: 40px;
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
  width: auto;
  border-radius: 6px;
}

.search-filters button {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  height: 5vh;
  font-size: 16px;
  background: var(--color-purple-blue);
  color: white;
}

.search-filters button:hover {
  cursor: pointer;
}

.additional-filters {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: auto;
  border-radius: 6px;
}

.additional-filter {
  color: var(--color-grey-900);
}

.output {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: auto;
}

.flights-output {
  border: 3px solid var(--color-purple-extralight);
  border-radius: 6px;
  padding: 3px;
}

.flights-output div {
  border-bottom: 2px solid var(--color-purple-extralight);
}

.flights-output div:last-child {
  border-bottom: none;
}

.search-all {
  align-self: flex-end;
  background: white;
  color: var(--color-purple-blue);
  border: 1px solid var(--color-purple-blue);
  border-radius: 4px;
  padding: 20px;
  font-size: 18px;
}

.search-all:hover {
  cursor: pointer;
}

.datepicker {
  width: 20vw;
}
</style>
