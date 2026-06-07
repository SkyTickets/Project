<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import useUserStore from '@/stores/user.js'
import useFlightStore from '@/stores/flight.js'
import useAirlineStore from '@/stores/airline.js'
import useAirportStore from '@/stores/airport.js'
import useTicketStore from '@/stores/ticket.js'
import useBookingStore from '@/stores/booking.js'
import usePassengerStore from '@/stores/passenger.js'
import useAirplaneStore from '@/stores/airplane.js'
import useAdditionalServiceStore from '@/stores/additionalService.js'

const toast = useToast()
const router = useRouter()

const userStore = useUserStore()
const flightStore = useFlightStore()
const airlineStore = useAirlineStore()
const airportStore = useAirportStore()
const ticketStore = useTicketStore()
const bookingStore = useBookingStore()
const passengerStore = usePassengerStore()
const airplaneStore = useAirplaneStore()
const serviceStore = useAdditionalServiceStore()

const section = ref('dashboard')
const loading = ref(false)

const modal = ref({ open: false, mode: 'add', entity: '', data: {} })

const isManager = computed(() => userStore.currentUser?.uRole === 'Менеджер')

const fmtDt = (d) => (d ? format(new Date(d), 'd MMM yyyy HH:mm', { locale: ru }) : '—')
const fmtDate = (d) => (d ? format(new Date(d), 'dd.MM.yyyy', { locale: ru }) : '—')

const sectionLoaders = {
  flights: () => flightStore.getFlights(),
  users: () => userStore.getUsers(),
  airlines: () => airlineStore.getAirlines(),
  airports: () => airportStore.getAirports(),
  airplanes: () => airplaneStore.getAirplanes(),
  tickets: () => ticketStore.getTickets(),
  bookings: () => bookingStore.getBookings(),
  passengers: () => passengerStore.getPassengers(),
  services: () => serviceStore.getServices(),
}

const switchSection = async (s) => {
  section.value = s
  if (s in sectionLoaders && !isLoaded(s)) {
    loading.value = true
    await sectionLoaders[s]()
    loading.value = false
  }
}

const loadedSections = ref(new Set())
const isLoaded = (s) => loadedSections.value.has(s)

onMounted(async () => {
  if (!userStore.currentUser || !isManager.value) {
    toast.error('Доступ запрещён')
    await router.push('/')
    return
  }
  loading.value = true
  await Promise.all([
    flightStore.getFlights(),
    userStore.getUsers(),
    airlineStore.getAirlines(),
    airportStore.getAirports(),
    ticketStore.getTickets(),
    bookingStore.getBookings(),
    passengerStore.getPassengers(),
    airplaneStore.getAirplanes(),
    serviceStore.getServices(),
  ])
  Object.keys(sectionLoaders).forEach((s) => loadedSections.value.add(s))
  loading.value = false
})

onBeforeUnmount(() => {
  flightStore.clearFlights()
  userStore.clearUsers()
})

