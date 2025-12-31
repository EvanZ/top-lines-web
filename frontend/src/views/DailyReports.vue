<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import DailyPlayerCard from '../components/DailyPlayerCard.vue'
import SeasonPlayerCard from '../components/SeasonPlayerCard.vue'
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
const flippedCards = ref(new Set())
const flipAnimating = ref(new Set())
let flipTimer = null
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

const seasonPlayersById = computed(() => new Map(
  seasonPlayers.value.map(player => [player.player_id, player])
))

const seasonPlayerFor = (playerId) => seasonPlayersById.value.get(playerId)

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

function toggleCardFlip(player, event) {
  if (event?.target?.closest('a') || event?.target?.closest('.compare-toggle')) {
    return
  }
  const key = playerKey(player)
  const nextAnim = new Set(flipAnimating.value)
  nextAnim.add(key)
  flipAnimating.value = nextAnim
  const next = new Set(flippedCards.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  flippedCards.value = next
  if (flipTimer) {
    clearTimeout(flipTimer)
  }
  flipTimer = setTimeout(() => {
    const updated = new Set(flipAnimating.value)
    updated.delete(key)
    flipAnimating.value = updated
  }, 650)
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
          Top performances 
          <span v-if="dateRangeText">from {{ dateRangeText }}.</span>
          <span>&nbsp;Click to flip cards between daily and season performance.</span>
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
        :class="{ 'is-selected': isSelected(player), 'is-compare': compareEnabled, flipped: flippedCards.has(playerKey(player)), 'flip-anim': flipAnimating.has(playerKey(player)) }"
        @click="toggleCardFlip(player, $event)"
      >
        <button
          class="compare-toggle"
          type="button"
          @click="toggleCompare(player, $event)"
          :aria-pressed="isSelected(player)"
          :aria-label="isSelected(player) ? 'Remove from compare' : 'Add to compare'"
          title="Select for compare"
        >
          <span class="toggle-track" :class="{ on: isSelected(player) }">
            <span class="toggle-thumb"></span>
          </span>
        </button>
        <div class="flip-card">
          <div class="flip-card-inner">
            <div class="flip-card-face flip-card-front">
              <DailyPlayerCard 
                :player="player"
                :gender="gender"
                :showSeasonRank="true"
              />
            </div>
            <div class="flip-card-face flip-card-back">
              <SeasonPlayerCard
                v-if="seasonPlayerFor(player.player_id)"
                :player="seasonPlayerFor(player.player_id)"
                :gender="gender"
              />
              <div v-else class="season-modal-empty">Season card unavailable.</div>
            </div>
          </div>
        </div>
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
  cursor: default;
  position: relative;
  perspective: 1200px;
}

.compare-card.flip-anim .compare-toggle {
  animation: toggle-pop 0.6s ease;
}


.compare-card.is-selected {
  animation: compare-bounce 1s ease-in-out infinite;
  will-change: transform;
}

.compare-toggle {
  position: absolute;
  top: 3.55rem;
  left: 0.75rem;
  z-index: 2;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font-family: 'Sora', sans-serif;
  line-height: 1;
  cursor: pointer;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
}

.compare-toggle[aria-pressed="true"] {
  filter: drop-shadow(0 2px 8px rgba(255, 212, 0, 0.5));
}

.compare-card:hover .compare-toggle {
  transform: none;
}

.toggle-track {
  display: inline-flex;
  align-items: center;
  width: 2.1rem;
  height: 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--border-glow);
  background: rgba(6, 12, 20, 0.75);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.toggle-track.on {
  border-color: var(--accent-gold);
  background: rgba(255, 212, 0, 0.18);
}

.toggle-thumb {
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 999px;
  background: var(--text-primary);
  transform: translateX(0.1rem);
  transition: transform 0.2s ease, background 0.2s ease;
}

.toggle-track.on .toggle-thumb {
  transform: translateX(1.1rem);
  background: var(--accent-gold);
}

:global(:root[data-theme="light"] .compare-toggle) {
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.15));
}

:global(:root[data-theme="light"] .toggle-track) {
  border-color: rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.85);
}

:global(:root[data-theme="light"] .toggle-track.on) {
  border-color: rgba(255, 170, 0, 0.65);
  background: rgba(255, 200, 0, 0.2);
}

:global(:root[data-theme="light"] .toggle-thumb) {
  background: rgba(20, 20, 20, 0.8);
}

.compare-card:hover {
  transform: translateY(-3px);
}

.compare-card :deep(.player-card:hover) {
  transform: none;
}

.flip-card {
  position: relative;
  max-height: 520px;
  overflow: hidden;
  transition: max-height 0.5s ease;
}

.flip-card-inner {
  position: relative;
  transition: transform 0.6s ease;
  transform-style: preserve-3d;
  display: grid;
}

.compare-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}


.compare-card.flipped .flip-card {
  max-height: 900px;
}

.flip-card-face {
  grid-area: 1 / 1;
  width: 100%;
  backface-visibility: hidden;
  transform: translateZ(1px);
}

.flip-card-back {
  transform: rotateY(180deg);
}

@keyframes compare-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes toggle-pop {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
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

.season-modal-empty {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  padding: 2rem;
  border-radius: 12px;
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  text-align: center;
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
