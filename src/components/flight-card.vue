<script setup>
import { ref } from 'vue'

const props = defineProps({
  flight: {
    type: Object,
    required: true,
  },
})

const imageSource = ref(`http://localhost:3000/images/${props.flight.airlineImage}`)

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
    <img :src="imageSource" alt="" width="40" height="40" />
    <div>
      <p class="primary">
        {{ getFlightTime(new Date(flight.fArrivalTime), new Date(flight.fDepartureTime)) }}
      </p>
      <p class="secondary">{{ flight.fAirline }}</p>
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
      <p class="primary">{{ flight.fPrice }} ₽</p>
    </div>
  </div>
</template>

<style scoped>
.flight-card {
  display: flex;
  flex-direction: row;
  background: white;
  justify-content: space-around;
  align-items: center;
  padding-left: 50px;
}

.flight-card div {
  align-self: center;
  height: auto;
  width: 25vw;
}

.flight-card p {
  text-align: center;
}

.flight-card:hover {
  background: var(--color-purple-white);
}

.flight-card img {
  align-self: center;
}

.primary {
  color: var(--color-grey-900);
  text-wrap: nowrap;
}

.secondary {
  color: var(--color-grey-400);
  text-wrap: nowrap;
}
</style>
