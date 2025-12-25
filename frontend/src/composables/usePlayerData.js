import { ref } from 'vue'

// Shared state
const players = ref([])
const meta = ref(null)
const loading = ref(false)
const error = ref(null)

const conferences = ref([])
const dataBase = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '')

export function usePlayerData() {
  const loadDailyReport = async (date, days = 3, gender = 'men') => {
    loading.value = true
    error.value = null
    try {
      // Load the file for the specific date range (e.g., 2025-12-20_3d.json)
      const response = await fetch(`${dataBase}/${gender}/daily/${date}_${days}d.json`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      meta.value = data.meta
      players.value = data.players.map(p => ({
        ...p,
        classLower: (p.experience_display_value || 'freshman').toLowerCase(),
        rsci_rank: p.recruit_rank,
        conference: p.team_conf
      }))
    } catch (e) {
      console.error('Error loading daily report:', e)
      error.value = e.message
      players.value = []
    } finally {
      loading.value = false
    }
  }

  const loadSeasonRankings = async (date, gender = 'men') => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${dataBase}/${gender}/rankings/${date}.json`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      meta.value = data.meta
      players.value = data.players.map(p => ({
        ...p,
        classLower: (p.experience_display_value || 'freshman').toLowerCase(),
        rsci_rank: p.recruit_rank,
        conference: p.team_conf
      }))
    } catch (e) {
      console.error('Error loading season rankings:', e)
      error.value = e.message
      players.value = []
    } finally {
      loading.value = false
    }
  }

  return { players, meta, loading, error, loadDailyReport, loadSeasonRankings }
}

export function useConferences() {
  const loadConferences = async (gender = 'men') => {
    try {
      const response = await fetch(`${dataBase}/${gender}/conferences.json`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      // Extract the conferences array from the wrapper object
      conferences.value = data.conferences || data
    } catch (e) {
      console.error('Error loading conferences:', e)
      conferences.value = []
    }
  }

  return { conferences, loadConferences }
}
