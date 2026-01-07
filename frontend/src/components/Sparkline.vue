<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: { type: Array, default: () => [] },
  width: { type: Number, default: 110 },
  height: { type: Number, default: 28 }
})

const strokeColor = '#ffd700'
const MIN_VAL = 5
const MAX_VAL = 15
const RANGE = MAX_VAL - MIN_VAL || 1
const GRID_VALUES = [15, 10, 5]
const gridStroke = 'rgba(255, 255, 255, 0.28)'
const gridStrokeLight = 'rgba(0, 0, 0, 0.22)'
const labelFill = 'rgba(255, 255, 255, 0.82)'
const labelStroke = 'rgba(0, 0, 0, 0.35)'
const labelFillLight = 'rgba(0, 0, 0, 0.75)'
const labelStrokeLight = 'rgba(255, 255, 255, 0.65)'

const parsedValues = computed(() =>
  (props.values || [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
)

const points = computed(() => {
  const vals = parsedValues.value
  if (!vals.length) return ''
  const step = vals.length > 1 ? props.width / (vals.length - 1) : 0
  return vals
    .map((v, idx) => {
      const x = idx * step
      const y = props.height - ((v - MIN_VAL) / RANGE) * props.height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const hasPoints = computed(() => points.value.length > 0)

const gridLines = computed(() => GRID_VALUES.map((value) => ({
  value,
  y: props.height - ((value - MIN_VAL) / RANGE) * props.height,
})))

const labelLine = computed(() => gridLines.value.find((line) => line.value === 10) || null)
</script>

<template>
  <svg
    v-if="gridLines.length"
    class="sparkline"
    xmlns="http://www.w3.org/2000/svg"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g v-if="labelLine" class="sparkline-labels">
      <text
        :x="0"
        :y="labelLine.y - 2"
        :fill="labelFill"
        :stroke="labelStroke"
        stroke-width="1.5"
        font-family="Sora, sans-serif"
        font-size="10"
        font-weight="700"
        text-transform="uppercase"
      >
        {{ labelLine.value }}
      </text>
    </g>
    <g class="sparkline-grid">
      <line
        v-for="line in gridLines"
        :key="line.value"
        :x1="0"
        :x2="width"
        :y1="line.y"
        :y2="line.y"
        stroke-width="1.25"
        stroke-dasharray="2 3"
        :stroke="gridStroke"
        shape-rendering="crispEdges"
      />
    </g>
    <polyline
      v-if="hasPoints"
      :points="points"
      :stroke="strokeColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2.5"
      stroke-opacity="0.95"
      fill="none"
    />
  </svg>
</template>

<style scoped>
.sparkline {
  width: 6.5rem;
  height: 1.5rem;
  overflow: visible;
}

:global(:root[data-theme="light"] .sparkline-grid line) {
  stroke: rgba(0, 0, 0, 0.22);
}

:global(:root[data-theme="light"] .sparkline-labels text) {
  fill: rgba(0, 0, 0, 0.75);
  stroke: rgba(255, 255, 255, 0.65);
}
</style>
