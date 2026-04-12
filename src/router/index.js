import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import SignUpView from '@/views/SignUpView.vue'
import AllFlightsView from '@/views/AllFlightsView.vue'
import useUserStore from '@/stores/user.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeView,
    },
    {
      path: '/signup',
      name: 'SignUp',
      component: SignUpView,
    },
    {
      path: '/users/:id',
      name: 'User',
      component: () => import('../views/UserView.vue'),
      meta: { isLoginNeeded: true },
    },
    {
      path: '/flights',
      name: 'Flights',
      component: AllFlightsView,
    },
    {
      path: '/flights/:id',
      name: 'Flight',
      component: () => import('../views/FlightView.vue'),
    },
    {
      path: '/users/:id/flights',
      name: 'UserFlights',
      component: () => import('../views/UserFlights.vue'),
      meta: { isLoginNeeded: true },
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { isLoginNeeded: true, isAdminPrivileges: true },
    },
    {
      path: '/admin/edit/:entity(flight|airline|airport)/:id(new|\\d+)',
      name: 'AdminEdit',
      component: () => import('@/views/AdminEdit.vue'),
      meta: { isLoginNeeded: true, isAdminPrivileges: true }
    },
  ],
})

router.beforeEach(async (to, from) => {
  const userStore = useUserStore()

  if (!userStore.currentUser && localStorage.getItem('user')) {
    await userStore.login({})
  }

  if (to.meta.isLoginNeeded && !userStore.currentUser) {
    return { name: 'Home' }
  }

  if (
    to.meta.isLoginNeeded &&
    to.meta.isAdminPrivileges &&
    userStore.currentUser.uRole !== 'Менеджер'
  ) {
    return { name: 'Home' }
  }

  if (
    to.meta.isLoginNeeded &&
    (to.name === 'User' || to.name === 'UserFlights') &&
    !to.path.includes(userStore.currentUser.uId)
  ) {
    return { name: 'Home' }
  }
})

export default router
