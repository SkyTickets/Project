import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

// Новый стор для пассажиров.
// Пассажир — отдельная сущность (не пользователь). Паспортные данные хранятся здесь,
// а не в User (как было в старом API).
//
// ExportPassenger:
//   pId, pSurname, pName, pPatronymic, pBirthdate (DateOnly 'YYYY-MM-DD'),
//   pPassportSerial, pPassportNumber

const BASE = 'http://localhost:5267/api'

const usePassengerStore = defineStore('passengers', () => {
  const currentPassenger = ref(null)
  const passengerError = ref(null)
  const passengersList = ref([])

  function getError(err) {
    if (!err.response || err.response.status >= 500) {
      passengerError.value =
        'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    passengerError.value = err.response.data
  }

  const getPassengers = async () => {
    await axios
      .get(`${BASE}/Passenger/GetPassengers`)
      .then((res) => {
        passengersList.value = res.data
        passengerError.value = null
      })
      .catch((err) => getError(err))
  }

  const getPassenger = async (id) => {
    let data = null
    await axios
      .get(`${BASE}/Passenger/GetPassenger/${id}`)
      .then((res) => {
        currentPassenger.value = res.data
        passengerError.value = null
        data = res.data
      })
      .catch((err) => getError(err))
    return data
  }

  const getOrCreatePassenger = async (passenger) => {
    passengerError.value = null
    try {
      const res = await axios.get(`${BASE}/Passenger/FindByPassport`, {
        params: {
          serial: passenger.pPassportSerial,
          number: passenger.pPassportNumber
        }
      })

      return res.data
    } catch (err) {
      if (err.response?.status === 404) {
        return await addPassenger(passenger)
      }

      getError(err)
      return null
    }
  }

  const addPassenger = async (passenger) => {
    let result = null
    await axios
      .post(`${BASE}/Passenger/AddPassenger`, {
        pId: 0,
        pSurname: passenger.pSurname,
        pName: passenger.pName,
        pPatronymic: passenger.pPatronymic ?? null,
        pBirthdate: passenger.pBirthdate, // строка 'YYYY-MM-DD'
        pPassportSerial: passenger.pPassportSerial,
        pPassportNumber: passenger.pPassportNumber,
      })
      .then((res) => {
        passengersList.value.push(res.data)
        passengerError.value = null
        result = res.data
      })
      .catch((err) => getError(err))
    return result
  }

  const editPassenger = async (passenger) => {
    await axios
      .post(`${BASE}/Passenger/EditPassenger`, passenger)
      .then((res) => {
        const index = passengersList.value.findIndex((p) => p.pId === passenger.pId)
        if (index > -1) {
          passengersList.value[index] = res.data
        }
        passengerError.value = null
      })
      .catch((err) => getError(err))
  }

  const clearPassengers = () => {
    passengersList.value = []
  }

  return {
    currentPassenger,
    passengerError,
    passengersList,
    getPassengers,
    getPassenger,
    getOrCreatePassenger,
    addPassenger,
    editPassenger,
    clearPassengers,
  }
})

export default usePassengerStore
