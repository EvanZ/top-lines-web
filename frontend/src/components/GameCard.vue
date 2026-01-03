<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Sparkline from './Sparkline.vue'
import SeasonPlayerCard from './SeasonPlayerCard.vue'

const props = defineProps({
  game: { type: Object, required: true },
  gender: { type: String, default: 'men' },
  selectedClasses: { type: Array, default: () => [] },
  rsciOnly: { type: Boolean, default: false },
  selectedConferences: { type: Array, default: () => [] },
  rankMap: { type: Object, default: null },
  seasonPlayersMap: { type: Object, default: null },
})

const placeholder = new URL('../assets/player-placeholder.svg', import.meta.url).href

const home = computed(() => props.game?.home || {})
const away = computed(() => props.game?.away || {})
const odds = computed(() => props.game?.odds || null)
const seasonPlayersMap = computed(() => (props.seasonPlayersMap instanceof Map ? props.seasonPlayersMap : null))

const featuredPlayers = computed(() => {
  const base = props.game?.featured_players || []
  if (!seasonPlayersMap.value) return base
  return base.map((p) => {
    const season = seasonPlayersMap.value.get(Number(p.player_id))
    if (!season) return p
    const merged = {
      ...p,
      ...season,
      player_id: Number(p.player_id) || season.player_id
    }
    if (!merged.headshot && season.headshot_href) {
      merged.headshot = season.headshot_href
    }
    if (!merged.display_name && season.display_name) {
      merged.display_name = season.display_name
    }
    return merged
  })
})
const powerMatchup = computed(() => home.value?.is_power || away.value?.is_power)
const activePlayer = ref(null)
const nowTs = ref(Date.now())
let timer = null
const teamLogoMap = computed(() => {
  const map = new Map()
  const hId = home.value?.team_id ?? home.value?.id
  const aId = away.value?.team_id ?? away.value?.id
  if (hId) map.set(Number(hId), home.value?.logo)
  if (aId) map.set(Number(aId), away.value?.logo)
  return map
})
const seasonPlayer = computed(() => {
  if (!activePlayer.value) return null
  const p = activePlayer.value
  const gp = Number(p.gp) || 1
  const ezGame = p.season_score ?? (p.ez != null && p.gp ? Number(p.ez) / Number(p.gp) : 0)
  const ez = Number.isFinite(ezGame) ? ezGame * gp : 0
  return {
    ...p,
    display_rank: p.class_rank,
    headshot_href: p.headshot,
    rsci_rank: p.recruit_rank,
    experience_display_value: p.class,
    position_display_name: p.position,
    team_conf: p.team_conf,
    team_location: p.team_location,
    team_id: p.team_id,
    sos: p.sos,
    gp,
    ez,
    team_poss: p.team_poss || 1,
    minutes: p.minutes || gp * 30,
    team_minutes: p.team_minutes || gp * 200,
    ez_struct: p.ez_struct || {},
    shooting: p.shooting || {},
    shots: p.shots || {},
    assisted_shots: p.assisted_shots || {},
    ez_history: p.ez_history || [],
  }
})

const startTimeLabel = computed(() => {
  const raw = props.game?.start_time
  if (!raw) return 'TBD'
  const dt = new Date(raw)
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
})

const startDateParts = computed(() => {
  const raw = props.game?.start_time
  if (!raw) return null
  const dt = new Date(raw)
  return {
    month: dt.toLocaleDateString('en-US', { month: 'short' }),
    day: dt.toLocaleDateString('en-US', { day: 'numeric' }),
  }
})

const conferenceLabel = computed(() => (
  props.game?.conference || home.value?.conference || away.value?.conference || '—'
))

const spreadLabel = computed(() => {
  if (!odds.value || odds.value.spread == null) return '—'
  const spread = Number(odds.value.spread)
  if (!Number.isFinite(spread)) return '—'
  const fav = odds.value.favorite
  const side = fav === 'home' ? (home.value?.abbrev || 'HOME') : fav === 'away' ? (away.value?.abbrev || 'AWAY') : ''
  const prefix = spread > 0 ? '+' : ''
  return side ? `${side} ${prefix}${spread}` : `${prefix}${spread}`
})

const venueLabel = computed(() => props.game?.venue || '')
const venueLocation = computed(() => {
  const city = props.game?.venue_city
  const state = props.game?.venue_state
  const country = props.game?.venue_country
  const locParts = [city, state].filter(Boolean)
  if (!locParts.length && country) locParts.push(country)
  return locParts.join(', ')
})
const venueLine = computed(() => {
  if (venueLabel.value && venueLocation.value) return `${venueLabel.value} — ${venueLocation.value}`
  return venueLabel.value || venueLocation.value || ''
})

