import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const BASE = 'http://localhost:5267/api'

const useFlightStore = defineStore('flights', () => {
  const currentFlight = ref(null)
  const flightError = ref(null)
  const flightsList = ref([])
  const returnFlightsList = ref([])
  const totalFlightsCount = ref(0);
  const hasMore = ref(true)
  const currentPage = ref(1)
  const PAGE_SIZE = 50

  function getError(err) {
    if (!err.response || err.response.status >= 500) {
      flightError.value = 'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    flightError.value = err.response.data
  }

  const getFlights = async () => {
    currentPage.value = 1
    hasMore.value = true

    await axios
      .get(`${BASE}/Flight/GetFlights`, {
        params: { page: 1, pageSize: PAGE_SIZE }
      })
      .then((res) => {
        flightsList.value = res.data.items ?? res.data
        totalFlightsCount.value = res.data.totalCount ?? 0
        hasMore.value = flightsList.value.length < totalFlightsCount.value
        flightError.value = null
      })
      .catch((err) => {
        getError(err)
        flightsList.value = []
        hasMore.value = false
      })
  }

  const loadMoreFlights = async () => {
    if (!hasMore.value) return
    currentPage.value++
    await axios
      .get(`${BASE}/Flight/GetFlights`, {
        params: { page: currentPage.value, pageSize: PAGE_SIZE }
      })
      .then((res) => {
        const items = res.data.items ?? res.data
        flightsList.value.push(...items)
        hasMore.value = flightsList.value.length < totalFlightsCount.value
        flightError.value = null
      })
      .catch((err) => getError(err))
  }

  const getCurrentFlights = async () => {
    currentPage.value = 1
    hasMore.value = true

    await axios
      .get(`${BASE}/Flight/GetCurrentFlights`, {
        params: {
          page: currentPage.value,
          pageSize: PAGE_SIZE
        }
      })
      .then((res) => {
        flightsList.value = res.data.items ?? res.data
        if (res.data.totalCount !== undefined) {
          totalFlightsCount.value = res.data.totalCount
          hasMore.value = flightsList.value.length < totalFlightsCount.value
        } else {
          hasMore.value = res.data.hasMore ?? false
        }
        flightError.value = null
      })
      .catch((err) => {
        getError(err)
        flightsList.value = []
        hasMore.value = false
      })
  }

  const loadMoreCurrentFlights = async () => {
    if (!hasMore.value) return
    currentPage.value++
    await axios
      .get(`${BASE}/Flight/GetCurrentFlights`, { params: { page: currentPage.value, pageSize: PAGE_SIZE } })
      .then((res) => {
        const items = res.data.items ?? res.data
        flightsList.value.push(...items)
        hasMore.value = res.data.hasMore ?? false
        flightError.value = null
      })
      .catch((err) => getError(err))
  }

  const getFlight = async (id) => {
    let data = null
    await axios
      .get(`${BASE}/Flight/GetFlight/${id}`)
      .then((res) => {
        currentFlight.value = res.data
        flightError.value = null
        data = res.data
      })
      .catch((err) => getError(err))
    return data
  }

  const addFlight = async (flight) => {
    await axios
      .post(`${BASE}/Flight/AddFlight`, {
        fId: 0,
        fAirline: flight.fAirline,
        fAirplane: flight.fAirplane,
        fDepartureAirport: flight.fDepartureAirport,
        fArrivalAirport: flight.fArrivalAirport,
        fDepartureTime: new Date(flight.fDepartureTime).toISOString(),
        fArrivalTime: new Date(flight.fArrivalTime).toISOString(),
        fBasePrice: flight.fBasePrice,
      })
      .then((res) => {
        flightsList.value.push(res.data)
        flightError.value = null
      })
      .catch((err) => getError(err))
  }

  const editFlight = async (flight) => {
    await axios
      .post(`${BASE}/Flight/EditFlight`, {
        ...flight,
        fDepartureTime: new Date(flight.fDepartureTime).toISOString(),
        fArrivalTime: new Date(flight.fArrivalTime).toISOString(),
      })
      .then((res) => {
        const index = flightsList.value.findIndex((f) => f.fId === flight.fId)
        if (index > -1) flightsList.value[index] = res.data
        flightError.value = null
      })
      .catch((err) => getError(err))
  }

  // page=1 сбрасывает список, page>1 — append
  const searchFlights = async (from, to, start, end, min = 0, max = 0, airline = null, passengers = 1, classOfService = null, page = 1) => {
    try {
      const payload = {
        cityFrom: from || '',
        cityTo: to || '',
        minCost: Number(min),
        maxCost: Number(max),
        airline: airline || null,
        passengers: Number(passengers),
        classOfServiceStr: classOfService ? classOfService.replace(' ', '_') : null,
        page,
        pageSize: PAGE_SIZE,
      }

      if (start) payload.startDate = toDateOnly(start)
      if (end) payload.endDate = toDateOnly(end)

      const res = await axios.post(`${BASE}/Flight/SearchFlights`, payload)
      const items = res.data.items ?? res.data
      if (page === 1) {
        flightsList.value = items
      } else {
        flightsList.value.push(...items)
      }
      hasMore.value = res.data.hasMore ?? false
      currentPage.value = page
      flightError.value = null
    } catch (err) {
      if (page === 1) flightsList.value = []
      hasMore.value = false
      getError(err)
    }
  }

  const searchReturnFlights = async (from, to, start, end, min, max, airline, passengers, classOfService) => {
    try {
      const payload = {
        cityFrom: from || '',
        cityTo: to || '',
        minCost: Number(min),
        maxCost: Number(max),
        airline: airline || null,
        passengers: Number(passengers),
        classOfServiceStr: classOfService ? classOfService.replace(' ', '_') : null,
        page: 1, // Для обратного рейса, скорее всего, нужна 1 страница
        pageSize: 50,
      }

      if (start) payload.startDate = toDateOnly(start)
      if (end) payload.endDate = toDateOnly(end)

      const res = await axios.post(`${BASE}/Flight/SearchFlights`, payload)
      returnFlightsList.value = res.data.items ?? res.data
      flightError.value = null
    } catch (err) {
      returnFlightsList.value = []
      getError(err)
    }
  }

  // Догрузить следующую страницу результатов поиска
  const loadMoreSearchFlights = async (from, to, start, end, min, max, airline, passengers, classOfService) => {
    if (!hasMore.value) return
    await searchFlights(from, to, start, end, min, max, airline, passengers, classOfService, currentPage.value + 1)
  }

  const clearFlights = () => {
    flightsList.value = []
    hasMore.value = true
    currentPage.value = 1
  }

  return {
    currentFlight, flightError, flightsList, returnFlightsList, hasMore, currentPage, totalFlightsCount,
    getFlights, getCurrentFlights, loadMoreCurrentFlights, loadMoreFlights,
    getFlight, addFlight, editFlight,
    searchFlights, searchReturnFlights, loadMoreSearchFlights, clearFlights,
  }
})

function toDateOnly(value) {
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default useFlightStore
