<script setup>
import { ref } from 'vue'

const props = defineProps({
  flight: {
    type: Object,
    required: true,
  },
})

const imgError = ref(false)
const imageSource = ref(`http://localhost:3000/images/${props.flight.airlineImage}`)
const airlineInitial = (props.flight.fAirline || '?').charAt(0)

const getFlightTime = (arrivalTime, departureTime) => {
  const difference = arrivalTime - departureTime
  const totalMinutes = Math.floor(difference / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.floor(totalMinutes % 60)

  if (minutes === 0) {
    return `${hours}ч`
  }

  if (hours === 0) {
    return `${minutes} мин`
  }

  return `${hours}ч ${minutes} мин`
}
</script>

<template>
  <div class="flight-card">
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
      <p class="primary">
        {{ getFlightTime(new Date(flight.fArrivalTime), new Date(flight.fDepartureTime)) }}
      </p>
      <p class="secondary">{{ flight.fAirline }}</p>
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
      <p class="primary seats-count">{{ (flight.fAvailableEconomySeats+flight.fAvailableComfortSeats+flight.fAvailableBusinessSeats+flight.fAvailableFirstClassSeats) ?? ((flight.fEconomySeats+flight.fComfortSeats+flight.fBusinessSeats+flight.fFirstClassSeats)) }}</p>
      <p class="secondary">мест свободно</p>
    </div>
    <div class="fifth-col">
      <p class="primary">от {{ flight.fBasePrice }} ₽</p>
    </div>
  </div>
</template>

<style scoped>
.flight-card {
  display: grid;
  grid-template-columns: 45px minmax(0, 1fr) minmax(0, 3fr) minmax(0, 1fr) minmax(0, 1fr);
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

.second-col, .third-col, .fourth-col {
  height: auto;
  width: 100%;
}

.fifth-col {
  height: auto;
  width: 100%;
  text-align: center;
}

.flight-card p {
  text-align: center;
}

.fifth-col p {
  text-align: right;
  padding-right: 10px;
}

.flight-card:hover {
  background: var(--color-purple-white);
}

.flight-card img {
  align-self: center;
}

.primary {
  color: var(--color-grey-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.secondary {
  color: var(--color-grey-400);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>