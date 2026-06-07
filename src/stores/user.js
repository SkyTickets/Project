import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'

const BASE = 'http://localhost:5267/api'

const useUserStore = defineStore('users', () => {
  const currentUser = ref(null)
  const userError = ref(null)
  const usersList = ref([])

  function getError(err) {
    if (!err.response || err.response.status >= 500) {
      userError.value =
        'SkyTickets в настоящее время испытывает перебои в работе. Повторите попытку позже.'
      return
    }
    userError.value = err.response.data
  }

  async function login(user) {
    if (localStorage.getItem('user')) {
      const localUser = JSON.parse(localStorage.getItem('user'))
      user.login = localUser.login
      user.password = localUser.password
    }

    await axios
      .postForm(
        `${BASE}/User/Auth`,
        { login: user.login, password: user.password },
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Accept: 'text/plain',
          },
        },
      )
      .then((res) => {
        currentUser.value = res.data
        if (!localStorage.getItem('user')) {
          localStorage.setItem(
            'user',
            JSON.stringify({ login: user.login, password: res.data.uPassword }),
          )
        }
        userError.value = null
      })
      .catch((err) => {
        if (err.response) {
          localStorage.removeItem('user')
        }
        getError(err)
      })
  }

  async function register(user) {
    await axios
      .post(`${BASE}/User/Register`, {
        uId: 0,
        uSurname: user.surname,
        uName: user.name,
        uPatronymic: user.patronymic ?? null,
        uEmail: user.login,
        uPassword: user.password,
        uRole: '',
        uPhone: user.phone,
        uBirthdate: user.birthdate,
      })
      .then((res) => {
        currentUser.value = res.data
        if (!localStorage.getItem('user')) {
          localStorage.setItem(
            'user',
            JSON.stringify({ login: user.login, password: res.data.uPassword }),
          )
        }
        userError.value = null
      })
      .catch((err) => getError(err))
  }

  async function getUsers() {
    await axios
      .get(`${BASE}/User/GetUsers`)
      .then((res) => {
        usersList.value = res.data
        userError.value = null
      })
      .catch((err) => getError(err))
  }

  async function getUser(userId) {
    let data = null
    await axios
      .get(`${BASE}/User/GetUser/${userId}`)
      .then((res) => {
        data = res.data
        userError.value = null
      })
      .catch((err) => getError(err))
    return data
  }

  async function editUser(user, isPasswordEditing) {
    await axios
      .post(`${BASE}/User/EditUser`, user)
      .then(async (res) => {
        currentUser.value = res.data
        userError.value = null
        if (isPasswordEditing) {
          await changeUserPassword(user)
        }
      })
      .catch((err) => getError(err))
  }

  async function changeUserPassword(user) {
    await axios
      .post(`${BASE}/User/ChangePassword`, user)
      .then((res) => {
        currentUser.value = res.data
        userError.value = null
      })
      .catch((err) => getError(err))
  }

  async function deleteUser(userId) {
    if (currentUser.value.uId !== userId && currentUser.value.uRole !== 'Менеджер') {
      userError.value = 'Недостаточно прав'
      return
    }
    await axios
      .delete(`${BASE}/User/DeleteUser/${userId}`)
      .then(() => {
        if (usersList.value.length > 0) {
          const index = usersList.value.findIndex((u) => u.uId === userId)
          if (index > -1) {
            usersList.value.splice(index, 1)
          }
        }
        if (currentUser.value.uId === userId) {
          currentUser.value = null
        }
        userError.value = null
      })
      .catch((err) => getError(err))
  }

  async function uploadUserImage(userId, file) {
    const formData = new FormData()
    formData.append('userId', userId)
    formData.append('file', file)
    await axios
      .post(`${BASE}/User/UploadUserImage`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(() => {
        userError.value = null
      })
      .catch((err) => getError(err))
  }

  function logout() {
    localStorage.removeItem('user')
    currentUser.value = null
  }

  function clearUsers() {
    usersList.value = []
  }

  return {
    currentUser,
    userError,
    usersList,
    login,
    register,
    getUsers,
    getUser,
    editUser,
    changeUserPassword,
    deleteUser,
    uploadUserImage,
    logout,
    clearUsers,
  }
})

export default useUserStore
