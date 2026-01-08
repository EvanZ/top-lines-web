<script setup>
import { computed } from 'vue'

const props = defineProps({
  shots: { type: Object, default: () => ({}) },
})

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const safe = (n) => (Number.isFinite(n) ? n : 0)

const colorForPct = (pct) => {
  const t = clamp(pct, 0, 1)
  // Simple red -> yellow -> green gradient
  const r = t < 0.5 ? 230 : Math.round(230 - (t - 0.5) * 2 * 80)
  const g = t < 0.5 ? Math.round(100 + t * 2 * 155) : 180 + Math.round((t - 0.5) * 2 * 40)
  const b = t < 0.5 ? 70 : Math.round(70 + (t - 0.5) * 2 * 60)
  return `rgb(${r}, ${g}, ${b})`
}

const categoryStats = computed(() => {
  const s = props.shots || {}
  const dunkMade = safe(s.ast_dunk) + safe(s.unast_dunk)
  const dunkMiss = safe(s.miss_dunk)
  const layMade = safe(s.ast_layup) + safe(s.unast_layup)
  const layMiss = safe(s.miss_layup)
  const midMade = safe(s.ast_mid) + safe(s.unast_mid)
  const midMiss = safe(s.miss_mid)

  const twoAttRaw = safe(s.fg2a)
  const twoMadeRaw = safe(s.fg2m)
  const twoExtraAtt = Math.max(0, twoAttRaw - (dunkMade + dunkMiss + layMade + layMiss + midMade + midMiss))
  const twoExtraMade = Math.max(0, twoMadeRaw - (dunkMade + layMade + midMade))

  const threeAtt = safe(s.fg3a || s.fga - s.fg2a)
  const threeMade = safe(s.fg3m || s.fgm - s.fg2m)
  const ftAtt = safe(s.fta)
  const ftMade = safe(s.ftm)

  const attempts = {
    dunk: dunkMade + dunkMiss,
    layup: layMade + layMiss,
    two: twoExtraAtt + midMade + midMiss, // remaining twos
    three: threeAtt,
    ft: ftAtt,
  }
  const makes = {
    dunk: dunkMade,
    layup: layMade,
    two: twoExtraMade + midMade,
    three: threeMade,
    ft: ftMade,
  }
  const totalAtt = Object.values(attempts).reduce((a, b) => a + b, 0) || 1
  const totalLiveAtt = attempts.dunk + attempts.layup + attempts.two + attempts.three || 1

  return {
    attempts,
    makes,
    totalAtt,
    totalLiveAtt,
    pct: Object.fromEntries(
      Object.entries(attempts).map(([k, att]) => {
        const made = makes[k] || 0
        return [k, att > 0 ? made / att : 0]
      })
    ),
  }
})

const layout = computed(() => {
  const stats = categoryStats.value
  const share = (att) => (stats.totalLiveAtt ? att / stats.totalLiveAtt : 0)

  const baseRadius = 18
  const gap = 4
  let current = baseRadius

  const bands = ['layup', 'two', 'three'].map((key) => {
    const proportion = share(stats.attempts[key])
    const thickness = clamp(6 + proportion * 22, 6, 26)
    const inner = current
    const outer = current + thickness
    current = outer + gap
    return {
      key,
      inner,
      outer,
      color: colorForPct(stats.pct[key]),
    }
  })

  return {
    bands,
    dunkRadius: 6 + share(stats.attempts.dunk) * 6,
    ftRadius: 5 + (stats.totalAtt ? (stats.attempts.ft / stats.totalAtt) * 8 : 0),
  }
})

const arcPath = (inner, outer) => {
  const startOuter = `${-outer},0`
  const endOuter = `${outer},0`
  const startInner = `${-inner},0`
  const endInner = `${inner},0`
  return [
    `M ${startOuter}`,
    `A ${outer} ${outer} 0 0 1 ${outer} 0`,
    `L ${endInner}`,
    `A ${inner} ${inner} 0 0 0 ${-inner} 0`,
    'Z',
  ].join(' ')
}
</script>

<template>
  <svg class="shot-thumb" viewBox="-60 -10 120 90" aria-hidden="true">
    <!-- Court baseline -->
    <line x1="-50" x2="50" y1="0" y2="0" class="court-line" />
    <!-- Hoop -->
    <circle cx="0" cy="0" r="5" class="hoop" />

    <!-- Dunk at rim -->
    <circle
      :r="layout.dunkRadius"
      cx="0"
      cy="0"
      :fill="colorForPct(categoryStats.pct.dunk)"
      fill-opacity="0.28"
      stroke="none"
    />

    <!-- FT circle -->
    <circle
      cx="0"
      cy="-45"
      :r="layout.ftRadius"
      :fill="colorForPct(categoryStats.pct.ft)"
      fill-opacity="0.22"
      stroke="none"
    />

    <!-- Arcs -->
    <g v-for="band in layout.bands" :key="band.key">
      <path :d="arcPath(band.inner, band.outer)" :fill="band.color" fill-opacity="0.25" class="shot-band" />
      <path
        :d="arcPath(band.inner, band.outer)"
        fill="none"
        :stroke="band.color"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </g>
  </svg>
</template>

<style scoped>
.shot-thumb {
  width: 150px;
  height: 110px;
}
.court-line {
  stroke: rgba(255, 255, 255, 0.25);
  stroke-width: 1.5;
}
.hoop {
  stroke: var(--accent-gold);
  stroke-width: 1.5;
  fill: rgba(255, 215, 0, 0.35);
}
</style>
