<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import useFlightStore from '@/stores/flight.js'
import useTicketStore from '@/stores/ticket.js'
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
})

const flightStore = useFlightStore()
const ticketStore = useTicketStore()
const userStore = useUserStore()
const toast = useToast()

const flight = ref(null)

onMounted(async () => {
  flight.value = await flightStore.getFlight(props.flightId)
  if (flightStore.flightError) {
    toast.error(flightStore.flightError)
  }
})

const imageSource = computed(() => `http://localhost:3000/images/${flight.value.airlineImage}`)

const cancelTicket = async () => {
  if (confirm('Вы действительно хотите отменить билет? Это действие нельзя отменить')) {
    props.ticket.tStatus = 'Отменен'
    await ticketStore.changeTicketStatus(props.ticket, userStore.currentUser)
    if (ticketStore.ticketError) {
      toast.error(flightStore.flightError)
    }
  }
}
</script>

<template>
  <div class="user-flight-card" v-if="flight && ticket">
    <img :src="imageSource" alt="" width="40" height="40" />
    <div>
      <p class="primary">{{ flight.fAirline }}</p>
    </div>
    <div>
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
    <div>
      <p class="primary">{{ ticket.tTotalPrice }} ₽</p>
      <p class="secondary">Стоимость билета</p>
    </div>
    <div>
      <p class="primary">{{ ticket.tStatus }}</p>
      <p class="secondary">Статус</p>
    </div>
    <div>
      <p class="primary">{{ ticket.tClass }}</p>
      <p class="secondary">Класс обслуживания</p>
    </div>
    <div v-if="ticket.tStatus !== 'Отменен' && (ticket.tClass === 'Бизнес' || ticket.tClass === 'Первый класс')">
      <button class="btn" type="button" @click="cancelTicket">Отменить</button>
    </div>
    <div v-else-if="ticket.tStatus === 'Отменен' && (ticket.tClass !== 'Бизнес' || ticket.tClass !== 'Первый класс')">
      <button class="btn btn-disabled" type="button">Отменен</button>
    </div>
    <div v-else style="padding: 10px 24px; min-width: 105px">

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
  display: flex;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #eee;
  background: white;
}

.user-flight-card > *:nth-child(1) {
  flex: 0 0 80px;
  text-align: center;
}
.user-flight-card > *:nth-child(2) {
  flex: 0 0 130px;
}
.user-flight-card > *:nth-child(3) {
  flex: 0 0 380px;
  margin: 0 auto;
}
.user-flight-card > *:nth-child(4) {
  flex: 0 0 140px;
  text-align: center;
}
.user-flight-card > *:nth-child(5) {
  flex: 0 0 120px;
  text-align: center;
}
.user-flight-card > *:nth-child(6) {
  flex: 0 0 150px;
  text-align: right;
  padding-right: 30px;
}

.user-flight-card img {
  width: 40px;
  height: 40px;
  display: block;
}

.primary,
.secondary {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.primary {
  font-weight: 600;
}
.secondary {
  color: #888;
  font-size: 0.9rem;
  margin-top: 4px;
}

.btn {
  background: var(--color-purple-blue);
  color: white;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-disabled {
  background: #ccc;
  cursor: not-allowed;
}

.user-flight-card:hover {
  background: var(--color-purple-white);
}
</style>
