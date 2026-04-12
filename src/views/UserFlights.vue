<script setup>
import UserFlightCard from '@/components/user-flight-card.vue'
import useUserStore from '@/stores/user.js'
import useTicketStore from '@/stores/ticket.js'
import { onMounted } from 'vue'
import { useToast } from 'vue-toastification'

const toast = useToast()

const userStore = useUserStore()
const ticketStore = useTicketStore()

onMounted(async () => {
  await ticketStore.getUserTickets(userStore.currentUser.uId)
  if (ticketStore.ticketError) {
    toast.error(ticketStore.ticketError)
  }
})
</script>

<template>
  <div class="tickets-wrapper">
    <div class="tickets-table">
      <user-flight-card
        v-for="el in ticketStore.ticketsList"
        :key="el.id"
        :flightId="el.tFlight"
        :ticket="el"
      />
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

.tickets-wrapper {
  width: auto;
  overflow-x: auto;
  overflow-y: hidden;
  border: 3px solid var(--color-purple-extralight);
  border-radius: 8px;
  margin: 20px;
  -webkit-overflow-scrolling: touch;
}

.tickets-table {
  min-width: 850px;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.tickets-wrapper::-webkit-scrollbar {
  height: 6px;
}
.tickets-wrapper::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.2);
  border-radius: 3px;
}
</style>