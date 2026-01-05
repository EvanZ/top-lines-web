<script setup>
import { computed } from 'vue'

const props = defineProps({
  date: { type: String, required: true },
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const parsed = computed(() => {
  if (!props.date) return null
  const d = new Date(`${props.date}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
})

const monthLabel = computed(() => parsed.value?.toLocaleDateString('en-US', { month: 'short' }) || props.date)
const dayLabel = computed(() => {
  const d = parsed.value
  if (!d) return ''
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const dayNum = d.getDate()
  return `${weekday} ${dayNum}`
})
</script>

<template>
  <button
    type="button"
    class="date-pill"
    :class="{ active }"
    @click="emit('select', date)"
  >
    <span class="pill-month">{{ monthLabel }}</span>
    <span class="pill-day">{{ dayLabel }}</span>
  </button>
</template>

<style scoped>
.date-pill {
  border: 1px solid var(--border-glow);
  background: var(--bg-card);
  color: var(--text-primary);
  border-radius: 12px;
  padding: 0.35rem 0.85rem;
  cursor: pointer;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  min-width: 90px;
  transition: transform 0.15s ease, border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
  font-family: 'Sora', sans-serif;
}

.date-pill:hover {
  transform: translateY(-2px);
  background: rgba(0, 212, 255, 0.12);
}

.date-pill.active {
  border-color: var(--accent-gold);
  color: var(--text-primary);
  background: rgba(255, 215, 0, 0.18);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.25);
}

.pill-month {
  font-weight: 500;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  line-height: 1.1;
}

.pill-day {
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.2;
  font-weight: 600;
}
</style>
