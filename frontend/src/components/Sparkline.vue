<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: { type: Array, default: () => [] },
  width: { type: Number, default: 110 },
  height: { type: Number, default: 28 }
})

const points = computed(() => {
  const vals = (props.values || [])
    .map(v => Number(v))
    .filter(v => Number.isFinite(v))
  if (vals.length === 0) return ''
  const min = 5
  const max = 15
  const range = max - min || 1
  const step = vals.length > 1 ? props.width / (vals.length - 1) : 0
  return vals
    .map((v, idx) => {
      const x = idx * step
      const y = props.height - ((v - min) / range) * props.height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const hasPoints = computed(() => points.value.length > 0)

const gridLines = computed(() => {
  const min = 5
  const max = 15
  const range = max - min || 1
  const values = [15, 10, 5]
  return values.map((value) => ({
    value,
    y: props.height - ((value - min) / range) * props.height
  }))
})

const labelLine = computed(() => {
  const target = gridLines.value.find((line) => line.value === 10)
  return target || null
})
</script>

<template>
  <svg
    v-if="gridLines.length"
    class="sparkline"
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g v-if="labelLine" class="sparkline-labels">
      <text :x="0" :y="labelLine.y - 2">
        {{ labelLine.value }}
      </text>
    </g>
    <g class="sparkline-grid">
      <line v-for="line in gridLines" :key="line.value" :x1="0" :x2="width" :y1="line.y" :y2="line.y" />
    </g>
    <polyline v-if="hasPoints" :points="points" />
  </svg>
</template>

<style scoped>
.sparkline {
  width: 6.5rem;
  height: 1.5rem;
  overflow: visible;
}

.sparkline polyline {
  fill: none;
  stroke: var(--accent-gold);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.8;
  filter: drop-shadow(0 0 6px rgba(255, 212, 0, 0.55));
}

.sparkline-grid line {
  stroke: rgba(255, 255, 255, 0.22);
  stroke-width: 1.25;
  stroke-dasharray: 2 3;
  shape-rendering: crispEdges;
}

.sparkline-labels text {
  fill: rgba(255, 255, 255, 0.65);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  text-transform: uppercase;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.35);
  stroke-width: 1.5px;
}

:global(:root[data-theme="light"] .sparkline-grid line) {
  stroke: rgba(0, 0, 0, 0.22);
}

:global(:root[data-theme="light"] .sparkline-labels text) {
  fill: rgba(0, 0, 0, 0.65);
  stroke: rgba(255, 255, 255, 0.55);
}
</style>
