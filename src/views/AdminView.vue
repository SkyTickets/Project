<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import useUserStore from '@/stores/user.js'
import useFlightStore from '@/stores/flight.js'
import useAirlineStore from '@/stores/airline.js'
import useAirportStore from '@/stores/airport.js'
import useTicketStore from '@/stores/ticket.js'

const toast = useToast()
const router = useRouter()

const userStore = useUserStore()
const flightStore = useFlightStore()
const airlineStore = useAirlineStore()
const airportStore = useAirportStore()
const ticketStore = useTicketStore()

const section = ref('dashboard')

const isManager = computed(() => {
  const role = userStore.currentUser?.uRole
  return role === 'Менеджер'
})

onMounted(async () => {
  if (!userStore.currentUser || !isManager.value) {
    toast.error('Доступ запрещён')
    await router.push('/')
    return
  }

  await Promise.all([
    flightStore.getCurrentFlights(),
    userStore.getUsers(),
    airlineStore.getAirlines(),
    airportStore.getAirports(),
    ticketStore.getTickets(),
  ])
})

onBeforeUnmount( () => {
  flightStore.clearFlights()
  userStore.clearUsers()
  airlineStore.clearAirlines()
  airportStore.clearAirports()
  ticketStore.clearTickets()
})

const goToEdit = (entity, id = 'new') => {
  router.push({ name: 'AdminEdit', params: { entity, id } })
}

const confirmDelete = async (action, id, name = 'элемент') => {
  if (!confirm(`Удалить ${name}? Это действие нельзя отменить.`)) return
  try {
    await action(id)
    toast.success('Удалено успешно')
  } catch (err) {
    toast.error('Ошибка при удалении')
  }
}

