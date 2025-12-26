<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  dateRange: Number,
  rsciOnly: Boolean,
  selectedConferences: Array,
  selectedPosition: String,
  showDateRange: Boolean,
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
  'update:selectedConferences',
  'update:selectedPosition',
  'update:gender'
])

const positions = ['All', 'Guard', 'Forward', 'Center']

const dateRanges = [1, 2, 3, 7]
const showDropdown = ref(false)
const activeGender = computed(() => props.gender || 'men')
const rsciLabel = computed(() => activeGender.value === 'women' ? 'HoopGurlz' : 'RSCI')

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
  emit('update:selectedConferences', [])
}

function setGender(value) {
  emit('update:gender', value)
}
</script>

<template>
  <div class="controls-bar">
    <!-- Gender Toggle -->
    <div class="control-group">
      <span class="control-label">Gender</span>
      <div class="gender-buttons">
        <button
          class="gender-btn"
          :class="{ active: activeGender === 'men' }"
          @click="setGender('men')"
        >
          Men
        </button>
        <button
          class="gender-btn"
          :class="{ active: activeGender === 'women' }"
          @click="setGender('women')"
        >
          Women
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
          @change="emit('update:rsciOnly', $event.target.checked)"
        >
        <span class="toggle-slider"></span>
      </label>
      <span class="toggle-label" :class="{ active: rsciOnly }">
        <span class="rsci-icon">★</span> {{ rsciLabel }} Only
      </span>
    </div>

    <!-- Position Filter -->
    <div class="control-group">
      <span class="control-label">Position</span>
      <div class="position-buttons">
        <button 
          v-for="pos in positions" 
          :key="pos"
          class="position-btn"
          :class="{ active: (selectedPosition || 'All') === pos }"
          @click="emit('update:selectedPosition', pos === 'All' ? '' : pos)"
        >
          {{ pos }}
        </button>
      </div>
    </div>

    <!-- Conference Filter -->
    <div class="control-group">
      <span class="control-label">Conference</span>
      <div class="multiselect">
        <button class="multiselect-btn" @click="showDropdown = !showDropdown">
          <span class="label">
            {{ selectedConferences?.length === 0 ? 'All Conferences' : 
               selectedConferences?.length + ' selected' }}
          </span>
          <span class="arrow">▼</span>
        </button>
        <div v-if="showDropdown" class="multiselect-dropdown">
          <button 
            v-if="selectedConferences?.length > 0" 
            class="clear-btn" 
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
