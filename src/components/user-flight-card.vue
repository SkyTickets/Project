<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import useFlightStore from '@/stores/flight.js'
import useBookingStore from '@/stores/booking.js'
import useUserStore from '@/stores/user.js'

const props = defineProps({
  ticket: {
    type: Object,
    required: true,
  },
  flightId: {
    type: Number,
    required: true,
  },
  // Бронирование целиком — нужно для changeBookingStatus
  booking: {
    type: Object,
    required: true,
  },
})

const flightStore = useFlightStore()
const bookingStore = useBookingStore()
const userStore = useUserStore()
const toast = useToast()
const router = useRouter()

const flight = ref(null)
const imgError = ref(false)

onMounted(async () => {
  flight.value = await flightStore.getFlight(props.flightId)
  if (flightStore.flightError) {
    toast.error(flightStore.flightError)
  }
})

const imageSource = computed(() => `http://localhost:3000/images/${flight.value?.airlineImage}`)
const airlineInitial = computed(() => (flight.value?.fAirline || '?').charAt(0))

// Статус берём из бронирования (bStatus), т.к. у билета нет собственного статуса
const bookingStatus = computed(() => props.booking?.bStatus || '—')
const isCancelled = computed(() => bookingStatus.value === 'Отменен')
const canCancel = computed(() =>
  !isCancelled.value &&
  (props.ticket.tClass === 'Бизнес' || props.ticket.tClass === 'Первый класс')
)

const cancelTicket = async () => {
  if (!confirm('Вы действительно хотите отменить бронирование? Это действие нельзя отменить')) return

  await bookingStore.changeBookingStatus({
    ...props.booking,
    bStatus: 'Отменен',
  })

  if (bookingStore.bookingError) {
    toast.error(bookingStore.bookingError)
  } else {
    toast.success('Бронирование отменено')
  }
}

const viewTicket = () => {
  router.push({ name: 'TicketView', params: { id: props.ticket.tId } })
}
</script>

<template>
  <div class="user-flight-card" v-if="flight && ticket" @dblclick="viewTicket">
    <div class="first-col">
      <img
        v-if="!imgError"
        :src="imageSource"
        alt=""
        width="40"
        height="40"
        @error="imgError = true"
      />
      <div v-else class="airline-placeholder">{{ airlineInitial }}</div>
    </div>
    <div class="second-col">
      <p class="primary">{{ flight.fAirline }}</p>
    </div>
    <div class="third-col">
      <p class="primary">{{ flight.fDepartureAirport }} - {{ flight.fArrivalAirport }}</p>
      <p class="secondary">
        {{
          new Date(flight.fDepartureTime).toLocaleString('ru-RU', {
            dateStyle: 'short',
            timeStyle: 'short',
          })
        }}
        -
        {{
          new Date(flight.fArrivalTime).toLocaleString('ru-RU', {
            dateStyle: 'short',
            timeStyle: 'short',
          })
        }}
      </p>
    </div>
    <div class="fourth-col">
      <p class="primary">{{ ticket.tPrice }} ₽</p>
      <p class="secondary">Стоимость билета</p>
    </div>
    <div class="fifth-col">
      <p class="primary">{{ bookingStatus }}</p>
      <p class="secondary">Статус</p>
    </div>
    <div class="sixth-col">
      <p class="primary">{{ ticket.tClass }}</p>
      <p class="secondary">Класс обслуживания</p>
    </div>
    <div class="actions-cell">
      <button
        v-if="!isCancelled"
        :disabled="!canCancel"
        :class="canCancel ? 'btn btn-cancel' : 'btn btn-disabled'"
        type="button"
        @click="cancelTicket"
      >Отменить</button>
      <button
        v-else
        class="btn btn-disabled"
        type="button"
        disabled
      >Отменён</button>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: --font-family-nunito-sans, sans-serif;
}

.user-flight-card {
  display: grid;
  grid-template-columns: 45px minmax(0, 1fr) minmax(0, 3fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) 100px;
  background: white;
  align-items: center;
  padding: 0 15px;
  height: 80px;
  gap: 10px;
  width: 100%;
}

.airline-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #e3f2fd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #1565c0;
}

.first-col {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.second-col, .third-col, .fourth-col, .fifth-col, .sixth-col {
  height: auto;
  width: 100%;
  min-width: 0;
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
}

.primary,
.secondary {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.secondary {
  color: #888;
  font-size: 0.85rem;
  margin-top: 4px;
}

.btn {
  padding: 7px 0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
  text-align: center;
  width: 100px;
}

.btn-cancel {
  background: #fff0f0;
  color: #e53935;
  border: 1px solid #ffcdd2;
}

.btn-cancel:hover {
  background: #ffebee;
}

.btn-disabled {
  background: #f5f5f5;
  color: #aaa;
  cursor: not-allowed;
  border: 1px solid #eee;
}

.user-flight-card:hover {
  background: var(--color-purple-white, #f5f4ff);
}
</style>
