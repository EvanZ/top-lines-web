<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import DailyPlayerCard from '../components/DailyPlayerCard.vue'
import SettingsDrawer from '../components/SettingsDrawer.vue'
import CompareToggle from '../components/CompareToggle.vue'
import { usePlayerData, useConferences } from '../composables/usePlayerData.js'
import { loadSharedFilters, saveSharedFilters } from '../composables/useSharedFilters.js'

const { players, meta, loading, error, loadDailyReport } = usePlayerData()
const { conferences, loadConferences } = useConferences()
const dataBase = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '')

// Inject gender from App.vue
const gender = inject('gender')

const selectedClasses = ref(['freshman'])
const dateRange = ref(3)
const rsciOnly = ref(false)
const compareEnabled = ref(false)
const selectedCompare = ref([])
const selectedConferences = ref([])
const selectedPosition = ref('')
const availableDate = ref('2025-12-23') // Latest available date
const availableRankingsDate = ref('2025-12-23')
const seasonPlayers = ref([])

const classes = ['freshman', 'sophomore', 'junior', 'senior']
const savedFilters = loadSharedFilters()
if (savedFilters.selectedClasses?.length) {
  const filtered = savedFilters.selectedClasses.filter(cls => classes.includes(cls))
  selectedClasses.value = filtered.length ? filtered : ['freshman']
}
if (typeof savedFilters.rsciOnly === 'boolean') {
  rsciOnly.value = savedFilters.rsciOnly
}
if (typeof savedFilters.selectedPosition === 'string') {
  selectedPosition.value = savedFilters.selectedPosition
}
if (Array.isArray(savedFilters.selectedConferences)) {
  selectedConferences.value = savedFilters.selectedConferences
}

const selectedClassLabel = computed(() => {
  if (selectedClasses.value.length === 1) return selectedClasses.value[0]
  return 'selected classes'
})

const combinedRankScore = (player) => {
  const ez = Number(player?.ez_struct?.ez ?? player?.ez)
  return Number.isFinite(ez) ? ez : 0
}

const seasonRankScore = (player) => {
  const gp = Number(player?.gp)
  const ez = Number(player?.ez)
  if (!Number.isFinite(gp) || gp <= 0) return 0
  return Number.isFinite(ez) ? ez / gp : 0
}