const entityFields = {
  airline: [
    { key: 'alName', label: 'Название', type: 'text', required: true },
    { key: 'alEmail', label: 'Email', type: 'email', required: true },
  ],
  airport: [
    { key: 'apName', label: 'Название', type: 'text', required: true },
    { key: 'apCity', label: 'Город', type: 'text', required: true },
    { key: 'apCountry', label: 'Страна', type: 'text', required: true },
    { key: 'apStreet', label: 'Улица', type: 'text' },
    { key: 'apBuilding', label: 'Дом', type: 'text' },
  ],
  airplane: [
    { key: 'plModel', label: 'Модель', type: 'text', required: true },
    { key: 'plEconomySeats', label: 'Мест эконом', type: 'number', required: true },
    { key: 'plComfortSeats', label: 'Мест комфорт', type: 'number', required: true },
    { key: 'plBusinessSeats', label: 'Мест бизнес', type: 'number', required: true },
    { key: 'plFirstClassSeats', label: 'Мест 1-й класс', type: 'number', required: true },
  ],
  service: [
    { key: 'asName', label: 'Название услуги', type: 'text', required: true },
    { key: 'asPrice', label: 'Цена (₽)', type: 'number', required: true },
  ],
  flight: [
    { key: 'fAirline', label: 'Авиакомпания', type: 'select', list: 'airlines', required: true },
    { key: 'fAirplane', label: 'Самолёт', type: 'select', list: 'airplanes', required: true },
    {
      key: 'fDepartureAirport',
      label: 'Аэропорт отправления',
      type: 'select',
      list: 'airports',
      required: true,
    },
    {
      key: 'fArrivalAirport',
      label: 'Аэропорт прибытия',
      type: 'select',
      list: 'airports',
      required: true,
    },
    { key: 'fDepartureTime', label: 'Дата вылета', type: 'datetime-local', required: true },
    { key: 'fArrivalTime', label: 'Дата прилёта', type: 'datetime-local', required: true },
    { key: 'fBasePrice', label: 'Базовая цена (₽)', type: 'number', required: true },
  ],
  passenger: [
    { key: 'pSurname', label: 'Фамилия', type: 'text', required: true },
    { key: 'pName', label: 'Имя', type: 'text', required: true },
    { key: 'pPatronymic', label: 'Отчество', type: 'text' },
    { key: 'pBirthdate', label: 'Дата рождения', type: 'date', required: true },
    { key: 'pPassportSerial', label: 'Серия (4 цифры)', type: 'text', required: true },
    { key: 'pPassportNumber', label: 'Номер (6 цифр)', type: 'text', required: true },
  ],
}

const getOptions = (listName) => {
  if (listName === 'airlines')
    return airlineStore.airlinesList.map((a) => ({ value: a.alName, label: a.alName }))
  if (listName === 'airplanes')
    return airplaneStore.airplanesList.map((a) => ({ value: a.plModel, label: a.plModel }))
  if (listName === 'airports')
    return airportStore.airportsList.map((a) => ({
      value: a.apName,
      label: `${a.apCity} (${a.apName})`,
    }))
  return []
}

const scrollTrigger = ref(null)
let observer = null

const initObserver = () => {
  if (observer) observer.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && flightStore.hasMore) {
        flightStore.loadMoreFlights()  
      }
    },
    { threshold: 0.1 },
  )

  if (scrollTrigger.value) observer.observe(scrollTrigger.value)
}

watch(section, (newVal) => {
  if (newVal === 'flights') {
    nextTick(initObserver)
  } else {
    if (observer) observer.disconnect()
  }
})

const openAdd = (entity) => {
  modal.value = { open: true, mode: 'add', entity, data: {} }
}

const openEdit = (entity, row) => {
  const data = { ...row }
  if (entity === 'flight') {
    if (data.fDepartureTime) data.fDepartureTime = data.fDepartureTime.slice(0, 16)
    if (data.fArrivalTime) data.fArrivalTime = data.fArrivalTime.slice(0, 16)
  }
  modal.value = { open: true, mode: 'edit', entity, data }
}

const closeModal = () => {
  modal.value.open = false
}

const saveModal = async () => {
  loading.value = true
  const { mode, entity, data } = modal.value

  try {
    const isAdd = mode === 'add'
    if (entity === 'airline') {
      isAdd ? await airlineStore.addAirline(data) : await airlineStore.editAirline(data)
    } else if (entity === 'airport') {
      isAdd ? await airportStore.addAirport(data) : await airportStore.editAirport(data)
    } else if (entity === 'airplane') {
      isAdd ? await airplaneStore.addAirplane(data) : await airplaneStore.editAirplane(data)
    } else if (entity === 'service') {
      isAdd ? await serviceStore.addService(data) : await serviceStore.editService(data)
    } else if (entity === 'flight') {
      isAdd ? await flightStore.addFlight(data) : await flightStore.editFlight(data)
    } else if (entity === 'passenger') {
      isAdd ? await passengerStore.addPassenger(data) : await passengerStore.editPassenger(data)
    }

    const err =
      airlineStore.airlineError ||
      airportStore.airportError ||
      airplaneStore.airplaneError ||
      serviceStore.serviceError ||
      flightStore.flightError ||
      passengerStore.passengerError
    if (err) {
      toast.error(err)
    } else {
      toast.success(isAdd ? 'Добавлено!' : 'Сохранено!')
      closeModal()
    }
  } finally {
    loading.value = false
  }
}

