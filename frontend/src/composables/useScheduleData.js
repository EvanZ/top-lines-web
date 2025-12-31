import { ref } from 'vue'

const games = ref([])
const meta = ref(null)
const loading = ref(false)
const error = ref(null)

const dataBase = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '')

export function useScheduleData() {
  const loadSchedule = async (date, gender = 'men') => {
    if (!date) return
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${dataBase}/${gender}/schedule/${date}.json`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      meta.value = data.meta
      games.value = Array.isArray(data.games) ? data.games : []
    } catch (e) {
      console.error('Error loading schedule:', e)
      error.value = e.message
      games.value = []
    } finally {
      loading.value = false
    }
  }

  return { games, meta, loading, error, loadSchedule }
}
