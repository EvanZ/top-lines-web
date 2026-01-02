<script setup>
import { ref, computed, onMounted } from 'vue'
import VotingCard from '../components/VotingCard.vue'
import SeasonPlayerCard from '../components/SeasonPlayerCard.vue'
import { loadSharedFilters } from '../composables/useSharedFilters.js'

const playerA = ref(null)
const playerB = ref(null)
const pool = ref([])
const poolWeights = ref([])
const poolWeightTotal = ref(0)
const loading = ref(true)
const submitting = ref(false)
const shuffling = ref(false)
const error = ref(null)
const eloError = ref(null)
const voteCount = ref(0)
const rankingsDate = ref(null)
const currentMatchupId = ref(null)
const eloRatings = ref([])
const eloMeta = ref(null)
const eloLoading = ref(true)
const eloRatingsMap = ref(new Map())
const seasonPlayersById = ref(new Map())
const selectedSeasonPlayer = ref(null)
const seasonModalOpen = ref(false)

// Use saved SettingsDrawer filters to align ranks with the main app filters
const savedFilters = loadSharedFilters()
const selectedClasses = ref(
  Array.isArray(savedFilters.selectedClasses) && savedFilters.selectedClasses.length
    ? savedFilters.selectedClasses
    : ['freshman']
)
const rsciOnly = ref(!!savedFilters.rsciOnly)
const selectedConferences = ref(savedFilters.selectedConferences || [])
const selectedPosition = ref(savedFilters.selectedPosition || '')

