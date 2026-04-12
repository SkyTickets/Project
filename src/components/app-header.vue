<script setup>
import useUserStore from '@/stores/user.js'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useUserStore()
const router = useRouter()
const route = useRoute()

const showAuth = ref(false)

const closeModal = () => {
  showAuth.value = false
}

const signUp = () => {
  router.push({ name: 'SignUp' })
}

const goToFlights = () => {
  router.push({
    name: 'Flights',
  })
}

const goToUser = () => {
  router.push({
    name: 'User',
    params: {
      id: store.currentUser.uId,
    },
  })
}

const goToUserFlights = () => {
  router.push({
    name: 'UserFlights',
    params: {
      id: store.currentUser.uId,
    },
  })
}

const goToAdmin = () => {
  router.push({ name: 'Admin' })
}

const isManager = () => {
  const role = store.currentUser?.uRole
  return role === 'Менеджер'
}
</script>

<template>
  <div class="header">
    <router-link to="/">
      <img style="justify-self: flex-start" src="../assets/icons/logo.svg" alt="" />
    </router-link>
    <div class="header-actions">
      <button
        v-if="isManager()"
        type="button"
        class="action admin-btn"
        @click="goToAdmin"
        title="Админ-панель"
      >
        Админ-панель
      </button>
      <p class="action" @click="goToFlights" :class="{ active: route.name === 'Flights' }">Рейсы</p>
      <p
        class="action"
        v-if="store.currentUser"
        :class="{ active: route.name === 'UserFlights' }"
        @click="goToUserFlights"
      >
        Мои рейсы
      </p>
      <p class="action" v-else @click="showAuth = true">Войти</p>
      <p
        class="action"
        v-if="store.currentUser"
        @click="goToUser"
        :class="{ active: route.name === 'User' }"
      >
        Мой аккаунт
      </p>
      <button
        type="button"
        class="action action-btn"
        v-else
        v-if="route.name !== 'SignUp'"
        @click="signUp"
      >
        Зарегистрироваться
      </button>
    </div>
    <teleport to="body">
      <sign-in ref="modal" :show="showAuth" @close="closeModal"></sign-in>
    </teleport>
  </div>
</template>

<style scoped>
* {
  font-family: --font-family-nunito-sans, sans-serif;
  font-size: 16px;
}
.header {
  display: flex;
  flex-direction: row;
  height: 5vh;
  align-items: center;
  justify-content: space-between;
  padding: 24px 8px;
  background: white;
}
.header-actions {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.action {
  color: #7c8db0;
}
.action:hover {
  cursor: pointer;
}
.action-btn {
  background: var(--color-purple-blue);
  color: var(--color-grey-100);
  border: none;
  border-radius: 4px;
}

.active {
  color: var(--color-purple-blue);
}
</style>
