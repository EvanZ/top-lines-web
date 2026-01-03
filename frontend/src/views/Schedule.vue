<script setup>
import { computed, inject, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import GameCard from '../components/GameCard.vue'
import SettingsDrawer from '../components/SettingsDrawer.vue'
import { useScheduleData } from '../composables/useScheduleData.js'
import { useConferences } from '../composables/usePlayerData.js'
import { loadSharedFilters, saveSharedFilters } from '../composables/useSharedFilters.js'

const gender = inject('gender')
const dataBase = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '')
const { games, meta, loading, error, loadSchedule } = useScheduleData()
const { conferences, loadConferences } = useConferences()

const savedFilters = loadSharedFilters()
const scheduleDate = ref('')
const scheduleDates = ref([])
const seasonPlayers = ref([])
const classes = ['freshman', 'sophomore', 'junior', 'senior']
const sortAsc = ref(typeof savedFilters.sortAsc === 'boolean' ? savedFilters.sortAsc : true)
const scheduleStatuses = ref(
  Array.isArray(savedFilters.scheduleStatuses) && savedFilters.scheduleStatuses.length
    ? savedFilters.scheduleStatuses
    : ['upcoming', 'live', 'finished']
)
const nowTs = ref(Date.now())
let nowTimer = null
const selectedClasses = ref(
  Array.isArray(savedFilters.selectedClasses) && savedFilters.selectedClasses.length
    ? savedFilters.selectedClasses
    : ['freshman', 'sophomore', 'junior', 'senior']
)
const rsciOnly = ref(typeof savedFilters.rsciOnly === 'boolean' ? savedFilters.rsciOnly : false)
const selectedConferences = ref(
  Array.isArray(savedFilters.selectedConferences) ? savedFilters.selectedConferences : []
)
const powerOnly = ref(false)
const onlyWithPlayers = ref(typeof savedFilters.onlyWithPlayers === 'boolean' ? savedFilters.onlyWithPlayers : true)
const powerOrder = ['ACC', 'Big 12', 'Big Ten', 'SEC', 'Pac-12', 'Big East']

const filteredGames = computed(() => {
  const isPower = (conf) => powerOrder.includes(conf)
  const confSet = new Set(selectedConferences.value || [])
  const statusSet = new Set(scheduleStatuses.value || ['upcoming', 'live', 'finished'])

  const statusFor = (game) => {
    const raw = game?.start_time
    let status = (game?.status || '').toLowerCase()
    const start = raw ? new Date(raw).getTime() : NaN
    if (status.includes('final') || status.includes('post')) return 'finished'
    if (Number.isFinite(start)) {
      const diff = nowTs.value - start
      if (diff < 0) return 'upcoming'
      if (diff <= 3 * 60 * 60 * 1000) return 'live'
      return 'finished'
    }
    return 'upcoming'
  }

  return [...games.value]
    .filter((game) => {
      const homeConf = game?.home?.conference
      const awayConf = game?.away?.conference
      if (powerOnly.value && !(isPower(homeConf) || isPower(awayConf))) return false
      if (confSet.size) {
        const teamMatch = confSet.has(homeConf) || confSet.has(awayConf)
        const playerMatch = (game?.featured_players || []).some((p) => confSet.has(p.team_conf))
        if (!teamMatch && !playerMatch) return false
      }
      // If onlyWithPlayers is on, skip games with zero filtered players
      if (onlyWithPlayers.value) {
        const filteredPlayers = getFilteredPlayers(game)
        if (!filteredPlayers.length) return false
      }
      const gStatus = statusFor(game)
      if (statusSet.size && !statusSet.has(gStatus)) return false
      return true
    })
    .sort((a, b) => {
      const t1 = a?.start_time ? new Date(a.start_time).getTime() : Number.POSITIVE_INFINITY
      const t2 = b?.start_time ? new Date(b.start_time).getTime() : Number.POSITIVE_INFINITY
      return sortAsc.value ? t1 - t2 : t2 - t1
    })
})

const decoratedGames = computed(() => {
  const ranks = rankMap.value
  return filteredGames.value.map((game) => {
    const players = (game.featured_players || []).map((p) => {
      const pid = Number(p.player_id)
      const r = ranks.get(pid)
      return r ? { ...p, display_rank: r, class_rank: r } : p
    })
    return { ...game, featured_players: players }
  })
})

