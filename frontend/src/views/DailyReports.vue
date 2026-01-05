<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import DailyPlayerCard from '../components/DailyPlayerCard.vue'
import SeasonPlayerCard from '../components/SeasonPlayerCard.vue'
import SettingsDrawer from '../components/SettingsDrawer.vue'
import CompareToggle from '../components/CompareToggle.vue'
import { usePlayerData, useConferences } from '../composables/usePlayerData.js'
import { loadSharedFilters, saveSharedFilters } from '../composables/useSharedFilters.js'

const { players, meta, loading, error, loadTopLinesByDates } = usePlayerData()
const { conferences, loadConferences } = useConferences()
const dataBase = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '')

// Inject gender from App.vue
const gender = inject('gender')

const selectedClasses = ref(['freshman'])
const rsciOnly = ref(false)
const compareEnabled = ref(false)
const selectedCompare = ref([])
const selectedConferences = ref([])
const flippedCards = ref(new Set())
const flipAnimating = ref(new Set())
let flipTimer = null
const shakeCards = ref(new Set())
const shakeTimers = new Map()
const selectedPosition = ref('')
const availableDate = ref('2025-12-23') // Latest available date (toplines)
const availableToplineDates = ref([])
const selectedDates = ref([])
const availableRankingsDate = ref('2025-12-23')
const seasonPlayers = ref([])
const hideUnranked = ref(false)

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
if (Array.isArray(savedFilters.toplineDates)) {
  selectedDates.value = savedFilters.toplineDates
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

const seasonPlayersById = computed(() => {
  const rankMap = seasonRankMap.value
  return new Map(
    seasonPlayers.value.map(player => {
      const pid = player.player_id
      const display_rank = rankMap.get(pid) ?? player.display_rank ?? player.class_rank
      return [pid, { ...player, display_rank }]
    })
  )
})

const seasonPlayerFor = (playerId) => seasonPlayersById.value.get(playerId)

const filteredPlayers = computed(() => {
  const base = baseFilteredPlayers.value
  if (!compareEnabled.value || selectedCompare.value.length === 0) {
    return base
  }
  const selected = new Set(selectedCompare.value)
  return base.filter(player => selected.has(playerKey(player)))
})

const visiblePlayers = computed(() => {
  if (!hideUnranked.value) return filteredPlayers.value
  const rankedIds = seasonRankMap.value
  return filteredPlayers.value.filter(player => rankedIds.has(player.player_id))
})

const rankedPlayers = computed(() => (
  visiblePlayers.value.map((player, idx) => ({
    ...player,
    display_rank: idx + 1,
    season_rank: seasonRankMap.value.get(player.player_id) ?? null
  }))
))

const selectedDateLabel = computed(() => {
  if (!selectedDates.value.length) return ''
  const [first, ...rest] = selectedDates.value
  if (!rest.length) return formatDateDisplay(first)
  return `${formatDateDisplay(first)} (+${rest.length} more)`
})

const toplineDateOptions = computed(() => availableToplineDates.value || [])

const toggleDate = (dateStr) => {
  if (!dateStr) return
  const current = new Set(selectedDates.value)
  if (current.has(dateStr)) {
    if (current.size === 1) return // keep at least one
    current.delete(dateStr)
  } else {
    current.add(dateStr)
  }
  // keep selection ordered by recency as in manifest
  const ordered = toplineDateOptions.value.filter((d) => current.has(d))
  selectedDates.value = ordered
}

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
  if (!seasonPlayerFor(player.player_id)) {
    const nextShake = new Set(shakeCards.value)
    nextShake.add(key)
    shakeCards.value = nextShake
    if (shakeTimers.has(key)) {
      clearTimeout(shakeTimers.get(key))
    }
    const timer = setTimeout(() => {
      const updated = new Set(shakeCards.value)
      updated.delete(key)
      shakeCards.value = updated
      shakeTimers.delete(key)
    }, 650)
    shakeTimers.set(key, timer)
    return
  }
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


// Reload data when date selection or gender changes
const reloadData = async () => {
  const seasonDate = availableRankingsDate.value || availableDate.value
  if (!selectedDates.value.length && availableDate.value) {
    selectedDates.value = [availableDate.value]
  }
  await Promise.all([
    loadTopLinesByDates(selectedDates.value, gender.value),
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
    const dailyList = manifest?.[key]?.toplines || manifest?.[key]?.daily || []
    const rankingsList = manifest?.[key]?.rankings || []
    availableDate.value = dailyList[0] || manifest?.latest_date || availableDate.value
    availableToplineDates.value = dailyList
    if (!selectedDates.value.length) {
      selectedDates.value = dailyList.slice(0, 1)
    } else {
      const allowed = new Set(dailyList)
      const filtered = selectedDates.value.filter((d) => allowed.has(d))
      selectedDates.value = filtered.length ? filtered : dailyList.slice(0, 1)
    }
    availableRankingsDate.value = rankingsList[0] || manifest?.latest_date || availableRankingsDate.value
  } catch (e) {
    console.error('Error loading manifest for daily reports:', e)
  }
}

watch(selectedDates, reloadData)
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
      selectedConferences: selectedConferences.value,
      toplineDates: selectedDates.value,
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
    <div class="top-controls">
      <CompareToggle v-model="compareEnabled" />
    </div>

    <div class="page-header-row">
      <SettingsDrawer
        v-model:selectedClasses="selectedClasses"
        v-model:gender="gender"
        v-model:rsciOnly="rsciOnly"
        v-model:compareEnabled="compareEnabled"
        v-model:selectedConferences="selectedConferences"
        v-model:selectedPosition="selectedPosition"
      :classes="classes"
      :conferences="conferences"
      :disableControls="compareEnabled"
      :showDateRange="false"
      :showClass="true"
      :showRsci="true"
      :showPosition="true"
      subtitle="Slice daily reports"
    />

      <div class="page-header">
        <h1 class="page-title">Noteworthy Performances</h1>
        <p class="page-subtitle">
          <!-- <span v-if="selectedDateLabel">for {{ selectedDateLabel }}.</span> -->
          <div class="date-pill-row" v-if="toplineDateOptions.length">
            <button
              v-for="d in toplineDateOptions.slice(0,7)"
              :key="d"
              class="date-pill"
              :class="{ active: selectedDates.includes(d) }"
              @click="toggleDate(d)"
            >
              <span class="date-pill-day">{{ formatDateDisplay(d) }}</span>
            </button>
          </div>
          <span>&nbsp;Click to flip cards between daily and season performance.</span>
        </p>
      </div>
      <div class="inline-toggle">
        <label class="toggle-switch">
          <input
            type="checkbox"
            :checked="hideUnranked"
            @change="hideUnranked = $event.target.checked"
          >
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label" :class="{ active: hideUnranked }">
          Hide unranked
        </span>
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
        :class="{
          'is-selected': isSelected(player),
          'is-compare': compareEnabled,
          flipped: flippedCards.has(playerKey(player)),
          'flip-anim': flipAnimating.has(playerKey(player)),
          shaking: shakeCards.has(playerKey(player))
        }"
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
              <div v-else class="season-modal-empty">Unavailable</div>
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
      Showing {{ visiblePlayers.length }} of {{ players.length }} total players
    </div>

  </div>
</template>

<style scoped>
.daily-reports {
  padding: 1rem;
}

.top-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.inline-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
}