const playerRankLabel = (player) => {
  const rank = Number(player?.overall_rank)
  if (Number.isFinite(rank) && rank > 0) return `EZ #${rank}`
  return 'EZ N/R'
}

const recordLabel = (team) => {
  const rec = team?.record
  if (rec?.wins != null && rec?.losses != null) return `${rec.wins}-${rec.losses}`
  return '—'
}

const filteredPlayers = computed(() => {
  const classSet = new Set((props.selectedClasses || []).map((c) => c.toLowerCase()))
  const confSet = new Set(props.selectedConferences || [])
  return featuredPlayers.value.filter((player) => {
    const cls = (player.class || '').toLowerCase()
    const conf = player.team_conf
    if (classSet.size && cls && !classSet.has(cls)) return false
    if (props.rsciOnly && !player.recruit_rank) return false
    if (confSet.size && conf && !confSet.has(conf)) return false
    return true
  })
})

const displayedPlayers = computed(() => {
  const rankLookup = props.rankMap instanceof Map ? props.rankMap : null
  const rank = (p) => {
    const pid = Number(p.player_id)
    const lookupRank = rankLookup ? rankLookup.get(pid) : undefined
    return lookupRank ?? p.display_rank ?? p.class_rank ?? p.overall_rank ?? 1e6
  }
  return [...filteredPlayers.value]
    .map((p) => {
      const r = rank(p)
      return {
        ...p,
        display_rank: r,
        class_rank: r,
      }
    })
    .sort((a, b) => (a.display_rank ?? 1e6) - (b.display_rank ?? 1e6))
})

const openPlayer = (player) => {
  // ensure we use the ranked instance so season ranks carry through
  const ranked = displayedPlayers.value.find((p) => p.player_id === player.player_id) || player
  activePlayer.value = ranked
}

const closePlayer = () => {
  activePlayer.value = null
}

