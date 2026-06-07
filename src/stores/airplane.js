import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const BASE = 'http://localhost:5267/api'

const useAirplaneStore = defineStore('airplanes', () => {
  const currentAirplane = ref(null)
  const airplaneError = ref(null)
  const airplanesList = ref([])

  function getError(err) {
    if (!err.response || err.response.status >= 500) {
      airplaneError.value =
        'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    airplaneError.value = err.response.data
  }

  const getAirplanes = async () => {
    await axios
      .get(`${BASE}/Airplane/GetAirplanes`)
      .then((res) => {
        airplanesList.value = res.data
        airplaneError.value = null
      })
      .catch((err) => getError(err))
  }

  const getAirplane = async (id) => {
    let data = null
    await axios
      .get(`${BASE}/Airplane/GetAirplane/${id}`)
      .then((res) => {
        currentAirplane.value = res.data
        airplaneError.value = null
        data = res.data
      })
      .catch((err) => getError(err))
    return data
  }

  const addAirplane = async (airplane) => {
    await axios
      .post(`${BASE}/Airplane/AddAirplane`, {
        plId: 0,
        plModel: airplane.plModel,
        plEconomySeats: airplane.plEconomySeats,
        plComfortSeats: airplane.plComfortSeats,
        plBusinessSeats: airplane.plBusinessSeats,
        plFirstClassSeats: airplane.plFirstClassSeats,
      })
      .then((res) => {
        airplanesList.value.push(res.data)
        airplaneError.value = null
      })
      .catch((err) => getError(err))
  }

  const editAirplane = async (airplane) => {
    await axios
      .post(`${BASE}/Airplane/EditAirplane`, airplane)
      .then((res) => {
        const index = airplanesList.value.findIndex((a) => a.plId === airplane.plId)
        if (index > -1) {
          airplanesList.value[index] = res.data
        }
        airplaneError.value = null
      })
      .catch((err) => getError(err))
  }

  const deleteAirplane = async (airplaneId) => {
    await axios
      .delete(`${BASE}/Airplane/DeleteAirplane/${airplaneId}`)
      .then(() => {
        const index = airplanesList.value.findIndex((a) => a.plId === airplaneId)
        if (index > -1) {
          airplanesList.value.splice(index, 1)
        }
        airplaneError.value = null
      })
      .catch((err) => getError(err))
  }

  const getModelNames = async () => {
    if (!airplanesList.value.length) {
      await getAirplanes()
    }
    return airplanesList.value.map((a) => a.plModel)
  }

  const clearAirplanes = () => {
    airplanesList.value = []
  }

  return {
    currentAirplane,
    airplaneError,
    airplanesList,
    getAirplanes,
    getAirplane,
    addAirplane,
    editAirplane,
    deleteAirplane,
    getModelNames,
    clearAirplanes,
  }
})

export default useAirplaneStore
