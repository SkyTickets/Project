import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const BASE = 'http://localhost:5267/api'

const useAdditionalServiceStore = defineStore('additionalServices', () => {
  const serviceError = ref(null)
  const servicesList = ref([])

  function getError(err) {
    if (!err.response || err.response.status >= 500) {
      serviceError.value =
        'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    serviceError.value = err.response.data
  }

  const getServices = async () => {
    await axios
      .get(`${BASE}/AdditionalService/GetServices`)
      .then((res) => {
        servicesList.value = res.data
        serviceError.value = null
      })
      .catch((err) => getError(err))
  }

  const addService = async (service) => {
    await axios
      .post(`${BASE}/AdditionalService/AddService`, {
        asId: 0,
        asName: service.asName,
        asPrice: service.asPrice,
      })
      .then((res) => {
        servicesList.value.push(res.data)
        serviceError.value = null
      })
      .catch((err) => getError(err))
  }

  const editService = async (service) => {
    await axios
      .post(`${BASE}/AdditionalService/EditService`, service)
      .then((res) => {
        const index = servicesList.value.findIndex((s) => s.asId === service.asId)
        if (index > -1) {
          servicesList.value[index] = res.data
        }
        serviceError.value = null
      })
      .catch((err) => getError(err))
  }

  const deleteService = async (serviceId) => {
    await axios
      .delete(`${BASE}/AdditionalService/DeleteService/${serviceId}`)
      .then(() => {
        const index = servicesList.value.findIndex((s) => s.asId === serviceId)
        if (index > -1) {
          servicesList.value.splice(index, 1)
        }
        serviceError.value = null
      })
      .catch((err) => getError(err))
  }

  const clearServices = () => {
    servicesList.value = []
  }

  return {
    serviceError,
    servicesList,
    getServices,
    addService,
    editService,
    deleteService,
    clearServices,
  }
})

export default useAdditionalServiceStore