const toLocalDateString = (dt) => {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const parseLocalDate = (str) => {
  if (!str || typeof str !== 'string') return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

const dayLabel = computed(() => {
  const d = parseLocalDate(scheduleDate.value)
  if (!d) return ''
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
})

const buildDateOptions = (dates) => {
  const today = toLocalDateString(new Date())
  const sorted = [...(dates || [])]
    .map((d) => ({ d, ts: parseLocalDate(d)?.getTime() ?? 0 }))
    .filter((entry) => entry.ts > 0)
    .sort((a, b) => a.ts - b.ts)
    .map((entry) => entry.d)

  const future = sorted.filter((d) => d >= today)
  const past = sorted.filter((d) => d < today).reverse() // newest past first

  const options = []
  if (future.includes(today)) {
    options.push(today)
  }
  // Add near-future after today
  future.forEach((d) => {
    if (d !== today && options.length < 5) options.push(d)
  })
  // Add up to two most recent past days
  past.slice(0, 2).forEach((d) => {
    if (!options.includes(d) && options.length < 7) options.push(d)
  })

  const unique = Array.from(new Set(options.length ? options : sorted.slice(0, 5)))
  return unique.sort((a, b) => {
    const ta = parseLocalDate(a)?.getTime() ?? 0
    const tb = parseLocalDate(b)?.getTime() ?? 0
    return ta - tb
  })
}

const dateOptions = computed(() => buildDateOptions(scheduleDates.value))

const dateLabel = (dateStr) => {
  const today = toLocalDateString(new Date())
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = toLocalDateString(tomorrow)
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'
  const d = parseLocalDate(dateStr)
  return d ? d.toLocaleDateString('en-US', { weekday: 'short' }) : dateStr
}

const dateSubLabel = (dateStr) => {
  const d = parseLocalDate(dateStr)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : dateStr
}

const rankingsLabel = computed(() => {
  if (!meta.value?.rankings_date) return 'latest season rankings'
  const d = new Date(`${meta.value.rankings_date}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

const combinedRankScore = (player) => {
  const gp = Number(player.gp)
  const ez = Number(player.ez)
  if (!Number.isFinite(gp) || gp <= 0) return 0
  return Number.isFinite(ez) ? ez / gp : 0
}

const getFilteredPlayers = (game) => {
  const classSet = new Set((selectedClasses.value || []).map((c) => c.toLowerCase()))
  const confSet = new Set(selectedConferences.value || [])
  const players = game?.featured_players || []
  return players.filter((p) => {
    const cls = (p.class || '').toLowerCase()
    const conf = p.team_conf
    if (classSet.size && !classSet.has(cls)) return false
    if (rsciOnly.value && !p.recruit_rank) return false
    if (confSet.size && !confSet.has(conf)) return false
    return true
  })
}

const refreshScheduleDate = async () => {
  try {
    const response = await fetch(`${dataBase}/manifest.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`)
    const manifest = await response.json()
    const key = gender.value || 'men'
    const scheduleList = manifest?.[key]?.schedule || []
    scheduleDates.value = scheduleList
    const options = buildDateOptions(scheduleList)
    const today = toLocalDateString(new Date())
    const preferred = scheduleDate.value && options.includes(scheduleDate.value)
      ? scheduleDate.value
      : options.find((d) => d === today) || options[0]
    scheduleDate.value = preferred || scheduleDate.value || today
  } catch (e) {
    console.error('Error loading manifest for schedule:', e)
    if (!scheduleDate.value) {
      scheduleDate.value = toLocalDateString(new Date())
    }
  }
}

const loadData = async () => {
  if (!scheduleDate.value) return
  await loadSchedule(scheduleDate.value, gender.value)
  await loadConferences(gender.value)
  await loadSeasonRanks()
}

const setConference = (conf) => {
  // unused after removing chips; retained for compatibility
  selectedConferences.value = conf === selectedConferences.value?.[0] && selectedConferences.value.length === 1 ? [] : [conf]
}

const loadSeasonRanks = async () => {
  try {
    let rankingsDate = null
    // Always prefer the latest rankings from the manifest
    const manifestResp = await fetch(`${dataBase}/manifest.json`, { cache: 'no-store' })
    if (manifestResp.ok) {
      const manifest = await manifestResp.json()
      rankingsDate = manifest?.[gender.value || 'men']?.rankings?.[0] || manifest?.latest_date || rankingsDate
    }
    // Fallback to schedule meta if manifest missing
    if (!rankingsDate) {
      rankingsDate = meta.value?.rankings_date
    }
    if (!rankingsDate) return
    const resp = await fetch(`${dataBase}/${gender.value}/rankings/${rankingsDate}.json`, { cache: 'no-store' })
    if (!resp.ok) throw new Error(`Rankings HTTP ${resp.status}`)
    const data = await resp.json()
    seasonPlayers.value = (data.players || []).map((p) => ({
      ...p,
      player_id: Number(p.player_id),
      classLower: (p.experience_display_value || '').toLowerCase(),
      conference: p.team_conf,
    }))
  } catch (e) {
    console.error('Error loading season ranks for schedule:', e)
    seasonPlayers.value = []
  }
}

const filteredSeasonPlayers = computed(() => {
  const classSet = new Set((selectedClasses.value || []).map((c) => c.toLowerCase()))
  const confSet = new Set(selectedConferences.value || [])
  const base = seasonPlayers.value.filter((p) => {
    if (classSet.size && !classSet.has(p.classLower)) return false
    if (rsciOnly.value && !p.recruit_rank) return false
    if (confSet.size && !confSet.has(p.conference)) return false
    return true
  })
  if (selectedClasses.value.length > 1) {
    return [...base].sort((a, b) => combinedRankScore(b) - combinedRankScore(a))
  }
  return [...base].sort((a, b) => (a.class_rank ?? 1e6) - (b.class_rank ?? 1e6))
})

const rankMap = computed(() => {
  const map = new Map()
  filteredSeasonPlayers.value.forEach((p, idx) => {
    const pid = Number(p.player_id)
    if (!Number.isFinite(pid)) return
    map.set(pid, idx + 1)
  })
  return map
})

const seasonPlayerMap = computed(() => {
  const map = new Map()
  seasonPlayers.value.forEach((p) => {
    const pid = Number(p.player_id)
    if (Number.isFinite(pid)) {
      map.set(pid, p)
    }
  })
  return map
})

onMounted(async () => {
  await refreshScheduleDate()
  await loadData()
})

watch(gender, async () => {
  powerOnly.value = false
  await refreshScheduleDate()
  await loadData()
})

watch(scheduleDate, async (next, prev) => {
  if (next && next !== prev) {
    await loadSchedule(next, gender.value)
    await loadSeasonRanks()
  }
})

watch(
  [selectedClasses, rsciOnly, selectedConferences, onlyWithPlayers, sortAsc, scheduleStatuses],
  () => {
    saveSharedFilters({
      selectedClasses: selectedClasses.value,
      rsciOnly: rsciOnly.value,
      selectedPosition: '',
      selectedConferences: selectedConferences.value,
      onlyWithPlayers: onlyWithPlayers.value,
      sortAsc: sortAsc.value,
      scheduleStatuses: scheduleStatuses.value,
    })
  },
  { deep: true }
)

onMounted(() => {
  nowTimer = setInterval(() => {
    nowTs.value = Date.now()
  }, 60000)
})

onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer)
})
</script>

<template>
  <div class="schedule-view">
    <div class="page-header-row">
      <div class="page-header">
        <h1 class="page-title">Schedule</h1>
        <p class="page-subtitle">
          {{ dayLabel || 'Today' }} — all games for the selected date. Odds from ESPN; prospects from {{ rankingsLabel }}.
        </p>
      </div>
    </div>

    <div v-if="dateOptions.length" class="date-pills">
      <button
        v-for="d in dateOptions"
        :key="d"
        type="button"
        class="date-pill"
        :class="{ active: scheduleDate === d }"
        @click="scheduleDate = d"
      >
        <span class="date-pill-label">{{ dateLabel(d) }}</span>
        <span class="date-pill-sub">{{ dateSubLabel(d) }}</span>
      </button>
    </div>

    <div class="sort-toggle">
      <span class="sort-label">Sort</span>
      <div class="sort-buttons">
        <button type="button" :class="{ active: sortAsc }" @click="sortAsc = true">Early</button>
        <button type="button" :class="{ active: !sortAsc }" @click="sortAsc = false">Late</button>
      </div>
    </div>

    <div class="status-toggle">
      <span class="sort-label">Status</span>
      <div class="status-buttons">
        <button
          v-for="opt in ['upcoming', 'live', 'finished']"
          :key="opt"
          type="button"
          :class="{ active: scheduleStatuses.includes(opt) }"
          @click="scheduleStatuses = scheduleStatuses.includes(opt) ? scheduleStatuses.filter(s => s !== opt) : [...scheduleStatuses, opt]"
        >
          {{ opt === 'upcoming' ? 'Not Started' : opt === 'live' ? 'In Progress' : 'Ended' }}
        </button>
      </div>
    </div>

    <div class="filter-toggle">
      <span class="toggle-label">Prospects only</span>
      <label class="toggle-switch">
        <input type="checkbox" v-model="onlyWithPlayers" />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      Loading today's slate...
    </div>

    <div v-else-if="error" class="error">
      <p>Unable to load schedule: {{ error }}</p>
      <p class="error-hint">Make sure the schedule export has run for {{ scheduleDate }}.</p>
    </div>

    <div v-else class="cards-grid">
      <GameCard
        v-for="game in decoratedGames"
        :key="game.game_id"
        :game="game"
        :gender="gender"
        :selectedClasses="selectedClasses"
        :rsciOnly="rsciOnly"
        :selectedConferences="selectedConferences"
        :rankMap="rankMap"
        :season-players-map="seasonPlayerMap"
      />
      <p v-if="decoratedGames.length === 0" class="no-data">
        No games match these filters. Try adjusting conferences or toggles.
      </p>
    </div>

    <SettingsDrawer
      :classes="classes"
      v-model:selectedClasses="selectedClasses"
      v-model:gender="gender"
      v-model:rsciOnly="rsciOnly"
      v-model:selectedConferences="selectedConferences"
      :conferences="conferences"
      :showDateRange="false"
      :showCompare="false"
      :showPosition="false"
      :showClass="true"
      :showRsci="true"
      :subtitle="'Schedule filters'"
    />
  </div>
</template>

<style scoped>
.schedule-view {
  padding: 1rem;
}

.page-header-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.page-header {
  margin: 0;
}

.date-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.25rem 0 0.75rem 0;
}

.date-pill {
  border: 1px solid var(--border-glow);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  border-radius: 12px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 110px;
  transition: transform 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.date-pill:hover {
  transform: translateY(-2px);
}

.date-pill.active {
  border-color: rgba(0, 212, 255, 0.6);
  color: var(--text-primary);
  background: rgba(0, 212, 255, 0.12);
}

.date-pill-label {
  font-weight: 800;
  font-size: 0.95rem;
}

.date-pill-sub {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.sort-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.35rem 0 1.6rem 0;
  color: var(--text-secondary);
  margin-right: 1.2rem;
}

.sort-buttons {
  display: inline-flex;
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  overflow: hidden;
}

.sort-buttons button {
  background: transparent;
  border: none;
  padding: 0.4rem 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 700;
}

.sort-buttons button.active {
  color: var(--text-primary);
  background: rgba(0, 212, 255, 0.12);
}

.sort-buttons button + button {
  border-left: 1px solid var(--border-glow);
}

.status-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
}

.status-buttons {
  display: inline-flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.status-buttons button {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-glow);
  color: var(--text-secondary);
  padding: 0.35rem 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.status-buttons button.active {
  background: rgba(0, 212, 255, 0.14);
  color: var(--text-primary);
  border-color: rgba(0, 212, 255, 0.5);
}

.page-title {
  font-family: 'Sora', sans-serif;
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-gold));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.35rem 0;
}

.page-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.pill-group {
  display: inline-flex;
  gap: 0.4rem;
}

.pill-group.right {
  justify-content: flex-end;
}

.pill-button {
  border: 1px solid var(--border-glow);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.pill-button.active {
  color: var(--text-primary);
  background: rgba(0, 212, 255, 0.14);
  border-color: rgba(0, 212, 255, 0.4);
}

.filter-toggle {
  color: var(--text-secondary);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: .5rem 0 1rem 0;
  margin-left: 1.0rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.15);
  transition: 0.2s;
  border-radius: 22px;
  border: 1px solid var(--border-glow);
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 1px;
  background-color: var(--text-primary);
  transition: 0.2s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background: rgba(0, 212, 255, 0.25);
  border-color: rgba(0, 212, 255, 0.6);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(18px);
  background: var(--accent-cyan);
}

.toggle-label {
  color: var(--text-muted);
  font-weight: 400;
}

.chip {
  border: 1px solid var(--border-glow);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.chip.power {
  border-color: rgba(255, 215, 0, 0.45);
  color: var(--accent-gold);
}

.chip.active {
  color: var(--text-primary);
  border-color: rgba(0, 212, 255, 0.5);
  background: rgba(0, 212, 255, 0.12);
}

.chip:hover {
  transform: translateY(-1px);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

.loading {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-glow);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  color: var(--accent-red);
  padding: 1rem;
  border: 1px solid var(--accent-red);
  border-radius: 10px;
  background: rgba(255, 0, 0, 0.08);
}

.error-hint {
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}

.no-data {
  grid-column: 1 / -1;
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 900px) {
  .page-header-row {
    grid-template-columns: 1fr;
  }
  .pill-group.right {
    justify-content: flex-start;
  }
}
</style>
