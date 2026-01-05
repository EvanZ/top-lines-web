import { ref } from 'vue'

const games = ref([])
const toplinesByGame = ref(new Map())
const meta = ref(null)
const loading = ref(false)
const error = ref(null)

const dataBase = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '')

export function useScheduleData() {
  const loadSchedule = async (date, gender = 'men') => {
    if (!date) return
    loading.value = true
    error.value = null
    toplinesByGame.value = new Map()
    try {
      const response = await fetch(`${dataBase}/${gender}/schedule/${date}.json`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      meta.value = data.meta
      games.value = Array.isArray(data.games) ? data.games : []

      // Load toplines for this date if available
      try {
        const tlResp = await fetch(`${dataBase}/${gender}/toplines/${date}.json`, { cache: 'no-store' })
        if (tlResp.ok) {
          const tl = await tlResp.json()
          const byGame = new Map()
          (tl.players || []).forEach((p) => {
            const gid = Number(p.game_id)
            if (!gid) return
            const list = byGame.get(gid) || []
            list.push(p)
            byGame.set(gid, list)
          })
          toplinesByGame.value = byGame
        }
      } catch (err) {
        console.warn('Toplines fetch failed for schedule', date, err)
      }
    } catch (e) {
      console.error('Error loading schedule:', e)
      error.value = e.message
      games.value = []
    } finally {
      loading.value = false
    }
  }

  return { games, meta, loading, error, loadSchedule, toplinesByGame }
}
