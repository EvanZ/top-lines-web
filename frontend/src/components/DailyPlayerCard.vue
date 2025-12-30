<script setup>
import { computed } from 'vue'
const props = defineProps({ 
  player: Object,
  gender: { type: String, default: 'men' },
  showSeasonRank: { type: Boolean, default: false }
})
const p = computed(() => props.player)
const isRsci = computed(() => !!p.value.rsci_rank)
const hasElo = computed(() => p.value.elo_rating != null)
const seasonRank = computed(() => {
  const rank = Number(p.value.season_rank)
  return Number.isFinite(rank) && rank > 0 ? rank : null
})
const seasonRankLabel = computed(() => (
  seasonRank.value ? `EZ #${seasonRank.value}` : 'EZ N/R'
))
const espnPath = computed(() => props.gender === 'women' ? 'womens-college-basketball' : 'mens-college-basketball')
const pct = (val) => `pct-${Math.round(((val ?? 50) / 10)) * 10}`
const teamLogo = computed(() => p.value.team_logo)
const cleanShot = (val) => val?.replace(/&nbsp;/g, '\u00A0') || ''
const dateParts = computed(() => {
  const d = p.value.date
  if (!d) return null
  const date = new Date(d)
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: date.toLocaleDateString('en-US', { day: 'numeric' })
  }
})
const birthplace = computed(() => p.value.city && p.value.state ? `${p.value.city}, ${p.value.state}` : null)
const age = computed(() => p.value.age_at_draft ? (p.value.age_at_draft / 365.25).toFixed(1) : null)
</script>

