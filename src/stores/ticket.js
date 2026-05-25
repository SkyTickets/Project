import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

// Изменения относительно старого API:
// - addTicket и changeTicketStatus удалены → перенесены в useBookingStore
// - getUserTickets удалён → билеты получаются через бронирование (GetBookingTickets)
// - Добавлены: getBookingTickets, addService, removeService
// - Ответ теперь массив (не объект-словарь), поэтому Object.keys() убран

const BASE = 'http://localhost:5267/api'

const useTicketStore = defineStore('tickets', () => {
  const currentTicket = ref(null)
  const ticketError = ref(null)
  const ticketsList = ref([])

  function getError(err) {
    if (!err.response || err.response.status >= 500) {
      ticketError.value =
        'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    ticketError.value = err.response.data
  }

  const getTickets = async () => {
    await axios
      .get(`${BASE}/Ticket/GetTickets`)
      .then((res) => {
        ticketsList.value = res.data
        ticketError.value = null
      })
      .catch((err) => getError(err))
  }

  const getTicket = async (id) => {
    await axios
      .get(`${BASE}/Ticket/GetTicket/${id}`)
      .then((res) => {
        currentTicket.value = res.data
        ticketError.value = null
      })
      .catch((err) => getError(err))
  }

  // Билеты конкретного бронирования
  const getBookingTickets = async (bookingId) => {
    await axios
      .get(`${BASE}/Ticket/GetBookingTickets/${bookingId}`)
      .then((res) => {
        ticketsList.value = res.data
        ticketError.value = null
      })
      .catch((err) => getError(err))
  }

  // Добавить дополнительную услугу к билету
  const addService = async (ticketId, serviceId) => {
    await axios
      .post(`${BASE}/Ticket/AddService`, { ticketId, serviceId })
      .then(() => {
        ticketError.value = null
      })
      .catch((err) => getError(err))
  }

  // Удалить дополнительную услугу с билета
  const removeService = async (ticketId, serviceId) => {
    await axios
      .post(`${BASE}/Ticket/RemoveService`, { ticketId, serviceId })
      .then(() => {
        ticketError.value = null
      })
      .catch((err) => getError(err))
  }

  const clearTickets = () => {
    ticketsList.value = []
  }

  return {
    currentTicket,
    ticketError,
    ticketsList,
    getTickets,
    getTicket,
    getBookingTickets,
    addService,
    removeService,
    clearTickets,
  }
})

export default useTicketStore
