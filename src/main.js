import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/css/variables.css'
import App from './App.vue'
import router from './router'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import SignInModal from '@/components/sign-in-modal.vue'
import AppHeader from '@/components/app-header.vue'
import AppFooter from '@/components/app-footer.vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const toastOptions = {
  transition: 'Vue-Toastification__fade',
  maxToasts: 3,
  newestOnTop: true,
  filterBeforeCreate: (toast, toasts) => {
    if (toasts.filter((t) => t.type === toast.type).length !== 0) {
      return false
    }
    return toast
  },
}

const app = createApp(App).use(createPinia()).use(router).use(Toast, toastOptions)

app.component('sign-in', SignInModal)
app.component('app-header', AppHeader)
app.component('app-footer', AppFooter)
app.component('date-picker', VueDatePicker)

app.mount('#app')
