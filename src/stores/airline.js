import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const useAirlineStore = defineStore('airlines', () => {
  const currentAirline = ref(null)
  const airlineError = ref(null)
  const airlinesList = ref([])

  function getError(err) {
    if (!err.response || err.response.status === 502) {
      airlineError.value =
        'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    airlineError.value = err.response.data
  }

  const getAirlines = async () => {
    await axios
      .get('http://localhost:5267/api/airline/GetAirlines')
      .then((res) => {
        airlinesList.value = Object.keys(res.data).map((key) => {
          return {
            id: key,
            ...res.data[key],
          }
        })
        airlineError.value = null
      })
      .catch((err) => getError(err))
  }

  const getAirline = async (id) => {
    await axios
      .get(`http://localhost:5267/api/airline/GetAirline/${id}`)
      .then((res) => {
        currentAirline.value = res.data
        airlineError.value = null
      })
      .catch((err) => getError(err))
  }

  const addAirline = async (airline) => {
    await axios
      .post(`http://localhost:5267/api/airline/AddAirline`, {
        alId: 0,
        alName: airline.alName,
        alEmail: airline.alEmail,
      })
      .then(async (res) => {
        if (airlinesList.value.length) {
          airlinesList.value.push(res.data)
        } else {
          await getAirlines()
        }
        airlineError.value = null
      })
      .catch((err) => getError(err))
  }

  const editAirline = async (airline) => {
    await axios
      .post(`http://localhost:5267/api/airline/EditAirline`, airline)
      .then(async (res) => {
        const index = airlinesList.value.findIndex((al) => al.alId === airline.alId)
        if (index > -1) {
          airlinesList.value[index] = res.data
        }
        airlineError.value = null
      })
      .catch((err) => getError(err))
  }

  const deleteAirline = async (airlineId) => {
    await axios
      .delete(`http://localhost:5267/api/airline/DeleteAirline/${airlineId}`)
      .then(() => {
        const index = airlinesList.value.findIndex((al) => al.alId === airlineId)
        if (index > -1) {
          airlinesList.value.splice(index,1)
        }
        airlineError.value = null
      })
      .catch((err) => getError(err))
  }

  const getNameAirlines = async () => {
    if (!airlinesList.value.length) {
      await getAirlines()
    }
    return [
      ...new Set(Object.keys(airlinesList.value).map((key) => airlinesList.value[key].alName)),
    ]
  }

  const clearAirlines = () => {
    airlinesList.value = []
  }

  return {
    currentAirline,
    airlineError,
    airlinesList,
    getAirlines,
    getAirline,
    addAirline,
    editAirline,
    deleteAirline,
    getNameAirlines,
    clearAirlines,
  }
})

export default useAirlineStore
