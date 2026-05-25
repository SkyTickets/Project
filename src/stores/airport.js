import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const useAirportStore = defineStore('airports', () => {
  const currentAirport = ref(null)
  const airportError = ref(null)
  const airportsList = ref([])

  function getError(err) {
    if (!err.response || err.response.status >= 500) {
      airportError.value =
        'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    airportError.value = err.response.data
  }

  const getAirports = async () => {
    await axios
      .get('http://localhost:5267/api/airport/GetAirports')
      .then((res) => {
        airportsList.value = Object.keys(res.data).map((key) => {
          return {
            id: key,
            ...res.data[key],
          }
        })
        airportError.value = null
      })
      .catch((err) => getError(err))
  }

  const getAirport = async (id) => {
    await axios
      .get(`http://localhost:5267/api/airport/GetAirport/${id}`)
      .then((res) => {
        currentAirport.value = res.data
        airportError.value = null
      })
      .catch((err) => getError(err))
  }

  const addAirport = async (airport) => {
    await axios
      .post(`http://localhost:5267/api/airport/AddAirport`, {
        apId: 0,
        apName: airport.apName,
        apCountry: airport.apCountry,
        apCity: airport.apCity,
        apStreet: airport.apStreet,
        apBuilding: airport.apBuilding,
      })
      .then(async (res) => {
        if (airportsList.value.length) {
          airportsList.value.push(res.data)
        } else {
          await getAirports()
        }
        airportError.value = null
      })
  }

  const editAirport = async (airport) => {
    await axios
      .post(`http://localhost:5267/api/airport/EditAirport`, airport)
      .then((res) => {
        const index = airportsList.value.findIndex((ap) => ap.apId === airport.apId)
        if (index > -1) {
          airportsList.value[index] = res.data
        }
        airportError.value = null
      })
      .catch((err) => getError(err))
  }

  const deleteAirport = async (airportId) => {
    await axios
      .delete(`http://localhost:5267/api/airport/DeleteAirport/${airportId}`)
      .then(() => {
        const index = airportsList.value.findIndex((ap) => ap.apId === airportId)
        if (index > -1) {
          airportsList.value.splice(index, 1)
        }
        airportError.value = null
      })
      .catch((err) => getError(err))
  }

  const getCities = async () => {
    if (!airportsList.value.length) {
      await getAirports()
    }
    return [...new Set(Object.keys(airportsList.value).map((key) => airportsList.value[key].apCity))]
  }

  const clearAirports = () => {
    airportsList.value = []
  }

  return {
    currentAirport,
    airportError,
    airportsList,
    getAirports,
    getAirport,
    addAirport,
    editAirport,
    deleteAirport,
    getCities,
    clearAirports,
  }
})

export default useAirportStore