<template>
  <div class="player-card border-percentiles" :class="{ rsci: isRsci }" :style="{ backgroundImage: `linear-gradient(var(--card-overlay), var(--card-overlay)), url('${teamLogo}')` }">
    <div class="card-rank-row">
      <span class="card-rank">{{ p.display_rank ?? p.class_rank }}<span v-if="p.notable" class="notable-up">{{ p.notable }}</span></span>
      <span class="game-rank">#{{ p.game_rank }}/{{ p.games }}</span>
      <div class="card-rank-meta">
        <span v-if="dateParts" class="game-date-badge">
          <span class="date-month">{{ dateParts.month }}</span>
          <span class="date-day">{{ dateParts.day }}</span>
        </span>
        <div class="ez-scores">
          <span class="ez-score" :class="pct(p.ez_struct?.ezpctile)">{{ p.ez_struct?.ez?.toFixed(1) }}</span>
          <span class="ez-score" :class="pct(p.ez_struct?.avgpctile)">{{ p.ez_struct?.avg?.toFixed(1) }}</span>
        </div>
      </div>
    </div>
    <div class="ez-labels"><span>Game</span><span>Season</span></div>
    <slot name="glossary-after-ez" />
    <div class="card-player-info">
      <a :href="`https://www.espn.com/${espnPath}/player/_/id/${p.player_id}`" class="player-link" target="_blank">
        <img :src="p.headshot_href" class="player-photo" :alt="p.display_name">
        <div class="player-name-photo"><span class="jersey">#{{ p.jersey }}</span> {{ p.display_name }}</div>
      </a>
      <div class="player-details">
        <div class="player-meta">
          {{ p.display_height }}<span v-if="p.display_weight">&nbsp;{{ p.display_weight }}</span><br>
          <span v-if="age">Age&nbsp;{{ age }}<br></span>
          {{ p.experience_display_value }} {{ p.position_display_name }}<br>
          <span v-if="birthplace">{{ birthplace }}<br></span>
          <span class="team">#{{ p.team_rank }} {{ p.team_location }}</span><br>
          <span v-if="p.team_conf">{{ p.team_conf }}</span><br>
        </div>
      </div>
      <div class="player-badges">
        <span v-if="isRsci" class="rsci-badge">#{{ p.rsci_rank }} RSCI</span>
        <span v-if="hasElo" class="elo-badge">Elo #{{ p.elo_rank }} • {{ p.elo_rating?.toFixed(0) }}</span>
        <span v-if="showSeasonRank" class="season-badge">{{ seasonRankLabel }}</span>
      </div>
    </div>
    <div class="game-info">
      {{ p.starter ? 'Started' : 'Off bench' }} {{ p.minutes }}min 
      <span :class="p.team_pts > p.opp_pts ? 'win' : 'loss'">{{ p.team_pts > p.opp_pts ? 'W' : 'L' }}</span>
      {{ p.home ? 'vs' : '@' }} <span class="opponent">#{{ p.opp_rank }} {{ p.opp_location }}</span>
      <a class="score-link" :href="`https://www.espn.com/${espnPath}/boxscore/_/gameId/${p.game_id}`" target="_blank">{{ p.team_pts }}-{{ p.opp_pts }}</a>
    </div>
    <table class="stats-table">
      <thead>
        <tr><th>pts</th><th>ast</th><th>tov</th><th>orb</th><th>drb</th><th>stl</th><th>blk</th></tr>
      </thead>
      <tbody>
        <tr>
          <td :class="pct(p.percentiles?.pts)">{{ p.usg_struct?.pts }}</td>
          <td :class="pct(p.percentiles?.ast)">{{ p.stats?.ast }}</td>
          <td :class="pct(p.percentiles?.tov)">{{ p.stats?.tov }}</td>
          <td :class="pct(p.percentiles?.orb)">{{ p.stats?.orb }}</td>
          <td :class="pct(p.percentiles?.drb)">{{ p.stats?.drb }}</td>
          <td :class="pct(p.percentiles?.stl)">{{ p.stats?.stl }}</td>
          <td :class="pct(p.percentiles?.blk)">{{ p.stats?.blk }}</td>
        </tr>
      </tbody>
    </table>
    <slot name="glossary-after-box" />
    <table class="stats-table">
      <thead>
        <tr><th>usg%</th><th>ts%</th><th>ppp</th><th>ast%</th><th>tov%</th><th>orb%</th><th>drb%</th></tr>
      </thead>
      <tbody>
        <tr>
          <td :class="pct(p.usg_struct?.usgpctile)">{{ p.usg_struct?.usg }}</td>
          <td :class="pct(p.usg_struct?.tspctile)">{{ p.usg_struct?.ts }}</td>
          <td :class="pct(p.usg_struct?.ppppctile)">{{ p.usg_struct?.ppp }}</td>
          <td :class="pct(p.usg_struct?.astpctpctile)">{{ p.usg_struct?.astpct }}</td>
          <td :class="pct(p.usg_struct?.tovpctpctile)">{{ p.usg_struct?.tovpct }}</td>
          <td :class="pct(p.usg_struct?.orbpctpctile)">{{ p.usg_struct?.orbpct }}</td>
          <td :class="pct(p.usg_struct?.drbpctpctile)">{{ p.usg_struct?.drbpct }}</td>
        </tr>
      </tbody>
    </table>
    <slot name="glossary-after-rates" />
    <table class="stats-table">
      <thead>
        <tr><th>dunk</th><th>layup</th><th>mid</th><th>2pt</th><th>3pt</th><th>ft</th></tr>
      </thead>
      <tbody>
        <tr>
          <td :class="pct(p.shots_struct?.dunkspctile)">{{ cleanShot(p.shots_struct?.dunks) }}</td>
          <td :class="pct(p.shots_struct?.layupspctile)">{{ cleanShot(p.shots_struct?.layups) }}</td>
          <td :class="pct(p.shots_struct?.midrangepctile)">{{ cleanShot(p.shots_struct?.midrange) }}</td>
          <td :class="pct(p.shots_struct?.twospctile)">{{ cleanShot(p.shots_struct?.twos) }}</td>
          <td :class="pct(p.shots_struct?.threespctile)">{{ cleanShot(p.shots_struct?.threes) }}</td>
          <td :class="pct(p.shots_struct?.ftspctile)">{{ p.shots_struct?.fts }}</td>
        </tr>
      </tbody>
    </table>
    <slot name="glossary-after-shots" />
    <template v-if="p.assists">
      <table class="stats-table assist-table">
        <thead>
          <tr><th>dnk ast</th><th>lay ast</th><th>mid ast</th><th>2pt ast</th><th>3pt ast</th></tr>
        </thead>
        <tbody>
          <tr>
            <td class="pct-50">{{ p.assists?.dunks }}</td>
            <td class="pct-50">{{ p.assists?.layups }}</td>
            <td class="pct-50">{{ p.assists?.midrange }}</td>
            <td class="pct-50">{{ (p.assists?.dunks || 0) + (p.assists?.layups || 0) + (p.assists?.midrange || 0) }}</td>
            <td class="pct-50">{{ p.assists?.threes }}</td>
          </tr>
        </tbody>
      </table>
      <slot name="glossary-after-assists" />
    </template>
  </div>
</template>

<style scoped>
@import '../assets/player-card.css';
</style>
