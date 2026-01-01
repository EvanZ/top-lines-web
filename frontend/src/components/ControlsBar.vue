<script setup>
import { computed } from 'vue'
import Multiselect from 'vue-multiselect'
import 'vue-multiselect/dist/vue-multiselect.css'

const props = defineProps({
  dateRange: Number,
  compareEnabled: Boolean,
  selectedConferences: Array,
  selectedPosition: String,
  showDateRange: Boolean,
  showCompare: Boolean,
  showPosition: {
    type: Boolean,
    default: true
  },
  disableControls: Boolean,
  conferences: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:dateRange', 
  'update:compareEnabled',
  'update:selectedConferences',
  'update:selectedPosition'
])

const positions = [
  { label: 'All', value: '' },
  { label: 'G', value: 'Guard' },
  { label: 'F', value: 'Forward' },
  { label: 'C', value: 'Center' }
]

const dateRanges = [1, 2, 3, 7]
const controlsDisabled = computed(() => !!props.disableControls)

// Build grouped options for vue-multiselect
const conferenceOptions = computed(() => {
  const powerConfs = ['ACC', 'Big 12', 'Big East', 'Big Ten', 'SEC']
  const power = []
  const other = []
  
  props.conferences.forEach(conf => {
    const shortName = conf.short_name || conf.name
    if (!shortName || shortName === 'Division I') return
    const option = { label: shortName, value: shortName }
    if (powerConfs.includes(shortName)) {
      power.push(option)
    } else {
      other.push(option)
    }
  })
  
  const sortByLabel = (a, b) => a.label.localeCompare(b.label)
  return [
    { group: 'Power Conferences', items: power.sort(sortByLabel) },
    { group: 'Other Conferences', items: other.sort(sortByLabel) }
  ]
})

// Map selected string values to option objects for the multiselect
const selectedConferenceOptions = computed({
  get() {
    const selected = new Set(props.selectedConferences || [])
    return conferenceOptions.value.flatMap(group =>
      group.items.filter(opt => selected.has(opt.value))
    )
  },
  set(options) {
    if (controlsDisabled.value) return
    const values = (options || []).map(opt => opt.value)
    emit('update:selectedConferences', values)
  }
})

const clearConferenceSelections = () => {
  if (controlsDisabled.value) return
  selectedConferenceOptions.value = []
}

</script>

<template>
  <div class="controls-bar" :class="{ locked: controlsDisabled }">
    <!-- Conference Filter -->
    <div class="control-group conference-group">
      <span class="control-label">Conference</span>
      <button
        v-if="selectedConferenceOptions.length"
        type="button"
        class="clear-conferences"
        :disabled="controlsDisabled"
        @click="clearConferenceSelections"
      >
        Clear
      </button>
      <Multiselect
        v-model="selectedConferenceOptions"
        :options="conferenceOptions"
        :multiple="true"
        :close-on-select="false"
        :clear-on-select="false"
        :preserve-search="true"
        :preselect-first="false"
        :group-values="'items'"
        :group-label="'group'"
        track-by="value"
        label="label"
        placeholder=""
        select-label="Press enter to select"
        deselect-label="Press enter to remove"
        selected-label="Selected"
        :disabled="controlsDisabled"
        :show-labels="false"
      >
        <template #selection="{ values, remove }">
          <div class="multiselect-selection">
            <span v-if="values.length === 0" class="multiselect-placeholder">
              All Conferences
            </span>
            <span
              v-else
              v-for="option in values"
              :key="option.value"
              class="multiselect-pill"
            >
              {{ option.label }}
              <button
                type="button"
                class="pill-remove"
                :disabled="controlsDisabled"
                @click.stop="!controlsDisabled && remove(option)"
              >
                ×
              </button>
            </span>
          </div>
        </template>
        <template #group-label="{ group }">
          <div class="multiselect-group-label">{{ group.group }}</div>
        </template>
        <template #option="{ option }">
          <div class="multiselect-option-row">
            {{ option.label }}
          </div>
        </template>
      </Multiselect>
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
    <div v-if="showPosition" class="control-group">
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

.clear-conferences {
  background: transparent;
  border: 1px solid var(--border-glow);
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.clear-conferences:hover:not(:disabled) {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.clear-conferences:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.date-buttons,
.position-buttons {
  display: flex;
  gap: 0.25rem;
}

.date-btn,
.position-btn {
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
.position-btn:hover {
  border-color: var(--accent-cyan);
  color: var(--text-primary);
}

.date-btn.active,
.position-btn.active {
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

:deep(.multiselect) {
  width: 100%;
}

:deep(.multiselect__tags) {
  background: var(--bg-dark);
  border: 1px solid var(--border-glow);
  border-radius: 8px;
  min-height: 44px;
  padding: 0.35rem 0.5rem;
  color: var(--text-secondary);
}

:deep(.multiselect__input) {
  background: transparent;
  color: var(--text-primary);
}

:deep(.multiselect__single) {
  color: var(--text-primary);
}

:deep(.multiselect__placeholder) {
  color: var(--text-secondary);
  opacity: 0.8;
}

:deep(.multiselect__tags-wrap) {
  display: none;
}

.multiselect-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.multiselect-placeholder {
  color: var(--text-secondary);
  opacity: 0.9;
}

.multiselect-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(0, 212, 255, 0.16);
  color: var(--text-primary);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
  border: 1px solid var(--border-glow);
}

.pill-remove {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.95em;
  line-height: 1;
  padding: 0;
}

.pill-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

:deep(.multiselect__option) {
  background: var(--bg-card);
  color: var(--text-secondary);
  padding: 0.5rem 0.75rem;
}

:deep(.multiselect__option--highlight) {
  background: rgba(0, 212, 255, 0.12);
  color: var(--text-primary);
}

:deep(.multiselect__option--selected) {
  background: rgba(0, 212, 255, 0.08);
  color: var(--text-primary);
}

:deep(.multiselect__content) {
  max-height: 280px;
}

:deep(.multiselect__tag) {
  background: var(--accent-cyan);
  color: var(--bg-dark);
  border-radius: 6px;
  padding: 0.25rem 0.45rem;
  font-size: 0.75rem;
}

:deep(.multiselect__tag-icon) {
  color: inherit;
}

:deep(.multiselect__select) {
  color: var(--text-secondary);
}

.multiselect-summary {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.multiselect-group-label {
  padding: 0.35rem 0.75rem 0.2rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
}

.multiselect-option-row {
  padding: 0.35rem 0.75rem;
}

/* Multiselect palette tweaks */
:deep(.multiselect__content-wrapper) {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

:deep(.multiselect__option--disabled) {
  opacity: 0.5;
  background: var(--bg-card);
  color: var(--text-secondary);
}

:deep(.multiselect__option--selected) {
  background: rgba(0, 212, 255, 0.08);
  color: var(--text-primary);
  opacity: 1;
}

:deep(.multiselect__option--selected.multiselect__option--highlight) {
  background: rgba(0, 212, 255, 0.18);
  color: var(--text-primary);
}
</style>