.inline-toggle .toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.inline-toggle .toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.inline-toggle .toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-dark);
  border: 1px solid var(--border-glow);
  border-radius: 24px;
  transition: all 0.3s ease;
}

.inline-toggle .toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  bottom: 2px;
  background: var(--text-secondary);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.inline-toggle input:checked + .toggle-slider {
  background: rgba(255, 215, 0, 0.2);
  border-color: var(--accent-gold);
}

.inline-toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
  background: var(--accent-gold);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.inline-toggle .toggle-label {
  transition: color 0.2s ease;
}

.inline-toggle .toggle-label.active {
  color: var(--accent-cyan);
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

.date-pill-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.25rem 0 0.75rem;
}

.date-pill {
  border: 1px solid var(--border-glow);
  background: rgba(6, 12, 20, 0.6);
  color: var(--text-secondary);
  border-radius: 10px;
  padding: 0.4rem 0.7rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-pill:hover {
  border-color: var(--accent-cyan);
  color: var(--text-primary);
}

.date-pill.active {
  border-color: var(--accent-gold);
  background: rgba(255, 215, 0, 0.12);
  color: var(--text-primary);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.25);
}

.date-pill-day {
  display: inline-block;
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

.compare-card.shaking {
  animation: headshake 0.45s ease;
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

@keyframes headshake {
  0% {
    transform: translateX(0) rotate(0deg);
  }
  20% {
    transform: translateX(-6px) rotate(-1.5deg);
  }
  40% {
    transform: translateX(6px) rotate(1.5deg);
  }
  60% {
    transform: translateX(-4px) rotate(-1deg);
  }
  80% {
    transform: translateX(4px) rotate(1deg);
  }
  100% {
    transform: translateX(0) rotate(0deg);
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
