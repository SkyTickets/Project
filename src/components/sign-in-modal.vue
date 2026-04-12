<script setup>
import { ref, useTemplateRef } from 'vue'
import useUserStore from '@/stores/user.js'
import { useToast } from 'vue-toastification'
import { useRoute, useRouter } from 'vue-router'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const store = useUserStore()

defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const isAuth = ref(true)

const loginInput = useTemplateRef('login-input')
const passwordInput = useTemplateRef('password-input')

const signIn = async () => {
  let login = loginInput.value
  let password = passwordInput.value
  if (!login.value || !password.value) {
    toast.error('Заполните все поля')
    return
  }
  let user = {
    login: login.value,
    password: password.value,
  }
  await store.login(user)
  if (store.currentUser) {
    if (route.name === 'SignUp') {
      await router.push({ name: 'Home' })
    }
    toast.success("Вход прошел успешно")
    emit('close')
  } else if (store.userError) {
    toast.error(store.userError)
    login.value = ''
    password.value = ''
  }
}

const signUp = () => {
  router.push({ name: 'SignUp' })
  emit('close')
  isAuth.value = false
}
</script>

<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal" v-if="isAuth">
      <div class="close">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          xmlns="http://www.w3.org/2000/svg"
          @click="$emit('close')"
        >
          <path
            d="M4.53524 5.94975L0.292596 1.70711C-0.0979279 1.31659 -0.0979279 0.683423 0.292596 0.292899C0.683121 -0.0976259 1.31629 -0.0976257 1.70681 0.292899L5.94945 4.53554L10.1921 0.292899C10.5826 -0.0976259 11.2158 -0.0976256 11.6063 0.292899C11.9968 0.683423 11.9968 1.31659 11.6063 1.70711L7.36366 5.94975L11.6063 10.1924C11.9968 10.5829 11.9968 11.2161 11.6063 11.6066C11.2158 11.9971 10.5826 11.9971 10.1921 11.6066L5.94945 7.36397L1.70681 11.6066C1.31628 11.9971 0.68312 11.9971 0.292596 11.6066C-0.0979286 11.2161 -0.0979282 10.5829 0.292596 10.1924L4.53524 5.94975Z"
            fill="#6E7491"
          />
        </svg>
      </div>
      <h3 style="align-self: center">Вход</h3>
      <input type="text" placeholder="Введите email" ref="login-input" />
      <input type="password" placeholder="Введите пароль" ref="password-input" />
      <div class="actions">
        <button type="button" class="modal-btn" @click="signIn">Войти</button>
        <p v-if="route.name !== 'SignUp'" @click="signUp">
          Нет аккаунта? <span>Зарегистрироваться</span>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-btn {
  background-color: var(--color-purple-blue);
  transition: 0.5s;
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 4px;
  color: var(--color-grey-100);
}
.modal-btn:hover {
  opacity: 0.7;
  transition: 0.5s;
  cursor: pointer;
}
.modal {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: fixed;
  top: 60px;
  width: 30%;
  padding: 1rem;
  background: #fff;
  z-index: 100;
  left: 50%;
  border-radius: 10px;
  transform: translateX(-50%);
  box-shadow: 2px 3px 10px rgba(0, 0, 0, 0.2);
}

.modal-backdrop {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
}

input {
  margin: 0;
  outline: none;
  border: 2px solid #ccc;
  display: block;
  color: var(--color-grey-400);
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  resize: none;
}

svg:hover {
  cursor: pointer;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.actions p {
  text-align: center;
  color: var(--color-grey-400);
}

.actions p:hover {
  cursor: pointer;
}

.close {
  align-self: flex-end;
}
</style>
