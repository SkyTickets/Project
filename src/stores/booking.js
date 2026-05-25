import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const BASE = 'http://localhost:5267/api'

const useBookingStore = defineStore('bookings', () => {
  const currentBooking = ref(null)
  const bookingError = ref(null)
  const bookingsList = ref([])

  function getError(err) {
    if (!err.response || err.response.status >= 500) {
      bookingError.value =
        'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    bookingError.value = err.response.data
  }

  const getBookings = async () => {
    await axios
      .get(`${BASE}/Booking/GetBookings`)
      .then((res) => {
        bookingsList.value = res.data
        bookingError.value = null
      })
      .catch((err) => getError(err))
  }

  const getUserBookings = async (userId) => {
    await axios
      .get(`${BASE}/Booking/GetUserBookings/${userId}`)
      .then((res) => {
        bookingsList.value = res.data
        bookingError.value = null
      })
      .catch((err) => getError(err))
  }

  const getBooking = async (id) => {
    await axios
      .get(`${BASE}/Booking/GetBooking/${id}`)
      .then((res) => {
        currentBooking.value = res.data
        bookingError.value = null
      })
      .catch((err) => getError(err))
  }

  // Создать бронирование с билетами и услугами за один запрос
  // booking: { bUser, bFlight, bTotalPrice, bStatus?, tickets: [...] }
  const addBooking = async (booking) => {
    let result = null
    await axios
      .post(`${BASE}/Booking/AddBooking`, {
        bUser: booking.bUser,
        bFlight: booking.bFlight,
        bStatus: booking.bStatus ?? null,
        bTotalPrice: booking.bTotalPrice,
        tickets: (booking.tickets ?? []).map((t) => ({
          tPassengerId: t.tPassengerId,
          tClass: t.tClass,
          tPrice: t.tPrice,
          serviceIds: t.serviceIds ?? [],
        })),
      })
      .then((res) => {
        bookingsList.value.push(res.data)
        bookingError.value = null
        result = res.data
      })
      .catch((err) => getError(err))
    return result
  }

  // Изменить статус бронирования
  // booking: объект ExportBooking (bId + bStatus обязательны)
  const changeBookingStatus = async (booking) => {
    await axios
      .post(`${BASE}/Booking/ChangeBookingStatus`, booking)
      .then((res) => {
        const index = bookingsList.value.findIndex((b) => b.bId === booking.bId)
        if (index > -1) {
          bookingsList.value[index] = res.data
        }
        bookingError.value = null
      })
      .catch((err) => getError(err))
  }

  const payBooking = async (request) => {
    let result = null
    await axios.post(`${BASE}/Booking/PayBooking`, {
      bId: request.bId,
      services: (request.services ?? []).map(s => ({
        ticketId: s.ticketId,
        serviceIds: s.serviceIds ?? [],
      })),
    })
      .then((res) => {
        const index = bookingsList.value.findIndex(b => b.bId === request.bId)
        if (index > -1) bookingsList.value[index] = res.data
        bookingError.value = null
        result = res.data
      })
      .catch((err) => getError(err))
    return result
  }

  const deleteBooking = async (bookingId) => {
    await axios
      .delete(`${BASE}/Booking/DeleteBooking/${bookingId}`)
      .then(() => {
        const index = bookingsList.value.findIndex((b) => b.bId === bookingId)
        if (index > -1) {
          bookingsList.value.splice(index, 1)
        }
        bookingError.value = null
      })
      .catch((err) => getError(err))
  }

  const clearBookings = () => {
    bookingsList.value = []
  }

  return {
    currentBooking,
    bookingError,
    bookingsList,
    getBookings,
    getUserBookings,
    getBooking,
    addBooking,
    payBooking,
    changeBookingStatus,
    deleteBooking,
    clearBookings,
  }
})

export default useBookingStore
