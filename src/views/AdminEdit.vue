<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import useFlightStore from '@/stores/flight.js'
import useAirlineStore from '@/stores/airline.js'
import useAirportStore from '@/stores/airport.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const flightStore = useFlightStore()
const airlineStore = useAirlineStore()
const airportStore = useAirportStore()

const entity = computed(() => route.params.entity)
const id = computed(() => route.params.id)
const isNew = computed(() => id.value === 'new')

const form = ref({})
const loading = ref(false)

const fieldsConfig = {
  flight: [
    { key: 'fDepartureAirport', label: 'Аэропорт отправления', type: 'text' },
    { key: 'fArrivalAirport', label: 'Аэропорт прибытия', type: 'text' },
    { key: 'fDepartureTime', label: 'Дата и время вылета', type: 'datetime-local' },
    { key: 'fArrivalTime', label: 'Время прилёта', type: 'datetime-local' },
    { key: 'fAirline', label: 'Авиакомпания (название)', type: 'text' },
    { key: 'fPrice', label: 'Цена (₽)', type: 'number', step: '100' },
    { key: 'fSeatsCount', label: 'Количество мест', type: 'number' },
  ],
  airline: [
    { key: 'alName', label: 'Название авиакомпании', type: 'text' },
    { key: 'alEmail', label: 'Email', type: 'email' },
  ],
  airport: [
    { key: 'apCity', label: 'Город', type: 'text' },
    { key: 'apName', label: 'Название аэропорта', type: 'text' },
    { key: 'apCountry', label: 'Страна', type: 'text' },
    { key: 'apStreet', label: 'Улица', type: 'text' },
    { key: 'apBuilding', label: 'Номер дома', type: 'text' },
  ],
}

const fields = computed(() => fieldsConfig[entity.value] || [])

const loadEntity = async () => {
  if (isNew.value) {
    form.value = {}
    return
  }

  loading.value = true
  try {
    let data = null

    if (entity.value === 'flight') {
      data = await flightStore.getFlight(id.value)
      if (data) {
        // Приводим дату к формату datetime-local
        data.fDepartureTime = data.fDepartureTime.slice(0, 16)
        data.fArrivalTime = data.fArrivalTime.slice(0, 16)
      }
    } else if (entity.value === 'airline') {
      await airlineStore.getAirline(id.value)
      data = airlineStore.currentAirline
    } else if (entity.value === 'airport') {
      await airportStore.getAirport(id.value)
      data = airportStore.currentAirport
    }

    if (!data) {
      toast.error('Объект не найден')
      await router.push('/admin')
      return
    }

    form.value = { ...data }
  } catch (err) {
    toast.error('Ошибка загрузки')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (loading.value) return
  loading.value = true

  try {
    let success = false

    if (entity.value === 'flight') {
      const flightData = {
        ...form.value,
        fId: isNew.value ? 0 : form.value.fId,
        fPrice: Number(form.value.fPrice),
        fSeatsCount: Number(form.value.fSeatsCount),
      }

      if (isNew.value) {
        await flightStore.addFlight(flightData)
        success = true
      } else {
        await flightStore.editFlight(flightData)
        success = true
      }
    }

    else if (entity.value === 'airline') {
      const airlineData = {
        alId: isNew.value ? 0 : form.value.alId,
        alName: form.value.alName,
        alEmail: form.value.alEmail,
      }

      if (isNew.value) {
        await airlineStore.addAirline(airlineData)
        success = true
      } else {
        await airlineStore.editAirline(airlineData)
        success = true
      }
    }

    else if (entity.value === 'airport') {
      const airportData = {
        apId: isNew.value ? 0 : form.value.apId,
        apName: form.value.apName,
        apCountry: form.value.apCountry,
        apCity: form.value.apCity,
        apStreet: form.value.apStreet,
        apBuilding: form.value.apBuilding,
      }

      if (isNew.value) {
        await airportStore.addAirport(airportData)
        success = true
      } else {
        await airportStore.editAirport(airportData)
        success = true
      }
    }

    if (success) {
      toast.success(isNew.value ? 'Успешно создано!' : 'Успешно обновлено!')
      await router.push('/admin')
    }
  } catch (err) {
    toast.error(flightStore.flightError || airlineStore.airlineError || airportStore.airportError || 'Ошибка сохранения')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!['flight', 'airline', 'airport'].includes(entity.value)) {
    toast.error('Недопустимая сущность')
    router.push('/admin')
    return
  }
  loadEntity()
})

watch(
  () => route.params.entity,
  (newEntity) => {
    if (!['flight', 'airline', 'airport'].includes(newEntity)) {
      router.push('/admin')
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="edit-page">
    <div class="edit-container">
      <div class="edit-header">
        <h2>
          {{ isNew ? 'Добавление' : 'Редактирование' }}
          {{
            entity === 'flight' ? 'рейса' :
              entity === 'airline' ? 'авиакомпании' :
                entity === 'airport' ? 'аэропорта' : ''
          }}
        </h2>
        <button @click="router.push('/admin')" class="back-btn">Назад</button>
      </div>

      <form @submit.prevent="save" class="edit-form" v-if="fields.length">
        <div class="form-grid">
          <div v-for="field in fields" :key="field.key" class="form-group">
            <label :for="field.key">{{ field.label }}</label>
            <input
              :id="field.key"
              :type="field.type"
              :step="field.step || undefined"
              v-model="form[field.key]"
              required
              :disabled="loading"
            />
          </div>
        </div>

        <div class="form-actions">
          <button type="button" @click="router.push('/admin')" :disabled="loading">Отмена</button>
          <button type="submit" class="primary" :disabled="loading">
            {{ loading ? 'Сохранение...' : 'Сохранить' }}
          </button>
        </div>
      </form>

      <div v-else class="loading">
        {{ loading ? 'Загрузка...' : 'Неизвестная сущность' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 32px;
}

.edit-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.edit-header {
  padding: 24px 32px;
  background: var(--color-purple-blue);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.edit-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.edit-form {
  padding: 32px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.form-group {
  padding: 0 10px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #34495e;
  font-weight: 600;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-grey-200);
  border-radius: 6px;
  font-size: 16px;
  transition: border 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-purple-blue);
  box-shadow: 0 0 0 3px rgba(120, 108, 255, 0.15);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.form-actions button {
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.form-actions button:first-child {
  background: #e0e0e0;
  color: #34495e;
}

.form-actions button:first-child:hover {
  background: #d0d0d0;
}

.form-actions .primary {
  background: var(--color-purple-blue);
  color: white;
}

.form-actions .primary:hover {
  background: #635bff;
}

.form-actions .primary:disabled {
  background: #a0a0ff;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-grey-400);
  font-size: 18px;
}
</style>
