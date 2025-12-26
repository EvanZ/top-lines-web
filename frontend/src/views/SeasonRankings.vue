<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import SeasonPlayerCard from '../components/SeasonPlayerCard.vue'
import ControlsBar from '../components/ControlsBar.vue'
import ClassTabs from '../components/ClassTabs.vue'
import { usePlayerData, useConferences } from '../composables/usePlayerData.js'

const { players, meta, loading, error, loadSeasonRankings } = usePlayerData()
const { conferences, loadConferences } = useConferences()

// Inject gender from App.vue
const gender = inject('gender')

const activeClass = ref('freshman')
const rsciOnly = ref(false)
const selectedConferences = ref([])
const selectedPosition = ref('')
const availableDate = ref('2025-12-23') // Latest available date
const infoPanelOpen = ref(false)

const classes = ['freshman', 'sophomore', 'junior', 'senior']

const filteredPlayers = computed(() => {
  return players.value
    .filter(player => {
      if (player.classLower !== activeClass.value) return false
      if (rsciOnly.value && !player.rsci_rank) return false
      if (selectedConferences.value.length > 0 && 
          !selectedConferences.value.includes(player.conference)) return false
      if (selectedPosition.value && player.position_display_name !== selectedPosition.value) return false
      return true
    })
    .sort((a, b) => a.class_rank - b.class_rank)
})

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

// Reload data when gender changes
const reloadData = async () => {
  await Promise.all([
    loadSeasonRankings(availableDate.value, gender.value),
    loadConferences(gender.value)
  ])
}

watch(gender, reloadData)

onMounted(reloadData)
</script>

<template>
  <div class="season-rankings">
    <div class="page-header">
      <h1 class="page-title">Season Rankings</h1>
      <p class="page-subtitle">
        Cumulative prospect rankings based on full season performance
        <span v-if="dateRangeText">({{ dateRangeText }})</span>
      </p>
    </div>

    <ControlsBar 
      v-model:gender="gender"
      v-model:rsciOnly="rsciOnly"
      v-model:selectedConferences="selectedConferences"
      v-model:selectedPosition="selectedPosition"
      :conferences="conferences"
    />

    <!-- Notes & Legend Toggle -->
    <div class="info-toggle-row">
      <button class="info-toggle" :class="{ open: infoPanelOpen }" @click="infoPanelOpen = !infoPanelOpen">
        <span class="arrow">▼</span> Notes & Legend
      </button>
    </div>

    <!-- Collapsible Info Panel -->
    <div class="info-panel" :class="{ open: infoPanelOpen }">
      <div class="info-panel-grid">
        <div>
          <h3 class="notes-title">System Notes</h3>
          <ul class="notes-list">
            <li><strong>EZ</strong> is a custom game score. <strong>EZ75</strong> normalizes to 75 possessions.</li>
            <li>EZ75 components: <strong>Off</strong>ense, <strong>Def</strong>ense, <strong>Pass</strong>ing, <strong>Reb</strong>ounding</li>
            <li>Box score stats shown as per-game averages</li>
            <li><span class="gold-text">Gold border</span> = Top 100 RSCI recruit</li>
            <li>School ranking includes SOS (Strength of Schedule)</li>
          </ul>
        </div>
        <div>
          <h3 class="notes-title">Color Legend</h3>
          <p class="legend-desc">Percentiles within class. Border color runs violet → yellow. Shot type % = ratio to total FGA.</p>
          <div class="color-legend">
            <div class="legend-chip legend-pct-10">10%</div>
            <div class="legend-chip legend-pct-20">20%</div>
            <div class="legend-chip legend-pct-30">30%</div>
            <div class="legend-chip legend-pct-40">40%</div>
            <div class="legend-chip legend-pct-50">50%</div>
            <div class="legend-chip legend-pct-60">60%</div>
            <div class="legend-chip legend-pct-70">70%</div>
            <div class="legend-chip legend-pct-80">80%</div>
            <div class="legend-chip legend-pct-90">90%</div>
            <div class="legend-chip legend-pct-100">100%</div>
          </div>
        </div>
      </div>
    </div>

    <ClassTabs 
      :classes="classes" 
      v-model:activeClass="activeClass"
    />

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      Loading rankings data...
    </div>
    
    <div v-else-if="error" class="error">
      <p>Error loading data: {{ error }}</p>
      <p class="error-hint">Make sure the Dagster pipeline has generated rankings JSON files.</p>
    </div>
    
    <div v-else class="cards-grid">
      <SeasonPlayerCard 
        v-for="player in filteredPlayers" 
        :key="player.player_id"
        :player="player"
        :gender="gender"
      />
      
      <div v-if="filteredPlayers.length === 0" class="no-data">
        <p v-if="players.length === 0">
          No rankings data available. Run the season rankings export in Dagster.
        </p>
        <p v-else>
          No players found for {{ activeClass }}.
          <span v-if="rsciOnly">Try disabling the RSCI filter.</span>
        </p>
      </div>
    </div>
    
    <div v-if="!loading && players.length > 0" class="results-count">
      Showing {{ filteredPlayers.length }} of {{ players.length }} total players
    </div>
  </div>
</template>

<style scoped>
.season-rankings {
  padding: 1rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-family: 'Barlow Condensed', sans-serif;
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
  margin-top: 1.5rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--text-secondary);
  font-family: 'Barlow Condensed', sans-serif;
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
  font-family: 'Barlow Condensed', sans-serif;
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
  font-family: 'Barlow Condensed', sans-serif;
  grid-column: 1 / -1;
}

.results-count {
  text-align: center;
  padding: 1rem;
  color: var(--text-muted);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.875rem;
  margin-top: 1rem;
}

/* Info Panel Toggle */
.info-toggle-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}

.info-toggle {
  background: transparent;
  border: 1px solid var(--border-glow);
  color: var(--text-muted);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: 'Barlow Condensed', sans-serif;
  transition: all 0.2s ease;
}

.info-toggle:hover {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.info-toggle .arrow {
  display: inline-block;
  transition: transform 0.2s ease;
  margin-right: 0.25rem;
}

.info-toggle.open .arrow {
  transform: rotate(180deg);
}

/* Info Panel */
.info-panel {
  display: none;
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  font-size: 0.8rem;
}

.info-panel.open {
  display: block;
}

.info-panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .info-panel-grid {
    grid-template-columns: 1fr;
  }
}

.notes-title {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
  margin: 0 0 0.5rem 0;
  color: var(--accent-cyan);
}

.notes-list {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.notes-list li {
  margin-bottom: 0.25rem;
}

.gold-text {
  color: var(--accent-gold);
}

.legend-desc {
  color: var(--text-muted);
  margin: 0 0 0.5rem 0;
  font-size: 0.75rem;
}

.color-legend {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}

.color-legend .legend-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  padding: 0.3rem 0.25rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border: 0.1em solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.35);
}

/* Percentile colors for legend - viridis borders */
.color-legend .legend-pct-10 { border-color: #482878; }
.color-legend .legend-pct-20 { border-color: #3e4989; }
.color-legend .legend-pct-30 { border-color: #31688e; }
.color-legend .legend-pct-40 { border-color: #26828e; }
.color-legend .legend-pct-50 { border-color: #1f9e89; }
.color-legend .legend-pct-60 { border-color: #35b779; }
.color-legend .legend-pct-70 { border-color: #6dcd59; }
.color-legend .legend-pct-80 { border-color: #b4de2c; }
.color-legend .legend-pct-90 { border-color: #dce319; }
.color-legend .legend-pct-100 { border-color: #fde725; }
</style>
