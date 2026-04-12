import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import moment from 'moment'

const useFlightStore = defineStore('flights', () => {
  const currentFlight = ref(null)
  const flightError = ref(null)
  const flightsList = ref([])

  function getError(err) {
    if (!err.response || err.response.status === 502) {
      flightError.value =
        'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    flightError.value = err.response.data
  }

  const getFlights = async () => {
    await axios
      .get('http://localhost:5267/api/flight/GetFlights')
      .then((res) => {
        flightsList.value = Object.keys(res.data).map((key) => {
          return {
            id: key,
            ...res.data[key],
          }
        })
        flightError.value = null
      })
      .catch((err) => getError(err))
  }

  const getCurrentFlights = async () => {
    await axios
      .get('http://localhost:5267/api/flight/GetCurrentFlights')
      .then((res) => {
        flightsList.value = Object.keys(res.data).map((key) => {
          return {
            id: key,
            ...res.data[key],
          }
        })
        flightError.value = null
      })
      .catch((err) => getError(err))
  }

  const getFlight = async (id) => {
    let data = null
    await axios
      .get(`http://localhost:5267/api/flight/GetFlight/${id}`)
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
      .post(`http://localhost:5267/api/flight/AddFlight`, {
        fId: 0,
        fAirline: flight.airline,
        fDepartureAirport: flight.fDepartureAirport,
        fArrivalAirport: flight.fArrivalAirport,
        fDepartureTime: moment(new Date(flight.fDepartureTime)).add(5, 'h').toDate(),
        fArrivalTime: moment(new Date(flight.fArrivalTime)).add(5, 'h').toDate(),
        fSeatsCount: flight.fSeatsCount,
        fPrice: flight.fPrice,
      })
      .then(async (res) => {
        if (flightsList.value.length) {
          flightsList.value.push(res.data)
        } else {
          await getFlights()
        }
        flightError.value = null
      })
      .catch((err) => getError(err))
  }

  const editFlight = async (flight) => {
    flight.fDepartureTime = moment(new Date(flight.fDepartureTime)).add(5, 'h').toDate()
    flight.fArrivalTime = moment(new Date(flight.fArrivalTime)).add(5, 'h').toDate()
    await axios
      .post(`http://localhost:5267/api/flight/EditFlight`, flight)
      .then((res) => {
        const index = flightsList.value.findIndex((f) => f.fId === flight.fId)
        if (index > -1) {
          flightsList.value[index] = res.data
        }
        flightError.value = null
      })
      .catch((err) => getError(err))
  }

  const searchFlights = async (from, to, start, end, min = -1, max = -1, airline = null) => {
    try {
      const payload = {
        cityFrom: from || '',
        cityTo: to || '',
        minCost: Number(min),
        maxCost: Number(max),
        airline: airline || null,
      };

      if (start) {
        payload.startDate = moment(start).add(5, 'h').toDate().toISOString().split('T')[0];
      }
      if (end) {
        payload.endDate = moment(end).add(5, 'h').toDate().toISOString().split('T')[0];
      }

      await axios
        .post('http://localhost:5267/api/flight/SearchFlights', payload)
        .then((res) => {
          flightsList.value = Object.keys(res.data).map((key) => ({
            id: key,
            ...res.data[key],
          }));
          flightError.value = null;
        })
        .catch((err) => {
          getError(err);
          flightsList.value = [];
        });
    } catch (err) {
      console.error("searchFlights error:", err);
      flightError.value = "Ошибка при поиске рейсов";
      flightsList.value = [];
    }
  };

  const clearFlights = () => {
    flightsList.value = []
  }

  return {
    currentFlight,
    flightError,
    flightsList,
    getFlights,
    getCurrentFlights,
    getFlight,
    addFlight,
    editFlight,
    searchFlights,
    clearFlights,
  }
})

export default useFlightStore
