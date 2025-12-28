<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <teleport to="#compare-trigger">
    <div class="compare-toggle-header">
      <span class="compare-tooltip" tabindex="0" aria-label="Compare mode help">
        i
        <span class="compare-tooltip-text">
          Select cards by clicking them first, then enable Compare to isolate them. When enabled, filter settings will be locked until Compare is disabled again.
        </span>
      </span>
      <label class="compare-toggle-switch">
        <input
          type="checkbox"
          :checked="modelValue"
          @change="emit('update:modelValue', $event.target.checked)"
        >
        <span class="compare-toggle-slider"></span>
      </label>
      <span class="compare-toggle-label" :class="{ active: modelValue }">Compare</span>
    </div>
  </teleport>
</template>

<style scoped>
.compare-toggle-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.compare-tooltip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.compare-tooltip:focus-visible {
  outline: 2px solid rgba(0, 212, 255, 0.6);
  outline-offset: 2px;
}

:global(:root[data-theme="light"] .compare-tooltip-text) {
  background: rgba(255, 255, 255, 0.95);
  color: #0a0e1a;
}

@keyframes compare-bounce {
  0% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-4px); }
  100% { transform: translateX(-50%) translateY(0); }
}

.compare-toggle-switch {
  position: relative;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.compare-toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.compare-toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--bg-dark);
  border: 1px solid var(--border-glow);
  border-radius: 999px;
  transition: all 0.3s ease;
}

.compare-toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  bottom: 2px;
  background: var(--text-secondary);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.compare-toggle-switch input:checked + .compare-toggle-slider {
  background: rgba(255, 215, 0, 0.2);
  border-color: var(--accent-gold);
}

.compare-toggle-switch input:checked + .compare-toggle-slider::before {
  transform: translateX(18px);
  background: var(--accent-gold);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.compare-toggle-label {
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: var(--text-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 0.2s ease;
}

.compare-toggle-label.active {
  color: var(--accent-gold);
}

@media (max-width: 768px) {
  .compare-toggle-switch {
    width: 36px;
    height: 20px;
  }

  .compare-toggle-slider::before {
    width: 14px;
    height: 14px;
  }

  .compare-toggle-switch input:checked + .compare-toggle-slider::before {
    transform: translateX(16px);
  }
}
</style>