const confirmDelete = async (entity, id, label = '') => {
  if (!confirm(`Удалить ${label || 'запись'}? Это действие нельзя отменить.`)) return
  loading.value = true
  try {
    if (entity === 'airline') await airlineStore.deleteAirline(id)
    else if (entity === 'airport') await airportStore.deleteAirport(id)
    else if (entity === 'airplane') await airplaneStore.deleteAirplane(id)
    else if (entity === 'service') await serviceStore.deleteService(id)
    else if (entity === 'flight') await flightStore.deleteFlight?.(id)
    else if (entity === 'user') await userStore.deleteUser(id)
    toast.success('Удалено')
  } finally {
    loading.value = false
  }
}

const logout = () => {
  userStore.logout()
  router.push('/')
}

const goToTicket = (ticketId) => {
  const route = router.push({ name: 'TicketView', params: { id: ticketId } });
};

const searchQuery = ref('')
const filteredList = (list) => {
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter((item) =>
    Object.values(item).some((v) =>
      String(v ?? '')
        .toLowerCase()
        .includes(q),
    ),
  )
}
</script>

<template>
  <div class="admin-wrapper">
    <div class="admin-body">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-section-title">Данные</div>
        <ul>
          <li
            v-for="item in [
              { key: 'dashboard', icon: '📊', label: 'Обзор' },
              { key: 'flights', icon: '✈️', label: 'Рейсы' },
              { key: 'bookings', icon: '📋', label: 'Бронирования' },
              { key: 'tickets', icon: '🎫', label: 'Билеты' },
              { key: 'users', icon: '👤', label: 'Пользователи' },
              { key: 'passengers', icon: '🧳', label: 'Пассажиры' },
            ]"
            :key="item.key"
            @click="switchSection(item.key)"
            :class="{ active: section === item.key }"
          >
            <span class="icon">{{ item.icon }}</span
            >{{ item.label }}
          </li>
        </ul>
        <div class="sidebar-section-title">Справочники</div>
        <ul>
          <li
            v-for="item in [
              { key: 'airlines', icon: '🏢', label: 'Авиакомпании' },
              { key: 'airports', icon: '🏛️', label: 'Аэропорты' },
              { key: 'airplanes', icon: '🛩️', label: 'Самолёты' },
              { key: 'services', icon: '🛎️', label: 'Доп. услуги' },
            ]"
            :key="item.key"
            @click="switchSection(item.key)"
            :class="{ active: section === item.key }"
          >
            <span class="icon">{{ item.icon }}</span
            >{{ item.label }}
          </li>
        </ul>
        <div class="sidebar-footer">
          <span class="sidebar-email">{{ userStore.currentUser?.uEmail }}</span>
          <button @click="logout" class="sidebar-logout">Выйти</button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="content">
        <div v-if="loading" class="loading-bar">Загрузка...</div>

        <!-- Dashboard -->
        <section v-if="section === 'dashboard'" class="dashboard">
          <h3>Добро пожаловать, {{ userStore.currentUser?.uName }}!</h3>
          <div class="stats">
            <div
              class="stat-card"
              v-for="s in [
                { label: 'Рейсов', value: flightStore.totalFlightsCount, color: '#3b82f6' },
                {
                  label: 'Бронирований',
                  value: bookingStore.bookingsList.length,
                  color: '#8b5cf6',
                },
                { label: 'Билетов', value: ticketStore.ticketsList.length, color: '#10b981' },
                { label: 'Пользователей', value: userStore.usersList.length, color: '#f59e0b' },
                {
                  label: 'Авиакомпаний',
                  value: airlineStore.airlinesList.length,
                  color: '#ef4444',
                },
                { label: 'Аэропортов', value: airportStore.airportsList.length, color: '#06b6d4' },
                { label: 'Самолётов', value: airplaneStore.airplanesList.length, color: '#84cc16' },
                { label: 'Доп. услуг', value: serviceStore.servicesList.length, color: '#f97316' },
              ]"
              :key="s.label"
              :style="{ '--c': s.color }"
            >
              <p>{{ s.label }}</p>
              <strong>{{ s.value }}</strong>
            </div>
          </div>
        </section>

        <!-- Generic table sections -->
        <template
          v-for="sec in [
            {
              key: 'airlines',
              title: 'Авиакомпании',
              entity: 'airline',
              list: () => filteredList(airlineStore.airlinesList),
              cols: ['alId', 'alName', 'alEmail'],
              heads: ['ID', 'Название', 'Email'],
              canAdd: true,
              canEdit: true,
              canDelete: true,
              idKey: 'alId',
              labelFn: (r) => r.alName,
            },

            {
              key: 'airports',
              title: 'Аэропорты',
              entity: 'airport',
              list: () => filteredList(airportStore.airportsList),
              cols: ['apId', 'apCity', 'apName', 'apCountry', 'apStreet', 'apBuilding'],
              heads: ['ID', 'Город', 'Название', 'Страна', 'Улица', 'Дом'],
              canAdd: true,
              canEdit: true,
              canDelete: true,
              idKey: 'apId',
              labelFn: (r) => r.apName,
            },

            {
              key: 'airplanes',
              title: 'Самолёты',
              entity: 'airplane',
              list: () => filteredList(airplaneStore.airplanesList),
              cols: [
                'plId',
                'plModel',
                'plEconomySeats',
                'plComfortSeats',
                'plBusinessSeats',
                'plFirstClassSeats',
              ],
              heads: ['ID', 'Модель', 'Эконом', 'Комфорт', 'Бизнес', '1-й кл.'],
              canAdd: true,
              canEdit: true,
              canDelete: true,
              idKey: 'plId',
              labelFn: (r) => r.plModel,
            },

            {
              key: 'services',
              title: 'Дополнительные услуги',
              entity: 'service',
              list: () => filteredList(serviceStore.servicesList),
              cols: ['asId', 'asName', 'asPrice'],
              heads: ['ID', 'Название', 'Цена (₽)'],
              canAdd: true,
              canEdit: true,
              canDelete: true,
              idKey: 'asId',
              labelFn: (r) => r.asName,
            },

            {
              key: 'users',
              title: 'Пользователи',
              entity: 'user',
              list: () => filteredList(userStore.usersList),
              cols: ['uId', 'uSurname', 'uName', 'uEmail', 'uPhone', 'uRole', 'uBirthdate'],
              heads: ['ID', 'Фамилия', 'Имя', 'Email', 'Телефон', 'Роль', 'Дата рождения'],
              canAdd: false,
              canEdit: false,
              canDelete: true,
              idKey: 'uId',
              labelFn: (r) => `${r.uSurname} ${r.uName}`,
            },

            {
              key: 'passengers',
              title: 'Пассажиры',
              entity: 'passenger',
              list: () => filteredList(passengerStore.passengersList ?? []),
              cols: [
                'pId',
                'pSurname',
                'pName',
                'pPatronymic',
                'pBirthdate',
                'pPassportSerial',
                'pPassportNumber',
              ],
              heads: ['ID', 'Фамилия', 'Имя', 'Отчество', 'Дата рождения', 'Серия', 'Номер'],
              canAdd: true,
              canEdit: true,
              canDelete: false,
              idKey: 'pId',
              labelFn: (r) => `${r.pSurname} ${r.pName}`,
            },
          ]"
          :key="sec.key"
        >
          <section v-if="section === sec.key" class="entity-list">
            <div class="header-bar">
              <h3>{{ sec.title }}</h3>
              <div class="bar-right">
                <input
                  class="search-input"
                  v-model="searchQuery"
                  placeholder="Поиск..."
                  @input="searchQuery = $event.target.value"
                />
                <button v-if="sec.canAdd" class="action-btn" @click="openAdd(sec.entity)">
                  + Добавить
                </button>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th v-for="h in sec.heads" :key="h">{{ h }}</th>
                    <th v-if="sec.canEdit || sec.canDelete">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sec.list()" :key="row[sec.idKey]">
                    <td v-for="col in sec.cols" :key="col">
                      <span v-if="col.includes('Time') || col.includes('BCreatedAt')">{{
                        fmtDt(row[col])
                      }}</span>
                      <span v-else-if="col.includes('Birthdate') || col.includes('birthdate')">{{
                        fmtDate(row[col])
                      }}</span>
                      <span v-else>{{ row[col] ?? '—' }}</span>
                    </td>
                    <td v-if="sec.canEdit || sec.canDelete" class="actions">
                      <button
                        v-if="sec.canEdit"
                        class="edit-btn"
                        @click="openEdit(sec.entity, row)"
                      >
                        Изменить
                      </button>
                      <button
                        v-if="sec.canDelete"
                        class="danger"
                        @click="confirmDelete(sec.entity, row[sec.idKey], sec.labelFn(row))"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!sec.list().length">
                    <td :colspan="sec.heads.length + 1" class="empty-row">Нет данных</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <!-- Flights — специальная таблица, редактирование через роутер -->
        <section v-if="section === 'flights'" class="entity-list">
          <div class="header-bar">
            <h3>Рейсы</h3>
            <div class="bar-right">
              <input class="search-input" v-model="searchQuery" placeholder="Поиск..." />
              <button class="action-btn" @click="openAdd('flight')">+ Добавить рейс</button>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Откуда → Куда</th>
                  <th>Вылет</th>
                  <th>Прилёт</th>
                  <th>Авиакомпания</th>
                  <th>Самолёт</th>
                  <th>Цена</th>
                  <th>Эконом</th>
                  <th>Комфорт</th>
                  <th>Бизнес</th>
                  <th>1-й кл.</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in filteredList(flightStore.flightsList)" :key="f.fId">
                  <td>{{ f.fId }}</td>
                  <td>{{ f.fDepartureAirport }} → {{ f.fArrivalAirport }}</td>
                  <td>{{ fmtDt(f.fDepartureTime) }}</td>
                  <td>{{ fmtDt(f.fArrivalTime) }}</td>
                  <td>{{ f.fAirline }}</td>
                  <td>{{ f.fAirplane }}</td>
                  <td>{{ f.fBasePrice }} ₽</td>
                  <td>{{ f.fAvailableEconomySeats }}/{{ f.fEconomySeats }}</td>
                  <td>{{ f.fAvailableComfortSeats }}/{{ f.fComfortSeats }}</td>
                  <td>{{ f.fAvailableBusinessSeats }}/{{ f.fBusinessSeats }}</td>
                  <td>{{ f.fAvailableFirstClassSeats }}/{{ f.fFirstClassSeats }}</td>
                  <td class="actions">
                    <button class="edit-btn" @click="openEdit('flight', f)">Изменить</button>
                  </td>
                </tr>
                <tr ref="scrollTrigger" v-if="section === 'flights'">
                  <td colspan="12" style="text-align: center; padding: 15px; color: #6b7280;">
                    {{ flightStore.hasMore ? 'Загрузка...' : 'Все рейсы загружены' }}
                  </td>
                </tr>
                <tr v-if="!flightStore.flightsList.length">
                  <td colspan="12" class="empty-row">Нет данных</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Bookings -->
        <section v-if="section === 'bookings'" class="entity-list">
          <div class="header-bar">
            <h3>Бронирования</h3>
            <input class="search-input" v-model="searchQuery" placeholder="Поиск..." />
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Пользователь</th>
                  <th>Рейс</th>
                  <th>Откуда → Куда</th>
                  <th>Вылет</th>
                  <th>Статус</th>
                  <th>Сумма</th>
                  <th>Создано</th>
                  <th>Билеты</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in filteredList(bookingStore.bookingsList)" :key="b.bId">
                  <td>{{ b.bId }}</td>
                  <td>{{ b.bUserName || b.bUser }}</td>
                  <td>{{ b.bFlight }}</td>
                  <td>{{ b.fDepartureAirport }} → {{ b.fArrivalAirport }}</td>
                  <td>{{ fmtDt(b.fDepartureTime) }}</td>
                  <td>
                    <span
                      class="status-chip"
                      :class="{
                        'chip-paid': b.bStatus === 'Оплачен',
                        'chip-booked': b.bStatus === 'Забронирован',
                        'chip-cancelled': b.bStatus === 'Отменен',
                      }"
                      >{{ b.bStatus }}</span
                    >
                  </td>
                  <td>{{ b.bTotalPrice?.toLocaleString('ru-RU') }} ₽</td>
                  <td>{{ fmtDt(b.bCreatedAt) }}</td>
                  <td>{{ b.tickets?.length ?? 0 }} шт.</td>
                </tr>
                <tr v-if="!bookingStore.bookingsList.length">
                  <td colspan="9" class="empty-row">Нет данных</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Tickets -->
        <section v-if="section === 'tickets'" class="entity-list">
          <div class="header-bar">
            <h3>Билеты</h3>
            <input class="search-input" v-model="searchQuery" placeholder="Поиск..." />
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Бронь</th>
                  <th>Пассажир</th>
                  <th>Класс</th>
                  <th>Цена</th>
                  <th>Откуда → Куда</th>
                  <th>Вылет</th>
                  <th>Услуги</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="t in filteredList(ticketStore.ticketsList)"
                  :key="t.tId"
                  @click="goToTicket(t.tId)"
                  class="clickable-row"
                >
                  <td>{{ t.tId }}</td>
                  <td>{{ t.tBooking }}</td>
                  <td>{{ t.tPassenger }}</td>
                  <td>{{ t.tClass }}</td>
                  <td>{{ t.tPrice?.toLocaleString('ru-RU') }} ₽</td>
                  <td>{{ t.fDepartureAirport }} → {{ t.fArrivalAirport }}</td>
                  <td>{{ fmtDt(t.fDepartureTime) }}</td>
                  <td>
                    <span v-if="t.services?.length" class="services-count">
                      {{ t.services.length }} усл.
                    </span>
                    <span v-else class="no-services-chip">—</span>
                  </td>
                </tr>
                <tr v-if="!ticketStore.ticketsList.length">
                  <td colspan="8" class="empty-row">Нет данных</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>

    <!-- Universal Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="edit-modal">
          <div class="edit-modal-header">
            <h3>
              {{ modal.mode === 'add' ? 'Добавление' : 'Редактирование' }}
              —
              {{
                {
                  airline: 'авиакомпании',
                  airport: 'аэропорта',
                  airplane: 'самолёта',
                  service: 'услуги',
                  flight: 'рейса',
                  passenger: 'пассажира',
                }[modal.entity]
              }}
            </h3>
            <button class="close-btn" @click="closeModal">✕</button>
          </div>
          <div class="edit-modal-body">
            <div class="form-grid">
              <div
                v-for="field in entityFields[modal.entity] ?? []"
                :key="field.key"
                class="form-group"
              >
                <label>{{ field.label }}<span v-if="field.required" class="req">*</span></label>

                <select
                  v-if="field.type === 'select'"
                  v-model="modal.data[field.key]"
                  :required="field.required"
                  :disabled="loading"
                >
                  <option value="" disabled>Выберите...</option>
                  <option v-for="opt in getOptions(field.list)" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>

                <input
                  v-else
                  :type="field.type"
                  v-model="modal.data[field.key]"
                  :required="field.required"
                  :disabled="loading"
                />
              </div>
            </div>
          </div>
          <div class="edit-modal-footer">
            <button class="btn-secondary" @click="closeModal">Отмена</button>
            <button class="btn-primary" :disabled="loading" @click="saveModal">
              {{ loading ? 'Сохранение...' : modal.mode === 'add' ? 'Добавить' : 'Сохранить' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.admin-wrapper {
  min-height: 100vh;
  background: #ffffff;
  font-family: var(--font-family-nunito-sans), sans-serif;
  display: flex;
  flex-direction: column;
}

.form-group select {
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 14px;
  outline: none;
  background-color: white;
  cursor: pointer;
  appearance: auto;
}

.form-group select:focus {
  border-color: #7c3aed;
}

.admin-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 0px);
}

