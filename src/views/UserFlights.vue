<script setup>
import BookingCard from '@/components/booking-card.vue'
import useUserStore from '@/stores/user.js'
import useBookingStore from '@/stores/booking.js'
import { onMounted } from 'vue'
import { useToast } from 'vue-toastification'

const toast = useToast()
const userStore = useUserStore()
const bookingStore = useBookingStore()

onMounted(async () => {
  await bookingStore.getUserBookings(userStore.currentUser.uId)
  if (bookingStore.bookingError) {
    toast.error(bookingStore.bookingError)
  }
})
</script>

<template>
  <div class="bookings-wrapper">
    <div v-if="!bookingStore.bookingsList.length" class="empty-state">
      <p>У вас пока нет бронирований</p>
    </div>
    <div class="output" v-else>
      <booking-card
        v-for="booking in bookingStore.bookingsList"
        :key="booking.bId"
        :booking="booking"
      />
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.bookings-wrapper {
  padding: 20px;
}

.empty-state {
  padding: 60px;
  text-align: center;
  color: var(--color-grey-400);
  font-size: 16px;
}

.output {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
