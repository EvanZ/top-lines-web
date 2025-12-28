<script setup>
import { ref } from 'vue'
import ControlsBar from './ControlsBar.vue'
import ClassTabs from './ClassTabs.vue'

defineProps({
  classes: {
    type: Array,
    default: () => []
  },
  selectedClasses: {
    type: Array,
    default: () => []
  },
  gender: {
    type: String,
    default: 'men'
  },
  rsciOnly: {
    type: Boolean,
    default: false
  },
  compareEnabled: {
    type: Boolean,
    default: false
  },
  selectedConferences: {
    type: Array,
    default: () => []
  },
  selectedPosition: {
    type: String,
    default: ''
  },
  conferences: {
    type: Array,
    default: () => []
  },
  showDateRange: {
    type: Boolean,
    default: false
  },
  dateRange: {
    type: Number,
    default: null
  },
  showCompare: {
    type: Boolean,
    default: false
  },
  disableControls: {
    type: Boolean,
    default: false
  },
  subtitle: {
    type: String,
    default: 'Tune the rankings view'
  }
})

const emit = defineEmits([
  'update:selectedClasses',
  'update:gender',
  'update:rsciOnly',
  'update:compareEnabled',
  'update:selectedConferences',
  'update:selectedPosition',
  'update:dateRange'
])

const open = ref(false)
const openDrawer = () => {
  open.value = true
}
const closeDrawer = () => {
  open.value = false
}
</script>

<template>
  <teleport to="#settings-trigger">
    <div v-if="!open" class="settings-fab-wrap">
      <button
        class="settings-fab"
        type="button"
        aria-label="Open filters"
        @click="openDrawer"
      >
        <span class="settings-fab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
              d="M19.4 13.5c.04-.49.04-1.01 0-1.5l1.7-1.3a.75.75 0 0 0 .18-.94l-1.6-2.77a.75.75 0 0 0-.9-.33l-2 .8a6.7 6.7 0 0 0-1.3-.75l-.3-2.1a.75.75 0 0 0-.74-.64h-3.2a.75.75 0 0 0-.74.64l-.3 2.1c-.46.2-.89.45-1.3.75l-2-.8a.75.75 0 0 0-.9.33l-1.6 2.77a.75.75 0 0 0 .18.94l1.7 1.3c-.04.49-.04 1.01 0 1.5l-1.7 1.3a.75.75 0 0 0-.18.94l1.6 2.77c.2.34.6.48.9.33l2-.8c.4.3.83.55 1.3.75l.3 2.1c.06.37.38.64.74.64h3.2c.36 0 .68-.27.74-.64l.3-2.1c.46-.2.89-.45 1.3-.75l2 .8c.34.15.74 0 .9-.33l1.6-2.77a.75.75 0 0 0-.18-.94l-1.7-1.3ZM12 15.25a3.25 3.25 0 1 1 0-6.5 3.25 3.25 0 0 1 0 6.5Z"
            />
          </svg>
        </span>
      </button>
    </div>
  </teleport>

  <teleport to="body">
    <div v-if="open" class="settings-overlay" @click.self="closeDrawer">
      <div class="settings-panel">
        <div class="settings-header">
          <div>
            <div class="settings-title">Filters</div>
            <div class="settings-subtitle">{{ subtitle }}</div>
          </div>
          <button class="settings-close" type="button" @click="closeDrawer">Close</button>
        </div>

        <div class="settings-section">
          <div class="settings-label">Class</div>
          <ClassTabs
            :classes="classes"
            :selectedClasses="selectedClasses"
            :disabled="compareEnabled"
            @update:selectedClasses="emit('update:selectedClasses', $event)"
          />
        </div>

        <ControlsBar
          :gender="gender"
          :dateRange="dateRange"
          :rsciOnly="rsciOnly"
          :compareEnabled="compareEnabled"
          :selectedConferences="selectedConferences"
          :selectedPosition="selectedPosition"
          :conferences="conferences"
          :showDateRange="showDateRange"
          :showCompare="showCompare"
          :disableControls="disableControls"
          @update:gender="emit('update:gender', $event)"
          @update:dateRange="emit('update:dateRange', $event)"
          @update:rsciOnly="emit('update:rsciOnly', $event)"
          @update:compareEnabled="emit('update:compareEnabled', $event)"
          @update:selectedConferences="emit('update:selectedConferences', $event)"
          @update:selectedPosition="emit('update:selectedPosition', $event)"
        />
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.settings-fab-wrap {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.settings-fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 100px;
  border: 0.1rem solid #ffd400;
  background: transparent;
  color: #ffd400;
  box-shadow: 0 0 12px rgba(255, 212, 0, 0.35), 0 14px 24px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  pointer-events: auto;
}

.settings-fab:hover {
  transform: translateX(3px);
  box-shadow: 0 0 18px rgba(255, 212, 0, 0.45), 0 18px 30px rgba(0, 0, 0, 0.45);
}

:root[data-theme='light'] .settings-fab {
  color: #0a0e1a;
}

.settings-fab-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
}

.settings-fab-icon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 990;
  background: rgba(6, 10, 20, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(1.5rem + env(safe-area-inset-top)) 1.5rem calc(1.5rem + env(safe-area-inset-bottom))
    calc(1.5rem + env(safe-area-inset-left));
}

.settings-panel {
  width: min(92vw, 440px);
  max-height: min(82vh, 720px);
  overflow-y: auto;
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.45);
  animation: settings-rise 0.2s ease;
}

@keyframes settings-rise {
  from {
    transform: translateX(-20px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.settings-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.settings-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.settings-close {
  border: 1px solid var(--border-glow);
  background: transparent;
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-close:hover {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.settings-section {
  margin-bottom: 1rem;
}

.settings-label {
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}

.settings-panel :deep(.class-tabs) {
  margin-bottom: 0;
}

.settings-panel :deep(.controls-bar) {
  flex-direction: column;
  align-items: stretch;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  gap: 1rem;
}

.settings-panel :deep(.control-group) {
  width: 100%;
  justify-content: space-between;
  flex-wrap: wrap;
}

.settings-panel :deep(.toggle-group) {
  justify-content: flex-start;
}

.settings-panel :deep(.control-label) {
  min-width: 90px;
}

.settings-panel :deep(.date-buttons),
.settings-panel :deep(.position-buttons),
.settings-panel :deep(.gender-buttons) {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.settings-panel :deep(.multiselect) {
  width: 100%;
}

.settings-panel :deep(.multiselect-btn) {
  width: 100%;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .settings-fab {
    width: 32px;
    height: 32px;
  }

  .settings-fab-icon {
    width: 1.05rem;
    height: 1.05rem;
  }

  .settings-overlay {
    padding: calc(1rem + env(safe-area-inset-top)) 1rem calc(1rem + env(safe-area-inset-bottom))
      calc(1rem + env(safe-area-inset-left));
  }
}
</style>