.sidebar {
  width: 230px;
  background: #ffffff;
  color: #1e1b4b;
  flex-shrink: 0;
  border-right: 1px solid #d6d8f0;
  border-top: 1px solid #d6d8f0;
  display: flex;
  flex-direction: column;
}

.sidebar > ul,
.sidebar > div:not(.sidebar-footer):not(.sidebar-section-title) {
  overflow-y: auto;
}

.sidebar ul {
  list-style: none;
  overflow-y: visible;
}

.sidebar-section-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #a0a8d0;
  padding: 14px 20px 5px;
}

.sidebar li {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 18px;
  margin: 2px 8px;
  border-radius: 8px;
  color: #4b5580;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.sidebar li:hover {
  background: rgba(67, 56, 202, 0.1);
  color: #3730a3;
}

.sidebar li.active {
  background: #4338ca;
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(67, 56, 202, 0.3);
}

.sidebar li.active .icon {
  filter: none;
}

.icon {
  font-size: 16px;
  flex-shrink: 0;
}

.sidebar-footer {
  margin-top: auto;
  padding: 12px 16px;
  border-top: 1px solid #d6d8f0;
  background: #e8eaf6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sidebar-email {
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.sidebar-logout {
  background: #4338ca;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.sidebar-logout:hover {
  background: #3730a3;
}

.icon {
  font-size: 16px;
  flex-shrink: 0;
}

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  border-top: 1px solid #d6d8f0;
}