const logout = () => {
  userStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="admin-wrapper">
    <header class="admin-header">
      <h2>Админ-панель</h2>
      <div class="user-info">
        <span>{{ userStore.currentUser.uEmail }}</span>
        <button @click="logout" class="logout-btn">Выйти</button>
      </div>
    </header>

    <div class="admin-body">
      <aside class="sidebar">
        <ul>
          <li @click="section = 'dashboard'" :class="{ active: section === 'dashboard' }">Обзор</li>
          <li @click="section = 'flights'" :class="{ active: section === 'flights' }">Рейсы</li>
          <li @click="section = 'users'" :class="{ active: section === 'users' }">Пользователи</li>
          <li @click="section = 'airlines'" :class="{ active: section === 'airlines' }">
            Авиакомпании
          </li>
          <li @click="section = 'airports'" :class="{ active: section === 'airports' }">
            Аэропорты
          </li>
          <li @click="section = 'tickets'" :class="{ active: section === 'tickets' }">Билеты</li>
        </ul>
      </aside>

      <main class="content">
        <section v-if="section === 'dashboard'" class="dashboard">
          <h3>Добро пожаловать, {{ userStore.currentUser.uName }}!</h3>
          <div class="stats">
            <div class="stat-card">
              <p>Рейсов</p>
              <strong>{{ flightStore.flightsList.length }}</strong>
            </div>
            <div class="stat-card">
              <p>Пользователей</p>
              <strong>{{ userStore.usersList.length }}</strong>
            </div>
            <div class="stat-card">
              <p>Авиакомпаний</p>
              <strong>{{ airlineStore.airlinesList.length }}</strong>
            </div>
            <div class="stat-card">
              <p>Аэропортов</p>
              <strong>{{ airportStore.airportsList.length }}</strong>
            </div>
            <div class="stat-card">
              <p>Билетов продано</p>
              <strong>{{ ticketStore.ticketsList.length }}</strong>
            </div>
          </div>
        </section>

        <section v-if="section === 'flights'" class="entity-list">
          <div class="header-bar">
            <h3>Рейсы</h3>
            <button class="action-btn" @click="goToEdit('flight', 'new')">+ Добавить рейс</button>
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
                  <th>Цена</th>
                  <th>Мест</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in flightStore.flightsList" :key="f.fId">
                  <td>{{ f.fId }}</td>
                  <td>{{ f.fDepartureAirport }} → {{ f.fArrivalAirport }}</td>
                  <td>
                    {{
                      new Date(f.fDepartureTime).toLocaleString('ru-RU', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    }}
                  </td>
                  <td>
                    {{
                      new Date(f.fArrivalTime).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }}
                  </td>
                  <td>{{ f.fAirline }}</td>
                  <td>{{ f.fPrice }} ₽</td>
                  <td>{{ f.fSeatsCount }}</td>
                  <td class="actions">
                    <button @click="goToEdit('flight', f.fId)" class="edit-btn">Изменить</button>
<!--                    <button
                      class="danger"
                      @click="
                        confirmDelete(
                          flightStore.deleteFlight,
                          f.fId,
                          `рейс ${f.fDepartureAirport} → ${f.fArrivalAirport}`,
                        )
                      "
                    >
                      Удалить
                    </button>-->
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="section === 'airlines'" class="entity-list">
          <div class="header-bar">
            <h3>Авиакомпании</h3>
            <button class="action-btn" @click="goToEdit('airline', 'new')">+ Добавить</button>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Email</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in airlineStore.airlinesList" :key="a.alId">
                  <td>{{ a.alId }}</td>
                  <td>{{ a.alName }}</td>
                  <td>{{ a.alEmail }}</td>
                  <td class="actions">
                    <button @click="goToEdit('airline', a.alId)" class="edit-btn">Изменить</button>
                    <button
                      class="danger"
                      @click="confirmDelete(airlineStore.deleteAirline, a.alId, a.alName)"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="section === 'airports'" class="entity-list">
          <div class="header-bar">
            <h3>Аэропорты</h3>
            <button class="action-btn" @click="goToEdit('airport', 'new')">+ Добавить</button>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Город</th>
                  <th>Название</th>
                  <th>Страна</th>
                  <th>Адрес</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in airportStore.airportsList" :key="a.apId">
                  <td>{{ a.apId }}</td>
                  <td>{{ a.apCity }}</td>
                  <td>{{ a.apName }}</td>
                  <td>{{ a.apCountry }}</td>
                  <td>{{ a.apStreet }} {{ a.apBuilding }}</td>
                  <td class="actions">
                    <button @click="goToEdit('airport', a.apId)" class="edit-btn">Изменить</button>
                    <button
                      class="danger"
                      @click="confirmDelete(airportStore.deleteAirport, a.apId, a.apName)"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="section === 'users'" class="entity-list">
          <h3>Пользователи</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ФИО</th>
                  <th>Email</th>
                  <th>Телефон</th>
                  <th>Роль</th>
                  <th>Паспорт</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in userStore.usersList" :key="u.uId">
                  <td>{{ u.uId }}</td>
                  <td>{{ u.uSurname }} {{ u.uName }} {{ u.uPatronymic || '' }}</td>
                  <td>{{ u.uEmail }}</td>
                  <td>{{ u.uPhone }}</td>
                  <td>{{ u.uRole || 'user' }}</td>
                  <td>{{ u.uPassportSerial }} {{ u.uPassportNumber }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="section === 'tickets'" class="entity-list">
          <h3>Проданные билеты</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Пассажир</th>
                  <th>Рейс ID</th>
                  <th>Дата покупки</th>
                  <th>Класс</th>
                  <th>Цена</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in ticketStore.ticketsList" :key="t.tId">
                  <td>{{ t.tId }}</td>
                  <td>{{ t.tUser }}</td>
                  <td>{{ t.tFlight }}</td>
                  <td>{{ new Date(t.tBoughtDate).toLocaleDateString('ru-RU') }}</td>
                  <td>{{ t.tClass }}</td>
                  <td>{{ t.tTotalPrice }} ₽</td>
                  <td>{{ t.tStatus || 'Оплачен' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.actions {
  white-space: nowrap;
}

.actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  margin-right: 6px;
}

.actions .edit-btn {
  background: #635bff;
  color: white;
}

.actions .edit-btn:hover {
  background: #524bff;
}

.actions .danger {
  background: #ff6b6b;
  color: white;
}

.actions .danger:hover {
  background: #ff5252;
}

.admin-wrapper {
  min-height: 100vh;
  background: white;
  font-family: var(--font-family-nunito-sans), sans-serif;
}
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: white;
  border-bottom: 1px solid #cbd4e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.admin-header h2 {
  color: var(--color-purple-blue);
  font-size: 24px;
  font-weight: 600;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #7c8db0;
}
.logout-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
}
.logout-btn:hover {
  background: #ff5252;
}
.admin-body {
  display: flex;
}
.sidebar {
  width: 260px;
  background: #f8f9fc;
  border-right: 1px solid #cbd4e6;
  padding: 24px 0;
}
.sidebar ul {
  list-style: none;
}
.sidebar li {
  padding: 14px 32px;
  color: #7c8db0;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}
.sidebar li:hover {
  background: #f1f5f9;
  color: var(--color-purple-blue);
}
.sidebar li.active {
  background: var(--color-purple-extralight);
  color: var(--color-purple-blue);
  font-weight: 600;
  border-left: 4px solid var(--color-purple-blue);
}
.content {
  flex: 1;
  padding: 32px;
}
.dashboard h3 {
  color: var(--color-purple-blue);
  margin-bottom: 24px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}
.stat-card {
  background: #f8f7ff;
  border: 1px solid #e0dfff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}
.stat-card p {
  color: #7c8db0;
  margin-bottom: 8px;
}
.stat-card strong {
  font-size: 28px;
  color: var(--color-purple-blue);
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.action-btn {
  background: var(--color-purple-blue);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
}
.action-btn:hover {
  background: #635bff;
}
.table-wrapper {
  background: white;
  border: 1px solid #cbd4e6;
  border-radius: 8px;
  overflow: hidden;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  background: #f8f7ff;
  color: var(--color-purple-blue);
  padding: 16px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #cbd4e6;
}
td {
  padding: 14px 16px;
  color: #7c8db0;
  border-bottom: 1px solid #cbd4e6;
}
tr:hover {
  background: #f8f7ff;
}
</style>
