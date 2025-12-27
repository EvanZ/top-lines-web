<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  dateRange: Number,
  rsciOnly: Boolean,
  compareEnabled: Boolean,
  selectedConferences: Array,
  selectedPosition: String,
  showDateRange: Boolean,
  showCompare: Boolean,
  disableControls: Boolean,
  gender: {
    type: String,
    default: 'men'
  },
  conferences: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:dateRange', 
  'update:rsciOnly', 
  'update:compareEnabled',
  'update:selectedConferences',
  'update:selectedPosition',
  'update:gender'
])

const positions = [
  { label: 'All', value: '' },
  { label: 'G', value: 'Guard' },
  { label: 'F', value: 'Forward' },
  { label: 'C', value: 'Center' }
]

const dateRanges = [1, 2, 3, 7]
const showDropdown = ref(false)
const activeGender = computed(() => props.gender || 'men')
const rsciLabel = computed(() => activeGender.value === 'women' ? 'HoopGurlz' : 'RSCI')
const controlsDisabled = computed(() => !!props.disableControls)

// Group conferences into power and others
// Note: team_conf in player data uses short names like "ACC", "Big Ten"
const groupedConferences = computed(() => {
  const powerConfs = ['ACC', 'Big 12', 'Big East', 'Big Ten', 'SEC']
  const power = []
  const other = []
  
  props.conferences.forEach(conf => {
    // Use short_name for filtering (matches team_conf in player data)
    const shortName = conf.short_name || conf.name
    if (powerConfs.includes(shortName)) {
      power.push(shortName)
    } else if (shortName !== 'Division I') {
      other.push(shortName)
    }
  })
  
  return [
    { group: 'Power Conferences', items: power.sort() },
    { group: 'Other Conferences', items: other.sort() }
  ]
})

function toggleConference(conf) {
  if (controlsDisabled.value) return
  const current = props.selectedConferences || []
  let updated
  if (current.includes(conf)) {
    updated = current.filter(c => c !== conf)
  } else {
    updated = [...current, conf]
  }
  emit('update:selectedConferences', updated)
}

function clearFilters() {
  if (controlsDisabled.value) return
  emit('update:selectedConferences', [])
}

function setGender(value) {
  if (controlsDisabled.value) return
  emit('update:gender', value)
}

watch(controlsDisabled, (value) => {
  if (value) {
    showDropdown.value = false
  }
})
</script>

<template>
  <div class="controls-bar" :class="{ locked: controlsDisabled }">
    <!-- Gender Toggle -->
    <div class="control-group">
      <span class="control-label">Gender</span>
      <div class="gender-buttons">
        <button
          class="gender-btn"
          :class="{ active: activeGender === 'men' }"
          :disabled="controlsDisabled"
          @click="setGender('men')"
        >
          M
        </button>
        <button
          class="gender-btn"
          :class="{ active: activeGender === 'women' }"
          :disabled="controlsDisabled"
          @click="setGender('women')"
        >
          W
        </button>
      </div>
    </div>

    <!-- Date Range (Daily Reports only) -->
    <div v-if="showDateRange" class="control-group">
      <span class="control-label">Date Range</span>
      <div class="date-buttons">
        <button 
          v-for="d in dateRanges" 
          :key="d"
          class="date-btn"
          :class="{ active: dateRange === d }"
          :disabled="controlsDisabled"
          @click="emit('update:dateRange', d)"
        >
          {{ d }}d
        </button>
      </div>
    </div>

    <!-- RSCI Toggle -->
    <div class="control-group toggle-group">
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          :checked="rsciOnly"
          :disabled="controlsDisabled"
          @change="emit('update:rsciOnly', $event.target.checked)"
        >
        <span class="toggle-slider"></span>
      </label>
      <span class="toggle-label" :class="{ active: rsciOnly }">
        <span class="rsci-icon">★</span> {{ rsciLabel }} Only
      </span>
    </div>

    <!-- Compare Toggle -->
    <div
      v-if="showCompare"
      class="control-group toggle-group compare-toggle"
    >
      <label class="toggle-switch">
        <input
          type="checkbox"
          :checked="compareEnabled"
          @change="emit('update:compareEnabled', $event.target.checked)"
        >
        <span class="toggle-slider"></span>
      </label>
      <span class="toggle-label" :class="{ active: compareEnabled }">
        Compare
        <span class="compare-tooltip" tabindex="0" aria-label="Compare mode help">
          i
          <span class="compare-tooltip-text">
            Select cards by clicking them first, then enable Compare to isolate them.
          </span>
        </span>
      </span>
    </div>

    <!-- Position Filter -->
    <div class="control-group">
      <span class="control-label">Position</span>
      <div class="position-buttons">
        <button 
          v-for="pos in positions" 
          :key="pos.label"
          class="position-btn"
          :class="{ active: (selectedPosition || '') === pos.value }"
          :disabled="controlsDisabled"
          @click="emit('update:selectedPosition', pos.value)"
        >
          {{ pos.label }}
        </button>
      </div>
    </div>

    <!-- Conference Filter -->
    <div class="control-group">
      <span class="control-label">Conference</span>
      <div class="multiselect">
        <button class="multiselect-btn" :disabled="controlsDisabled" @click="showDropdown = !showDropdown">
          <span class="label">
            {{ selectedConferences?.length === 0 ? 'All Conferences' : 
               selectedConferences?.length + ' selected' }}
          </span>
          <span class="arrow">▼</span>
        </button>
        <div v-if="showDropdown && !controlsDisabled" class="multiselect-dropdown">
          <button 
            v-if="selectedConferences?.length > 0" 
            class="clear-btn" 
            :disabled="controlsDisabled"
            @click="clearFilters"
          >
            Clear All
          </button>
          <div v-for="group in groupedConferences" :key="group.group">
            <div v-if="group.items.length > 0" class="conf-group-label">{{ group.group }}</div>
            <label 
              v-for="conf in group.items" 
              :key="conf"
              class="multiselect-option"
              @click.prevent="toggleConference(conf)"
            >
              <input 
                type="checkbox" 
                :checked="selectedConferences?.includes(conf)"
                :disabled="controlsDisabled"
                @click.stop
              >
              {{ conf }}
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.controls-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  padding: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.controls-bar.locked .control-group:not(.compare-toggle) {
  opacity: 0.5;
  pointer-events: none;
}

