import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'

const useUserStore = defineStore('users', () => {
  const currentUser = ref(null)
  const userError = ref(null)
  const usersList = ref([])

  function getError(err) {
    if (!err.response || err.response.status === 502) {
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
        'http://localhost:5267/api/user/auth',
        {
          login: user.login,
          password: user.password,
        },
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
            JSON.stringify({
              login: user.login,
              password: res.data.uPassword,
            }),
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
      .post('http://localhost:5267/api/User/Register', {
        uId: 0,
        uSurname: user.surname,
        uName: user.name,
        uPatronymic: user.patronymic,
        uEmail: user.login,
        uPassword: user.password,
        uRole: '',
        uPhone: user.phone,
        uBirthdate: user.birthdate,
        uPassportSerial: user.serial,
        uPassportNumber: user.number,
      })
      .then((res) => {
        currentUser.value = res.data
        if (!localStorage.getItem('user')) {
          localStorage.setItem(
            'user',
            JSON.stringify({
              login: user.login,
              password: res.data.uPassword,
            }),
          )
        }
        userError.value = null
      })
      .catch((err) => getError(err))
  }

  async function getUsers() {
    await axios
      .get('http://localhost:5267/api/User/GetUsers')
      .then((res) => {
        usersList.value = Object.keys(res.data).map((key) => {
          return {
            id: key,
            ...res.data[key],
          }
        })
        userError.value = null
      })
      .catch((err) => getError(err))
  }

  async function getUser(userId) {
    await axios
      .get(`http://localhost:5267/api/User/GetUser/${userId}`)
      .then((res) => {
        userError.value = null
        return res.data
      })
      .catch((err) => getError(err))
  }

  async function editUser(user, isPasswordEditing) {
    await axios
      .post('http://localhost:5267/api/User/EditUser', user)
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
      .post('http://localhost:5267/api/User/ChangePassword', user)
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
      .delete(`http://localhost:5267/api/User/DeleteUser/${userId}`)
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
    login,
    register,
    getUsers,
    getUser,
    usersList,
    editUser,
    deleteUser,
    logout,
    clearUsers,
  }
})

export default useUserStore