const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const dataBase = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '')
const voteEndpoint = `${apiBase}/api/vote`
const EXP_TEMPERATURE = 0.25
const ELO_MAX_ROWS = 50
const MATCHUP_ACCEPT_MIN = 0.2
const MATCHUP_ACCEPT_ALPHA = 0.7
const MATCHUP_MAX_ATTEMPTS = 12
const TIER_1_CONF = new Set(['acc', 'bigten', 'big12', 'sec', 'bigeast'])
const TIER_2_CONF = new Set(['wcc', 'westcoast', 'mountainwest', 'atlantic10', 'a10'])
const CONF_TIER_WEIGHTS = {
  1: 1.0,
  2: 0.2,
  3: 0.01
}
const ELO_SCALE = 400

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`

const isLocked = computed(() => submitting.value || shuffling.value)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function normalizePlayer(p) {
  const weight = (p.display_weight || '').replace(/lbs?/i, '').trim()
  const birthplace = [p.city, p.state || p.country].filter(Boolean).join(', ')
  const ageRaw = Number(p.age_at_draft)
  const ageYears = Number.isFinite(ageRaw) ? (ageRaw > 100 ? ageRaw / 365.25 : ageRaw) : null
  const safeAge = Number.isFinite(ageYears) && ageYears > 0 ? ageYears : null
  const fmt = (val) => (typeof val === 'number' ? val.toFixed(1) : '—')
  const gp = Number(p.gp)
  const ezRaw = typeof p.ez === 'number' ? p.ez : null
  const ezPerGame = Number.isFinite(ezRaw) && Number.isFinite(gp) && gp > 0 ? ezRaw / gp : ezRaw

  return {
    id: p.player_id,
    name: p.display_name || p.full_name || 'Unknown',
    jersey: p.jersey,
    headshot: p.headshot_href,
    height: p.display_height || '—',
    weight: weight || '—',
    class: p.experience_display_value || '',
    position: p.position_display_name || '',
    team: p.team_location || p.team_name || '',
    conference: p.team_conf || '',
    birthplace,
    age: safeAge ? fmt(safeAge) : '—',
    ppg: fmt(p.ppg),
    rpg: fmt(p.rpg),
    apg: fmt(p.apg),
    spg: fmt(p.spg),
    tpg: fmt(p.tpg),
    bpg: fmt(p.bpg),
    rsci_rank: p.recruit_rank,
    ez: typeof p.ez === 'number' ? p.ez : null,
    ez_display: Number.isFinite(ezPerGame) ? ezPerGame : null,
    ez_pctile: p.ez_pctile,
    recruit_rank: p.recruit_rank,
    classLower: (p.experience_display_value || '').toLowerCase()
  }
}

function normalizeConference(value) {
  if (!value) return ''
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function conferenceTier(value) {
  const key = normalizeConference(value)
  if (TIER_1_CONF.has(key)) return 1
  if (TIER_2_CONF.has(key)) return 2
  return 3
}

function conferenceWeight(value) {
  const tier = conferenceTier(value)
  return CONF_TIER_WEIGHTS[tier] ?? CONF_TIER_WEIGHTS[3]
}

const combinedRankScore = (player) => {
  const gp = Number(player.gp)
  const ez = Number(player.ez)
  if (!Number.isFinite(gp) || gp <= 0) return 0
  return Number.isFinite(ez) ? ez / gp : 0
}

function getEzStats(players) {
  let min = Infinity
  let max = -Infinity
  for (const p of players) {
    if (!Number.isFinite(p.ez_display)) continue
    if (p.ez_display < min) min = p.ez_display
    if (p.ez_display > max) max = p.ez_display
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 }
  }
  return { min, max }
}

function buildWeights(players, temp) {
  const { min, max } = getEzStats(players)
  const range = max - min || 1
  const safeTemp = temp === 0 ? 0.0001 : temp
  const weights = players.map((p) => {
    const ez = Number.isFinite(p.ez_display) ? p.ez_display : min
    const ezNorm = Math.min(1, Math.max(0, (ez - min) / range))
    const confWeight = conferenceWeight(p.conference)
    const weight = Math.exp(ezNorm / safeTemp) * confWeight
    return Number.isFinite(weight) ? weight : 0
  })
  const total = weights.reduce((sum, w) => sum + w, 0)
  return { weights, total }
}

function rebuildWeights() {
  if (!pool.value.length) {
    poolWeights.value = []
    poolWeightTotal.value = 0
    return
  }
  const { weights, total } = buildWeights(pool.value, EXP_TEMPERATURE)
  poolWeights.value = weights
  poolWeightTotal.value = total
}

function pickWeightedIndex(excludeIndex = null) {
  if (!pool.value.length || poolWeightTotal.value <= 0) return null
  let total = poolWeightTotal.value
  if (excludeIndex !== null && poolWeights.value[excludeIndex] != null) {
    total -= poolWeights.value[excludeIndex]
  }
  if (total <= 0) return null
  let r = Math.random() * total
  for (let i = 0; i < poolWeights.value.length; i += 1) {
    if (i === excludeIndex) continue
    r -= poolWeights.value[i]
    if (r <= 0) return i
  }
  return null
}

function displayProbForIndex(idx) {
  if (idx == null || poolWeightTotal.value <= 0) return null
  const weight = poolWeights.value[idx]
  if (!Number.isFinite(weight) || weight <= 0) return null
  return weight / poolWeightTotal.value
}

function expectedEloProb(ratingA, ratingB) {
  if (!Number.isFinite(ratingA) || !Number.isFinite(ratingB)) return null
  const diff = (ratingB - ratingA) / ELO_SCALE
  return 1 / (1 + 10 ** diff)
}

function acceptanceProbability(probA) {
  if (!Number.isFinite(probA)) return 1
  const p = Math.min(1, Math.max(0, probA))
  const info = 4 * p * (1 - p)
  const shaped = Math.pow(info, MATCHUP_ACCEPT_ALPHA)
  return MATCHUP_ACCEPT_MIN + (1 - MATCHUP_ACCEPT_MIN) * shaped
}

function buildMatchupFromIndices(idxA, idxB) {
  const probA = displayProbForIndex(idxA)
  const probB = displayProbForIndex(idxB)
  const ratingA = eloRatingsMap.value.get(pool.value[idxA]?.id)
  const ratingB = eloRatingsMap.value.get(pool.value[idxB]?.id)
  const eloProbA = expectedEloProb(ratingA, ratingB)
  const eloProbB = Number.isFinite(eloProbA) ? 1 - eloProbA : null

  return {
    eloProbA,
    playerA: {
      ...pool.value[idxA],
      display_prob: probA,
      seed_rating: ratingA,
      elo_prob: eloProbA
    },
    playerB: {
      ...pool.value[idxB],
      display_prob: probB,
      seed_rating: ratingB,
      elo_prob: eloProbB
    }
  }
}

function pickRandomIndex(excludeIndex = null) {
  if (pool.value.length < 1) return null
  if (excludeIndex === null) return Math.floor(Math.random() * pool.value.length)
  const max = pool.value.length - 1
  if (max <= 0) return null
  const idx = Math.floor(Math.random() * max)
  return idx >= excludeIndex ? idx + 1 : idx
}

async function loadEloRankings() {
  eloLoading.value = true
  eloError.value = null
  try {
    const manifestResp = await fetch(`${dataBase}/manifest.json`)
    if (!manifestResp.ok) throw new Error('Unable to load manifest for Elo')
    const manifest = await manifestResp.json()
    const eloPath = manifest?.men?.elo_rankings
    if (!eloPath) {
      eloRatings.value = []
      eloMeta.value = null
      return
    }
    const resp = await fetch(`${dataBase}/men/${eloPath}`)
    if (!resp.ok) throw new Error(`Unable to load Elo rankings: HTTP ${resp.status}`)
    const data = await resp.json()
    eloMeta.value = data.meta || null
    const players = Array.isArray(data.players) ? data.players : []
    eloRatings.value = players.slice(0, ELO_MAX_ROWS)
    const map = new Map()
    players.forEach((player) => {
      const rating = Number(player.rating)
      if (player.player_id && Number.isFinite(rating)) {
        map.set(player.player_id, rating)
      }
    })
    eloRatingsMap.value = map
  } catch (e) {
    console.error('Error loading Elo rankings:', e)
    eloError.value = e.message
    eloRatings.value = []
    eloRatingsMap.value = new Map()
  } finally {
    eloLoading.value = false
  }
}

async function loadPool() {
  // Find the latest rankings snapshot from the manifest
  const manifestResp = await fetch(`${dataBase}/manifest.json`)
  if (!manifestResp.ok) throw new Error('Unable to load manifest')
  const manifest = await manifestResp.json()
  const date = manifest?.men?.rankings?.[0] || manifest?.latest_date
  if (!date) throw new Error('No rankings available for voting')
  rankingsDate.value = date

  const rankingsResp = await fetch(`${dataBase}/men/rankings/${date}.json`)
  if (!rankingsResp.ok) throw new Error(`Unable to load rankings for ${date}`)
  const data = await rankingsResp.json()

  const seasonMap = new Map()
  ;(data.players || []).forEach((player) => {
    if (player?.player_id) {
      seasonMap.set(player.player_id, player)
    }
  })
  seasonPlayersById.value = seasonMap

  const normalized = (data.players || []).map(normalizePlayer).filter(p => p.id)
  normalized.sort((a, b) => (b.ez || 0) - (a.ez || 0))

  pool.value = normalized
  rebuildWeights()
}

const filteredSeasonPlayers = computed(() => {
  const classSet = new Set((selectedClasses.value || []).map((c) => c.toLowerCase()))
  const confSet = new Set(selectedConferences.value || [])
  const pos = selectedPosition.value || ''
  const base = Array.from(seasonPlayersById.value.values()).filter((p) => {
    const cls = (p.experience_display_value || '').toLowerCase()
    const conf = p.team_conf
    if (classSet.size && !classSet.has(cls)) return false
    if (rsciOnly.value && !p.recruit_rank) return false
    if (confSet.size && !confSet.has(conf)) return false
    if (pos && p.position_display_name !== pos) return false
    return true
  })
  if ((selectedClasses.value || []).length > 1) {
    return [...base].sort((a, b) => combinedRankScore(b) - combinedRankScore(a))
  }
  return [...base].sort((a, b) => (a.class_rank ?? 1e6) - (b.class_rank ?? 1e6))
})

const filteredRankMap = computed(() => {
  const map = new Map()
  filteredSeasonPlayers.value.forEach((p, idx) => {
    const pid = Number(p.player_id)
    if (Number.isFinite(pid)) {
      map.set(pid, idx + 1)
    }
  })
  return map
})

function pickMatchupCandidate() {
  if (pool.value.length < 2) {
    throw new Error('Not enough players to create a matchup')
  }

  const idxA = pickWeightedIndex() ?? pickRandomIndex()
  let idxB = pickWeightedIndex(idxA)
  if (idxB == null) {
    idxB = pickRandomIndex(idxA)
  }
  if (idxA == null || idxB == null) {
    throw new Error('Not enough players to create a matchup')
  }
  return buildMatchupFromIndices(idxA, idxB)
}

function pickRandomMatchup() {
  const idxA = pickRandomIndex()
  const idxB = pickRandomIndex(idxA)
  if (idxA == null || idxB == null) return null
  return buildMatchupFromIndices(idxA, idxB)
}

function pickMatchup() {
  let candidate = null
  let attempts = 0
  for (let attempt = 0; attempt < MATCHUP_MAX_ATTEMPTS; attempt += 1) {
    attempts = attempt + 1
    candidate = pickMatchupCandidate()
    const acceptProb = acceptanceProbability(candidate?.eloProbA)
    if (Math.random() <= acceptProb) break
  }
  if (!candidate) {
    throw new Error('Not enough players to create a matchup')
  }
  console.log('[voting] matchup attempts:', attempts)
  return candidate
}

async function applyMatchup({ shuffle }) {
  const final = pickMatchup()
  if (!shuffle) {
    playerA.value = final.playerA
    playerB.value = final.playerB
    currentMatchupId.value = randomId()
    return
  }

  const shuffleCount = Math.floor(Math.random() * 4) + 3
  const totalMs = 500 + (shuffleCount - 3) * 333
  const frameMs = Math.max(80, Math.round(totalMs / shuffleCount))

  shuffling.value = true
  for (let i = 0; i < shuffleCount; i += 1) {
    const temp = pickRandomMatchup()
    if (temp) {
      playerA.value = temp.playerA
      playerB.value = temp.playerB
    }
    await sleep(frameMs)
  }
  playerA.value = final.playerA
  playerB.value = final.playerB
  currentMatchupId.value = randomId()
  shuffling.value = false
}

async function vote(winnerId) {
  if (isLocked.value || !playerA.value || !playerB.value) return
  submitting.value = true
  error.value = null

  try {
    const impressionProbA = typeof playerA.value?.display_prob === 'number'
      ? Number(playerA.value.display_prob.toFixed(4))
      : null
    const impressionProbB = typeof playerB.value?.display_prob === 'number'
      ? Number(playerB.value.display_prob.toFixed(4))
      : null
    const payload = {
      matchup_id: currentMatchupId.value || randomId(),
      player_a_id: playerA.value.id,
      player_b_id: playerB.value.id,
      winner_id: winnerId,
      seed_rating_a: Number.isFinite(playerA.value?.seed_rating) ? playerA.value.seed_rating : null,
      seed_rating_b: Number.isFinite(playerB.value?.seed_rating) ? playerB.value.seed_rating : null,
      elo_prob_a: typeof playerA.value?.elo_prob === 'number'
        ? Number(playerA.value.elo_prob.toFixed(4))
        : null,
      elo_prob_b: typeof playerB.value?.elo_prob === 'number'
        ? Number(playerB.value.elo_prob.toFixed(4))
        : null,
      impression_prob_a: impressionProbA,
      impression_prob_b: impressionProbB,
      gender: 'men',
      client_version: 'web-voting-0.1.0'
    }

    const resp = await fetch(voteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!resp.ok) {
      let detail = ''
      try {
        const text = await resp.text()
        detail = text
      } catch (_) {
        // ignore parse errors
      }
      throw new Error(`Vote failed: HTTP ${resp.status}${detail ? ` — ${detail}` : ''}`)
    }

    voteCount.value += 1
    await applyMatchup({ shuffle: true })
  } catch (e) {
    console.error('Error submitting vote:', e)
    error.value = e.message || 'Unable to submit vote'
  } finally {
    submitting.value = false
  }
}

async function skip() {
  if (isLocked.value) return
  try {
    await applyMatchup({ shuffle: true })
  } catch (e) {
    error.value = e.message
  }
}

function openSeasonModal(playerId) {
  const player = seasonPlayersById.value.get(playerId)
  if (!player) {
    console.warn('No season player data found for', playerId)
    return
  }
  const filteredRank = filteredRankMap.value.get(Number(playerId))
  selectedSeasonPlayer.value = {
    ...player,
    display_rank: filteredRank ?? player.display_rank ?? player.class_rank
  }
  seasonModalOpen.value = true
}

function closeSeasonModal() {
  seasonModalOpen.value = false
  selectedSeasonPlayer.value = null
}

async function initialize() {
  loading.value = true
  error.value = null
  eloLoading.value = true
  try {
    await Promise.all([loadPool(), loadEloRankings()])
    await applyMatchup({ shuffle: false })
  } catch (e) {
    console.error('Error initializing voting:', e)
    error.value = e.message
  } finally {
    loading.value = false
    eloLoading.value = false
  }
}

onMounted(() => {
  initialize()
})

</script>

<template>
  <div class="prospect-voting">
    <div class="page-header">
      <h1 class="page-title">Prospect Voting</h1>
      <p class="page-subtitle">
        Men&apos;s prospects only for now — sourced from season rankings ({{ rankingsDate || 'loading...' }})
      </p>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <div class="voting-container">
      <h2 class="voting-title">Who's the better prospect?</h2>
      <p class="voting-subtitle">
        Click the better prospect. Votes are stored anonymously and will feed the Elo leaderboard.
      </p>

      <div v-if="loading" class="loading">Loading matchup...</div>
      
      <div v-else class="voting-matchup" :class="{ submitting: isLocked }">
        <VotingCard 
          :player="playerA" 
          @vote="vote(playerA?.id)"
        />
        
        <VotingCard 
          :player="playerB" 
          @vote="vote(playerB?.id)"
        />
      </div>

      <button class="voting-skip" :disabled="isLocked" @click="skip">
        Skip (I can't decide)
      </button>

      <p v-if="voteCount > 0" class="vote-count">
        Thanks! Votes recorded: {{ voteCount }}
      </p>
    </div>

    <div class="crowd-rankings">
      <div class="section-header">
        <h2>Crowd Rankings (Elo)</h2>
      </div>
      <p v-if="eloError" class="rankings-error">{{ eloError }}</p>
      <p v-else-if="eloLoading" class="rankings-note">Loading Elo rankings...</p>
      <p v-else-if="!eloRatings.length" class="rankings-note">No Elo rankings yet. Cast votes to see results.</p>
      
      <div v-else class="elo-table-wrapper">
        <div class="elo-meta">
          <span>Players: {{ eloRatings.length }}</span>
          <span v-if="eloMeta?.total_votes">Votes: {{ eloMeta.total_votes }}</span>
          <span v-if="eloMeta?.distinct_voters != null">Voters: {{ eloMeta.distinct_voters }}</span>
          <span v-if="eloMeta?.generated_at">Updated: {{ eloMeta.generated_at }}</span>
        </div>
        <table class="elo-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Rating</th>
              <th>W-L</th>
              <th>RSCI</th>
              <th>Class</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, idx) in eloRatings" :key="p.player_id">
              <td>{{ idx + 1 }}</td>
              <td>
                <button
                  type="button"
                  class="elo-player"
                  @click="openSeasonModal(p.player_id)"
                >
                  <img v-if="p.headshot" :src="p.headshot" alt="" />
                  <div>
                    <div class="elo-name">{{ p.name }}</div>
                    <div class="elo-team">{{ p.team }}</div>
                  </div>
                </button>
              </td>
              <td>{{ p.rating?.toFixed(1) }}</td>
              <td>{{ p.wins }}-{{ p.losses }}</td>
              <td>{{ p.recruit_rank || '—' }}</td>
              <td>{{ p.class || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="seasonModalOpen"
        class="season-modal-backdrop"
        @click.self="closeSeasonModal"
      >
        <div class="season-modal">
          <button class="season-modal-close" type="button" @click="closeSeasonModal">×</button>
          <SeasonPlayerCard
            v-if="selectedSeasonPlayer"
            :player="selectedSeasonPlayer"
            gender="men"
          />
          <div v-else class="season-modal-empty">Season card unavailable.</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.prospect-voting {
  padding: 1rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-family: 'Sora', sans-serif;
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-gold));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0;
}

.voting-container {
  text-align: center;
  margin: 2rem 0;
}



.error-banner {
  border: 1px solid var(--accent-red);
  background: rgba(255, 51, 102, 0.1);
  color: var(--accent-red);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
  font-family: 'Sora', sans-serif;
}

.voting-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.voting-subtitle {
  color: var(--text-secondary);
  margin: 0 0 2rem 0;
}

.voting-matchup {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.voting-matchup.submitting {
  opacity: 0.6;
  pointer-events: none;
}

.voting-skip {
  margin-top: 2rem;
  padding: 0.75rem 2rem;
  background: transparent;
  border: 1px solid var(--border-glow);
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.voting-skip:hover {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.voting-skip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.vote-count {
  margin-top: 1rem;
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
}

.crowd-rankings {
  margin-top: 3rem;
}

.section-header h2 {
  font-family: 'Sora', sans-serif;
  font-size: 1.3rem;
  color: var(--text-primary);
  border-bottom: 2px solid var(--border-glow);
  padding-bottom: 0.5rem;
}

.rankings-note {
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: 2rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
}

.rankings-error {
  color: var(--accent-red);
  text-align: center;
  padding: 1rem;
  font-family: 'Sora', sans-serif;
}

.elo-table-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.elo-meta {
  display: flex;
  gap: 1rem;
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.elo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.elo-table th,
.elo-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-glow);
}

.elo-table th {
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.elo-table tbody tr:hover {
  background: var(--bg-card-hover);
}

.elo-player {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  text-align: left;
  padding: 0;
  font: inherit;
}

.elo-player img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border-glow);
  object-fit: cover;
}

.elo-name {
  font-weight: 700;
}

.elo-team {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.season-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(3, 6, 12, 0.75);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.season-modal {
  position: relative;
  max-width: min(90vw, 520px);
  padding-top: 0.5rem;
}

.season-modal-close {
  position: absolute;
  top: -0.6rem;
  right: -0.2rem;
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 999px;
  width: 2rem;
  height: 2rem;
  color: var(--text-primary);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
}

.season-modal-empty {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  padding: 2rem;
}
</style>