.compare-toggle {
  position: relative;
}

.compare-tooltip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.4rem;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid var(--border-glow);
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.04);
  cursor: help;
  position: relative;
}

.compare-tooltip-text {
  position: absolute;
  left: 50%;
  top: calc(100% + 8px);
  transform: translateX(-50%);
  min-width: 220px;
  max-width: 260px;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  background: rgba(10, 14, 26, 0.95);
  border: 1px solid var(--border-glow);
  color: var(--text-primary);
  font-size: 0.7rem;
  line-height: 1.3;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 5;
}

.compare-tooltip:hover .compare-tooltip-text,
.compare-tooltip:focus .compare-tooltip-text,
.compare-tooltip:focus-visible .compare-tooltip-text {
  opacity: 1;
  animation: compare-bounce 1s ease-in-out infinite;
}

@keyframes compare-bounce {
  0% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-4px); }
  100% { transform: translateX(-50%) translateY(0); }
}

:global(:root[data-theme="light"] .compare-tooltip-text) {
  background: rgba(255, 255, 255, 0.95);
  color: #0a0e1a;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-label {
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.date-buttons,
.position-buttons,
.gender-buttons {
  display: flex;
  gap: 0.25rem;
}

.date-btn,
.position-btn,
.gender-btn {
  padding: 0.375rem 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-glow);
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.date-btn:hover,
.position-btn:hover,
.gender-btn:hover {
  border-color: var(--accent-cyan);
  color: var(--text-primary);
}

.date-btn.active,
.position-btn.active,
.gender-btn.active {
  background: var(--accent-cyan);
  border-color: var(--accent-cyan);
  color: var(--bg-dark);
}

.toggle-group {
  gap: 0.5rem;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
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

.toggle-slider::before {
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

.toggle-switch input:checked + .toggle-slider {
  background: rgba(255, 215, 0, 0.2);
  border-color: var(--accent-gold);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
  background: var(--accent-gold);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.toggle-label {
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.toggle-label.active {
  color: var(--accent-gold);
}

.rsci-icon {
  color: var(--accent-gold);
}

.multiselect {
  position: relative;
}

.multiselect-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-glow);
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: 4px;
  min-width: 140px;
}

.multiselect-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  min-width: 200px;
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 8px;
  margin-top: 0.25rem;
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.clear-btn {
  display: block;
  width: 100%;
  padding: 0.5rem;
  background: rgba(255, 0, 0, 0.1);
  border: none;
  border-bottom: 1px solid var(--border-glow);
  color: var(--accent-red);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  text-align: center;
}

.clear-btn:hover {
  background: rgba(255, 0, 0, 0.2);
}

.conf-group-label {
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  padding: 0.5rem 0.75rem 0.25rem;
  border-top: 1px solid var(--border-glow);
}

.conf-group-label:first-child {
  border-top: none;
}

.multiselect-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s ease;
}

.multiselect-option:hover {
  background: rgba(0, 212, 255, 0.1);
}

.multiselect-option input {
  accent-color: var(--accent-cyan);
  pointer-events: none;
}
</style>