const loadSeasonRankings = async (date, gender = 'men') => {
  if (!date) {
    seasonPlayers.value = []
    return
  }
  try {
    const response = await fetch(`${dataBase}/${gender}/rankings/${date}.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    seasonPlayers.value = data.players.map(p => ({
      ...p,
      classLower: (p.experience_display_value || 'freshman').toLowerCase(),
      rsci_rank: p.recruit_rank,
      conference: p.team_conf
    }))
  } catch (e) {
    console.error('Error loading season rankings for daily report:', e)
    seasonPlayers.value = []
  }
}

const baseFilteredPlayers = computed(() => {
  const selected = new Set(selectedClasses.value)
  const filtered = players.value.filter(player => {
    // Filter by class
    if (selected.size && !selected.has(player.classLower)) return false
    
    // Filter by RSCI
    if (rsciOnly.value && !player.rsci_rank) return false
    
    // Filter by conference
    if (selectedConferences.value.length > 0 && 
        !selectedConferences.value.includes(player.conference)) return false
    
    // Filter by position
    if (selectedPosition.value && player.position_display_name !== selectedPosition.value) return false
    
    return true
  })
  if (selectedClasses.value.length > 1) {
    return filtered.sort((a, b) => combinedRankScore(b) - combinedRankScore(a))
  }
  return filtered
})

const filteredSeasonPlayers = computed(() => {
  const selected = new Set(selectedClasses.value)
  const filtered = seasonPlayers.value.filter(player => {
    if (selected.size && !selected.has(player.classLower)) return false
    if (rsciOnly.value && !player.rsci_rank) return false
    if (selectedConferences.value.length > 0 && 
        !selectedConferences.value.includes(player.conference)) return false
    if (selectedPosition.value && player.position_display_name !== selectedPosition.value) return false
    return true
  })
  if (selectedClasses.value.length > 1) {
    return filtered.sort((a, b) => seasonRankScore(b) - seasonRankScore(a))
  }
  return filtered.sort((a, b) => (a.class_rank || 0) - (b.class_rank || 0))
})

const seasonRankMap = computed(() => {
  const map = new Map()
  filteredSeasonPlayers.value.forEach((player, idx) => {
    map.set(player.player_id, idx + 1)
  })
  return map
})

const filteredPlayers = computed(() => {
  const base = baseFilteredPlayers.value
  if (!compareEnabled.value || selectedCompare.value.length === 0) {
    return base
  }
  const selected = new Set(selectedCompare.value)
  return base.filter(player => selected.has(playerKey(player)))
})

const rankedPlayers = computed(() => (
  filteredPlayers.value.map((player, idx) => ({
    ...player,
    display_rank: idx + 1,
    season_rank: seasonRankMap.value.get(player.player_id) ?? null
  }))
))

// Compute subtitle based on meta
const dateRangeText = computed(() => {
  if (!meta.value) return ''
  return `${formatDateDisplay(meta.value.start_date)} → ${formatDateDisplay(meta.value.end_date)}`
})

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function playerKey(player) {
  return `${player.player_id}-${player.game_id}`
}

function isSelected(player) {
  return selectedCompare.value.includes(playerKey(player))
}

function toggleCompare(player, event) {
  if (event.target.closest('a')) return
  event.preventDefault()
  event.stopPropagation()
  const key = playerKey(player)
  if (selectedCompare.value.includes(key)) {
    selectedCompare.value = selectedCompare.value.filter(item => item !== key)
  } else {
    selectedCompare.value = [...selectedCompare.value, key]
  }
}

// Reload data when dateRange or gender changes
const reloadData = async () => {
  const seasonDate = availableRankingsDate.value || availableDate.value
  await Promise.all([
    loadDailyReport(availableDate.value, dateRange.value, gender.value),
    loadSeasonRankings(seasonDate, gender.value),
    loadConferences(gender.value)
  ])
}

const refreshAvailableDate = async () => {
  try {
    const response = await fetch(`${dataBase}/manifest.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`)
    const manifest = await response.json()
    const key = gender.value || 'men'
    const dailyList = manifest?.[key]?.daily || []
    const rankingsList = manifest?.[key]?.rankings || []
    availableDate.value = dailyList[0] || manifest?.latest_date || availableDate.value
    availableRankingsDate.value = rankingsList[0] || manifest?.latest_date || availableRankingsDate.value
  } catch (e) {
    console.error('Error loading manifest for daily reports:', e)
  }
}

watch(dateRange, reloadData)
watch(gender, async () => {
  await refreshAvailableDate()
  await reloadData()
})
watch(selectedClasses, () => {
  compareEnabled.value = false
  selectedCompare.value = []
}, { deep: true })
watch(baseFilteredPlayers, (list) => {
  const allowed = new Set(list.map(playerKey))
  selectedCompare.value = selectedCompare.value.filter(key => allowed.has(key))
})
watch(compareEnabled, (value) => {
  if (!value) {
    selectedCompare.value = []
  }
})
watch(
  [selectedClasses, rsciOnly, selectedPosition, selectedConferences],
  () => {
    saveSharedFilters({
      selectedClasses: selectedClasses.value,
      rsciOnly: rsciOnly.value,
      selectedPosition: selectedPosition.value,
      selectedConferences: selectedConferences.value
    })
  },
  { deep: true }
)

onMounted(async () => {
  await refreshAvailableDate()
  await reloadData()
})

onBeforeRouteLeave(() => {
  compareEnabled.value = false
  selectedCompare.value = []
})
</script>

<template>
  <div class="daily-reports">
    <CompareToggle v-model="compareEnabled" />

    <div class="page-header-row">
      <SettingsDrawer
        v-model:selectedClasses="selectedClasses"
        v-model:gender="gender"
        v-model:dateRange="dateRange"
        v-model:rsciOnly="rsciOnly"
        v-model:compareEnabled="compareEnabled"
        v-model:selectedConferences="selectedConferences"
        v-model:selectedPosition="selectedPosition"
      :classes="classes"
      :conferences="conferences"
      :disableControls="compareEnabled"
      showDateRange
      subtitle="Slice daily reports"
    />

      <div class="page-header">
        <h1 class="page-title">Daily Reports</h1>
        <p class="page-subtitle">
          Top prospect performances 
          <span v-if="dateRangeText">from {{ dateRangeText }}</span>
        </p>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      Loading player data...
    </div>
    
    <div v-else-if="error" class="error">
      <p>Error loading data: {{ error }}</p>
      <p class="error-hint">Make sure the Dagster pipeline has generated JSON files.</p>
    </div>
    
    <div v-else class="cards-grid">
      <div
        v-for="player in rankedPlayers"
        :key="player.player_id + '-' + player.game_id"
        class="compare-card"
        :class="{ 'is-selected': isSelected(player), 'is-compare': compareEnabled }"
        @click="toggleCompare(player, $event)"
      >
        <DailyPlayerCard 
          :player="player"
          :gender="gender"
          :showSeasonRank="true"
        />
      </div>
      
      <div v-if="rankedPlayers.length === 0" class="no-data">
        No players found for {{ selectedClassLabel }}.
        <span v-if="rsciOnly">Try disabling the RSCI filter.</span>
      </div>
    </div>
    
    <div v-if="!loading && players.length > 0" class="results-count">
      Showing {{ filteredPlayers.length }} of {{ players.length }} total players
    </div>
  </div>
</template>

<style scoped>
.daily-reports {
  padding: 1rem;
}

.page-header-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.page-header {
  margin: 0;
  flex: 1;
}

.page-title {
  font-family: 'Sora', sans-serif;
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-gold));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0;
}


.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.compare-card {
  cursor: pointer;
}

.compare-card.is-selected :deep(.player-card) {
  animation: compare-bounce 1s ease-in-out infinite;
  will-change: transform;
}

@keyframes compare-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-glow);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 3rem;
  color: var(--accent-red);
  font-family: 'Sora', sans-serif;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid var(--accent-red);
  border-radius: 8px;
  margin-top: 1.5rem;
}

.error-hint {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.no-data {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  grid-column: 1 / -1;
}

.results-count {
  text-align: center;
  padding: 1rem;
  color: var(--text-muted);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .page-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