.loading-bar {
  text-align: center;
  color: #6b7280;
  padding: 8px;
  background: #fffbeb;
  border-radius: 6px;
  margin-bottom: 16px;
}

.dashboard h3 {
  font-size: 20px;
  color: #1e1b4b;
  margin-bottom: 20px;
  font-weight: 700;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}
.stat-card {
  background: white;
  border-radius: 10px;
  padding: 18px;
  text-align: center;
  border-left: 4px solid var(--c, #8b5cf6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.stat-card p {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 6px;
}
.stat-card strong {
  font-size: 28px;
  color: var(--c, #8b5cf6);
  font-weight: 800;
}

.entity-list {
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-bar h3 {
  font-size: 18px;
  color: #1e1b4b;
  font-weight: 700;
}
.bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  outline: none;
  width: 220px;
}
.search-input:focus {
  border-color: #7c3aed;
}

.action-btn {
  background: #4338ca;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.action-btn:hover {
  background: #3730a3;
}

.table-wrapper {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}
th {
  background: #f8f7ff;
  color: #4338ca;
  padding: 12px 14px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}
td {
  padding: 11px 14px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
  font-size: 13px;
}
tr:hover td {
  background: #f9f8ff;
}
tr:last-child td {
  border-bottom: none;
}
.empty-row {
  text-align: center;
  color: #9ca3af;
  padding: 32px;
}

.actions {
  white-space: nowrap;
  display: flex;
  gap: 6px;
  align-items: center;
}
.edit-btn {
  padding: 5px 12px;
  background: #4338ca;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}
.edit-btn:hover {
  background: #3730a3;
}
.danger {
  padding: 5px 12px;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}
.danger:hover {
  background: #fecaca;
}

.status-chip {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
.chip-paid {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}
.chip-booked {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}
.chip-cancelled {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
.services-count {
  font-size: 11px;
  background: #ede9fe;
  color: #6d28d9;
  padding: 2px 8px;
  border-radius: 10px;
}
.no-services-chip {
  color: #9ca3af;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.edit-modal {
  background: white;
  border-radius: 14px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.clickable-row:hover {
  background-color: #f3f4f6;
}

.edit-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #f3f4f6;
}
.edit-modal-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: #1e1b4b;
}
.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
}
.close-btn:hover {
  color: #374151;
}

.edit-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
.req {
  color: #ef4444;
  margin-left: 2px;
}
.form-group input {
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 14px;
  outline: none;
}
.form-group input:focus {
  border-color: #7c3aed;
}

.edit-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
}
.btn-secondary {
  padding: 9px 20px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary {
  padding: 9px 22px;
  border: none;
  border-radius: 7px;
  background: #4338ca;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled {
  background: #a5b4fc;
  cursor: not-allowed;
}
</style>
