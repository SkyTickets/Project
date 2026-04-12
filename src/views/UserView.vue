<script setup>
import { ref, onMounted, useTemplateRef } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import useUserStore from '@/stores/user.js'

const surnameInput = useTemplateRef('surnameInput')
const nameInput = useTemplateRef('nameInput')
const patronymicInput = useTemplateRef('patronymicInput')
const phoneInput = useTemplateRef('phoneInput')
const passwordInput = useTemplateRef('passwordInput')

const toast = useToast()
const router = useRouter()
const store = useUserStore()
const isEditing = ref(false)

onMounted(() => {
  if (surnameInput.value) surnameInput.value.value = store.currentUser.uSurname || ''
  if (nameInput.value) nameInput.value.value = store.currentUser.uName || ''
  if (patronymicInput.value) patronymicInput.value.value = store.currentUser.uPatronymic || ''
  if (phoneInput.value) phoneInput.value.value = store.currentUser.uPhone || ''
})

const showEditing = () => {
  const surname = surnameInput.value
  const name = nameInput.value
  const patronymic = patronymicInput.value
  const phone = phoneInput.value


  if (isEditing.value) {
    surname.value = store.currentUser.uSurname || ''
    name.value = store.currentUser.uName || ''
    patronymic.value = store.currentUser.uPatronymic || ''
    phone.value = store.currentUser.uPhone || ''
  }
}

const editProfile = () => {
  isEditing.value = true
  setTimeout(async () => {
    showEditing()
  }, 10)
}

const cancelEditProfile = () => {
  isEditing.value = false
}

onBeforeRouteLeave((to, from, next) => {
  if (isEditing.value) {
    if (!confirm('Изменения не сохранены, вы уверены что хотите завершить редактирование?')) {
      next(false)
    }
    next()
  }
  next()
})

const getValue = (inputRef) => {
  const el = inputRef.value
  if (!el) return ''
  return el.value?.trim() || ''
}

const saveProfile = async () => {
  const surname = getValue(surnameInput)
  const name = getValue(nameInput)
  const patronymic = getValue(patronymicInput)
  const phone = getValue(phoneInput)
  const password = getValue(passwordInput)

  if (!surname || !name || !phone) {
    toast.error('Заполните обязательные поля')
    return
  }

  const cleanedPhone = phone.replace(/[\s()\-+]/g, '')
  const phoneRegex = /^(?:\+7|8|7)?(\d{10})$/
  const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/
  if (!cleanedPhone.match(phoneRegex)) {
    toast.error('Неверный формат телефона')
    return
  }

  if (password && !passwordRegex.test(password)) {
    toast.error('Пароль должен содержать нижний, верхний регистр, число и быть не менее 8 символов')
    return
  }

  const payload = {
    uId: store.currentUser.uId,
    uSurname: surname,
    uName: name,
    uPatronymic: patronymic || '',
    uPhone: phone,
    uRole: '',
    uPassword: password || '',
    uEmail: store.currentUser.uEmail,
    uBirthdate: store.currentUser.uBirthdate,
    uPassportSerial: store.currentUser.uPassportSerial,
    uPassportNumber: store.currentUser.uPassportNumber,
  }

  await store.editUser(payload, !!password)
  if (store.userError) {
    toast.error(store.userError)
  } else {
    toast.success('Профиль обновлён')
    isEditing.value = false
  }
}
/*
const avatarInput = useTemplateRef('avatar-input')
const selectedFile = ref(null)
const avatarPreview = ref('')
const currentAvatar = computed(() => {
  if (avatarPreview.value) return avatarPreview.value
  if (store.currentUser?.uAvatar) return `http://localhost:3000/${store.currentUser.uAvatar}`
  return '/default-avatar.png'
})
*/
/*
const handleAvatarChange = (e) => {
  const file = e.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.error('Пожалуйста, выберите изображение')
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    toast.error('Изображение не должно превышать 2 МБ')
    return
  }

  selectedFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}
*/

const deleteAccount = async () => {
  if (!confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.')) {
    return
  }
  await store.deleteUser(store.currentUser.uId)
  if (store.userError) {
    toast.error(store.userError)
  } else {
    toast.success('Аккаунт удалён')
    await router.push({ name: 'Home' })
  }
}

const logout = () => {
  store.logout()
  router.push({ name: 'Home' })
  toast.info('Вы вышли из аккаунта')
}
</script>

<template>
  <div class="cabinet">
    <h2>Личный кабинет</h2>

    <!--
    <div class="avatar-section">
      <img :src="currentAvatar" alt="Аватар" class="avatar" />
      <label v-if="isEditing" class="upload-btn">
        <input
          type="file"
          ref="avatar-input"
          accept="image/*"
          @change="handleAvatarChange"
          style="display: none"
        />
        <span>Изменить аватар</span>
      </label>
    </div>
-->

    <div class="info">
      <p><strong>Email:</strong> {{ store.currentUser?.uEmail }}</p>
    </div>

    <div class="form" v-if="isEditing">
      <input ref="surnameInput" type="text" placeholder="Фамилия" required />
      <input ref="nameInput" type="text" placeholder="Имя" required />
      <input ref="patronymicInput" type="text" placeholder="Отчество" />
      <input ref="phoneInput" type="text" placeholder="Телефон" required />
      <input ref="passwordInput" type="password" placeholder="Пароль" />

      <div class="actions">
        <button @click="saveProfile" class="btn save">Сохранить</button>
        <button @click="cancelEditProfile" class="btn cancel">Отмена</button>
      </div>
    </div>

    <div class="form read-only" v-else>
      <p><strong>Фамилия:</strong> {{ store.currentUser?.uSurname }}</p>
      <p><strong>Имя:</strong> {{ store.currentUser?.uName }}</p>
      <p><strong>Отчество:</strong> {{ store.currentUser?.uPatronymic || '—' }}</p>
      <p><strong>Телефон:</strong> {{ store.currentUser?.uPhone }}</p>
      <p><strong>Дата рождения:</strong> {{ store.currentUser?.uBirthdate }}</p>
      <p>
        <strong>Паспорт:</strong> {{ store.currentUser?.uPassportSerial }}
        {{ store.currentUser?.uPassportNumber }}
      </p>

      <div class="actions">
        <button @click="editProfile" class="btn edit">Редактировать профиль</button>
      </div>
    </div>

    <div class="danger-zone">
      <button @click="deleteAccount" class="btn danger">Удалить аккаунт</button>
      <button @click="logout" class="btn logout">Выйти</button>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.cabinet {
  max-width: 500px;
  margin: 10px auto;
  padding: 30px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

/*
.avatar-section {
  text-align: center;
  margin-bottom: 20px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #605dec;
}

.upload-btn {
  margin-top: 0.5rem;
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #605dec;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
*/

.info,
.form p {
  margin: 10px 0;
  color: #555;
}

.form input {
  width: 100%;
  padding: 10px 10px;
  margin: 10px 0;
  border: 1px solid #cbd4e6;
  border-radius: 6px;
  font-size: 1rem;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: 0.2s;
}

.btn.save {
  background: #28a745;
  color: white;
}
.btn.cancel {
  background: #6c757d;
  color: white;
}
.btn.edit {
  background: #605dec;
  color: white;
}
.btn.danger {
  background: #dc3545;
  color: white;
}
.btn.logout {
  background: #ffc107;
  color: #212529;
}

.danger-zone {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.read-only p {
  background: #f8f9fa;
  padding: 10px 10px;
  border-radius: 6px;
  margin: 10px 0;
}
</style>