const chipBg = (player) => {
  const logo =
    teamLogoMap.value.get(Number(player.team_id)) ||
    teamLogoMap.value.get(Number(player.team)) ||
    home.value.logo ||
    away.value.logo
  if (!logo) return {}
  return {
    backgroundImage: `linear-gradient(145deg, var(--card-overlay), var(--card-overlay)), url('${logo}')`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

const gameUrl = computed(() => {
  const id = props.game?.game_id
  if (!id) return ''
  const sport = props.gender === 'women' ? 'womens-college-basketball' : 'mens-college-basketball'
  return `https://www.espn.com/${sport}/game/_/gameId/${id}`
})

const handleCardClick = (event) => {
  if (activePlayer.value) return
  if (event?.target?.closest('.player-chip')) return
  if (!gameUrl.value) return
  window.open(gameUrl.value, '_blank', 'noopener')
}

const isLive = computed(() => {
  const raw = props.game?.start_time
  if (!raw) return false
  const start = new Date(raw).getTime()
  if (!Number.isFinite(start)) return false
  const diff = nowTs.value - start
  return diff >= 0 && diff <= 3 * 60 * 60 * 1000
})

const isPast = computed(() => {
  const raw = props.game?.start_time
  if (!raw) return false
  const start = new Date(raw).getTime()
  if (!Number.isFinite(start)) return false
  const diff = nowTs.value - start
  return diff > 3 * 60 * 60 * 1000
})

onMounted(() => {
  timer = setInterval(() => {
    nowTs.value = Date.now()
  }, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <article class="game-card" :class="{ power: powerMatchup, flipped: !!activePlayer, live: isLive, past: isPast }">
    <div class="card-shell">
      <!-- Front -->
      <div class="card-face front" @click="handleCardClick">
        <header class="card-header">
          <div class="time-block">
            <span class="time">{{ startTimeLabel }}</span>
            <span v-if="startDateParts" class="game-date-badge">
              <span class="date-month">{{ startDateParts.month }}</span>
              <span class="date-day">{{ startDateParts.day }}</span>
            </span>
          </div>
          <div class="conference-pill" :class="{ power: powerMatchup }">
            {{ conferenceLabel }}
          </div>
          <div class="meta-right">
            <span v-if="game.broadcast" class="pill broadcast">{{ game.broadcast }}</span>
            <span v-if="game.neutral_site" class="pill neutral">Neutral</span>
          </div>
        </header>

        <div class="teams-row">
          <div class="team">
            <div class="logo" :style="{ backgroundImage: `url('${home.logo || ''}')` }">
              <span v-if="!home.logo" class="logo-fallback">{{ home.abbrev || home.location || 'Home' }}</span>
            </div>
            <div class="team-copy">
              <div
                class="team-name"
                :title="home.location || home.name || home.abbrev || home.short_name || 'Home'"
              >
                {{ home.abbrev || home.short_name || home.location || home.name || 'Home' }}
              </div>
              <div class="team-sub">
                <!-- <span class="abbr">{{ home.abbrev || 'HOME' }}</span> -->
                <span class="record">{{ recordLabel(home) }}</span>
              </div>
            </div>
          </div>
          <div class="versus">
            <span class="vs">vs</span>
            <span v-if="spreadLabel !== '—'" class="spread">{{ spreadLabel }}</span>
          </div>
          <div class="team align-right">
            <div class="team-copy align-right">
              <div
                class="team-name"
                :title="away.location || away.name || away.abbrev || away.short_name || 'Away'"
              >
                {{ away.abbrev || away.short_name || away.location || away.name || 'Away' }}
              </div>
              <div class="team-sub">
                <span class="record">{{ recordLabel(away) }}</span>
                <!-- <span class="abbr">{{ away.abbrev || 'AWAY' }}</span> -->
              </div>
            </div>
            <div class="logo" :style="{ backgroundImage: `url('${away.logo || ''}')` }">
              <span v-if="!away.logo" class="logo-fallback">{{ away.abbrev || away.location || 'Away' }}</span>
            </div>
          </div>
        </div>

        <div v-if="venueLine" class="venue-line">
          {{ venueLine }}
          <span v-if="game.neutral_site" class="neutral-pill">Neutral</span>
        </div>

        <div class="players-grid" v-if="displayedPlayers.length">
          <button
            v-for="player in displayedPlayers"
            :key="player.player_id"
            class="player-chip"
            type="button"
            @click="openPlayer(player)"
          >
            <div class="player-chip-inner" :style="chipBg(player)">
              <div class="chip-rank">{{ player.display_rank ?? player.class_rank ?? player.overall_rank }}</div>
              <div class="headshot" :style="{ backgroundImage: `url('${player.headshot || placeholder}')` }">
                <span v-if="!player.headshot" class="initials">
                  {{ (player.display_name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() }}
                </span>
              </div>
            <div class="player-copy">
              <div class="player-name">{{ player.display_name }}</div>
              <div class="player-sub">
                {{ player.position || '—' }} • {{ player.class || '—' }}
              </div>
              <div v-if="player.ez_history?.length" class="sparkline-row">
                <Sparkline :values="player.ez_history" :height="24" />
              </div>
            </div>
          </div>
        </button>
      </div>
        <p v-else class="no-prospects">No ranked prospects matched for this game yet.</p>
      </div>

      <!-- Back -->
      <div class="card-face back">
        <div class="back-content" v-if="seasonPlayer">
          <button class="close-btn" type="button" @click="closePlayer" aria-label="Close">×</button>
          <div class="season-card-wrapper">
            <SeasonPlayerCard :player="seasonPlayer" :gender="gender" />
          </div>
        </div>
        <div v-else class="back-content empty">
          <p>Select a player to view season details.</p>
          <button class="close-btn" type="button" @click="closePlayer">Back</button>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.game-card {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 16px;
  padding: 0.75rem;
  display: block;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  perspective: 1200px;
}

.game-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
}

.game-card.power {
  border-color: var(--accent-gold);
  box-shadow: 0 16px 50px rgba(255, 215, 0, 0.1);
}

.game-card.live {
  animation: liveRock 5s ease-in-out infinite;
  border-color: var(--accent-cyan);
}

.game-card.past {
  opacity: 0.78;
  filter: grayscale(0.25);
}

@keyframes liveRock {
  0% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-1px) rotate(0.4deg); }
  50% { transform: translateY(0) rotate(-0.4deg); }
  75% { transform: translateY(-1px) rotate(0.3deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

.card-shell {
  position: relative;
  transform-style: preserve-3d;
  width: 100%;
  height: auto;
  overflow: visible;
}

.game-card.flipped .card-shell {
  min-height: 760px;
}

.game-card.flipped {
  border: none;
  padding: 0;
  background: var(--bg-card);
  box-shadow: none;
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  transition: transform 0.55s ease;
  background: transparent;
}

.card-face.front {
  position: relative;
  inset: auto;
  background: transparent;
  transform: rotateY(0deg);
  height: auto;
}

.game-card.flipped .card-face.front {
  transform: rotateY(180deg);
}

.card-face.back {
  transform: rotateY(-180deg);
  background: var(--bg-card);
  padding: 0;
}

.game-card.flipped .card-face.back {
  transform: rotateY(0deg);
}

.card-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
}

.time-block {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: 'Sora', sans-serif;
}

.time {
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.date {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.game-date-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  font-family: 'Sora', sans-serif;
  font-size: 0.58rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.08rem 0.3rem;
  border-radius: 7px;
  border: 1px solid var(--border-glow);
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  margin-left: 0.2rem;
}

.game-date-badge .date-month {
  color: var(--text-secondary);
  font-weight: 700;
  line-height: 1;
}

.game-date-badge .date-day {
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1;
}

.conference-pill {
  justify-self: center;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  background: rgba(0, 212, 255, 0.1);
  color: var(--accent-cyan);
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  border: 1px solid rgba(0, 212, 255, 0.3);
}

.conference-pill.power {
  background: rgba(255, 215, 0, 0.12);
  color: var(--accent-gold);
  border-color: rgba(255, 215, 0, 0.4);
}

.meta-right {
  display: flex;
  gap: 0.35rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.pill {
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.85rem;
  border: 1px solid var(--border-glow);
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.03);
}

.pill.broadcast {
  border-color: rgba(0, 212, 255, 0.35);
  color: var(--accent-cyan);
}

.pill.neutral {
  border-color: rgba(255, 136, 0, 0.35);
  color: var(--accent-orange);
}

.teams-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
}

.team {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.team.align-right {
  flex-direction: row-reverse;
  text-align: right;
}

.logo {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-glow);
}

.logo-fallback {
  font-weight: 800;
  color: var(--accent-gold);
}

.team-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.team-name {
  font-weight: 800;
  color: var(--text-primary);
  font-size: 1.05rem;
}

.team-sub {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
}

.abbr {
  font-weight: 700;
  color: var(--accent-cyan);
}

.record {
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glow);
}

.versus {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.vs {
  font-weight: 900;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}

.spread {
  font-size: 0.9rem;
  color: var(--accent-gold);
  padding: 0.2rem 0.5rem;
  border: 1px dashed rgba(255, 215, 0, 0.6);
  border-radius: 8px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.65rem;
  margin-top: 0.25rem;
  align-items: stretch;
}

.venue-line {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0.35rem 0 0 0.1rem;
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
}

.neutral-pill {
  border: 1px solid var(--border-glow);
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  color: var(--accent-cyan);
  font-weight: 700;
  font-size: 0.82rem;
}
.player-chip {
  cursor: pointer;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
}

.player-chip-inner {
  position: relative;
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  background: var(--bg-card);
  height: 100%;
  min-height: 110px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.55rem 0.75rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.chip-rank {
  position: absolute;
  top: 0.3rem;
  left: 0.35rem;
  background: rgba(255, 255, 255, 0.08);
  color: var(--accent-gold);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-weight: 900;
  font-size: 0.82rem;
  border: 1px solid rgba(255, 215, 0, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.player-chip:hover .player-chip-inner {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
}

.headshot {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background-size: cover;
  background-position: center;
  border: 2px solid var(--border-glow);
  display: grid;
  place-items: center;
  transition: box-shadow 0.25s ease, transform 0.2s ease;
}

.initials {
  font-weight: 800;
  color: var(--accent-gold);
}

.player-copy {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.player-name {
  font-weight: 800;
  color: var(--text-primary);
  font-size: 0.98rem;
}

.player-sub {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.sparkline-row {
  margin-top: 0.2rem;
}

.player-chip:hover .headshot {
  box-shadow: 0 0 0 2px var(--accent-cyan), 0 0 18px rgba(0, 212, 255, 0.35);
  transform: translateY(-2px);
}

.rank-line {
  font-weight: 800;
  color: var(--accent-gold);
}

.rank-meta {
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.no-prospects {
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
}

.back-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  padding: 0;
  overflow: auto;
}

.back-content.empty {
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  color: var(--text-secondary);
}

.back-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary);
}

.back-name {
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--text-primary);
}

.back-meta {
  color: var(--text-secondary);
}

.season-card-wrapper {
  flex: 1;
  overflow: auto;
}

.close-btn {
  border: 1px solid var(--border-glow);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  padding: 0.3rem 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  align-self: flex-start;
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
}

@media (max-width: 720px) {
  .card-header {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .conference-pill {
    justify-self: flex-start;
  }
  .teams-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .team.align-right {
    flex-direction: row;
    text-align: left;
  }
  .versus {
    flex-direction: row;
    justify-content: flex-start;
  }
}
</style>
