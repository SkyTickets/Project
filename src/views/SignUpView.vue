<script setup>
import { ref, useTemplateRef } from 'vue'
import useUserStore from '@/stores/user.js'
import usePassengerStore from '@/stores/passenger.js'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import { ru } from 'date-fns/locale'

const toast = useToast()
const router = useRouter()
const store = useUserStore()
const passengerStore = usePassengerStore()
const selectedDate = ref()

const surnameInput = useTemplateRef('surname-input')
const nameInput = useTemplateRef('name-input')
const patronymicInput = useTemplateRef('patronymic-input')
const loginInput = useTemplateRef('login-input')
const passwordInput = useTemplateRef('password-input')
const phoneInput = useTemplateRef('phone-input')

const getValue = (ref) => {
  const el = ref.value
  if (!el) return ''

  if (typeof el.value === 'string') {
    return el.value.trim()
  }

  return ''
}

const signUp = async () => {
  let surname = getValue(surnameInput)
  let name = getValue(nameInput)
  let patronymic = getValue(patronymicInput) ? getValue(patronymicInput) : ''
  let login = getValue(loginInput)
  let password = getValue(passwordInput)
  let phone = getValue(phoneInput)
  let birthdate = selectedDate.value ? selectedDate.value.toISOString().split('T')[0] : null

  if (!surname || !name || !login || !password || !phone || !birthdate) {
    toast.error('Заполните все поля')
    return
  }
  if (!String(login).match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]/)) {
    toast.error('Неверный формат почты')
    return
  }
  if (!String(password).match(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/)) {
    toast.error('Пароль должен содержать нижний, верхний регистр, число и быть не менее 8 символов')
    return
  }
  const cleaned = phone.replace(/[\s()\-+]/g, '')
  const regex = /^(?:\+7|8|7)?(\d{10})$/
  if (!cleaned.match(regex)) {
    toast.error('Неверный формат номера телефона')
    return
  }

  const yearsPassed = new Date().getFullYear() - selectedDate.value.getFullYear()

  if (yearsPassed < 18) {
    toast.error('Вам должно быть не меньше 18 лет')
    return
  }

  const user = {
    surname,
    name,
    patronymic: patronymic || '',
    login,
    password,
    phone,
    birthdate,
  }

  await store.register(user)

  if (store.userError) {
    toast.error(store.userError)
    return
  }

  if (store.currentUser) {
    toast.success('Регистрация прошла успешно')
    await router.push({ name: 'Home' })
  }
}
</script>

<template>
  <div class="sign-up">
    <div>
      <h3>Регистрация</h3>
    </div>
    <div class="input-wrapper">
      <input type="text" required placeholder="Введите фамилию" ref="surname-input" />
      <span class="required-indicator">*</span>
    </div>

    <div class="input-wrapper">
      <input type="text" required placeholder="Введите имя" ref="name-input" />
      <span class="required-indicator">*</span>
    </div>

    <div class="input-wrapper">
      <input type="text" placeholder="Введите отчество" ref="patronymic-input" />
    </div>

    <div class="input-wrapper">
      <input type="text" required placeholder="Введите email" ref="login-input" />
      <span class="required-indicator">*</span>
    </div>

    <div class="input-wrapper">
      <input type="password" required placeholder="Введите пароль" ref="password-input" />
      <span class="required-indicator">*</span>
    </div>

    <div class="input-wrapper">
      <input type="text" required placeholder="Введите телефон" ref="phone-input" />
      <span class="required-indicator">*</span>
    </div>

    <div class="input-wrapper datepicker-wrapper">
      <date-picker
        v-model="selectedDate"
        class="datepicker"
        :time-config="{ enableTimePicker: false }"
        :maxDate="Date.now()"
        :locale="ru"
        placeholder="Введите дату рождения"
      />
      <span class="required-indicator">*</span>
    </div>

    <p class="required-hint"><span style="color: #e74c3c">*</span> — обязательные поля</p>
    <div class="actions">
      <button type="button" class="btn" @click="signUp">Зарегистрироваться</button>
    </div>
  </div>
</template>

<style>
input:focus {
  outline: none;
}
input::-webkit-calendar-picker-indicator {
  display: none !important;
}
.sign-up input {
  color: var(--color-grey-400);
  border: 1px solid #cbd4e6;
  border-radius: 4px;
  font-size: 16px;
  width: 35vw;
  height: 5vh;
  padding-left: 40px;
}
</style>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.sign-up {
  display: flex;
  align-items: center;
  width: 35vw;
  height: auto;
  margin: auto;
  flex-direction: column;
  gap: 10px;
}

.btn {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  height: 5vh;
  font-size: 16px;
  background: var(--color-purple-blue);
  color: white;
}

.btn:hover {
  cursor: pointer;
}

svg:hover {
  cursor: pointer;
}

.actions {
  display: flex;
  flex-direction: column;
}

.input-wrapper {
  position: relative;
  width: 35vw;
}

.input-wrapper input,
.input-wrapper .datepicker {
  width: 100%;
  padding-right: 30px;
}

.required-indicator {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #e74c3c;
  font-size: 18px;
  font-weight: bold;
  pointer-events: none;
  user-select: none;
}
</style>
