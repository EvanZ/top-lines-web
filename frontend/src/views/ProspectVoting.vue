<script setup>
import { ref, onMounted } from 'vue'
import VotingCard from '../components/VotingCard.vue'

const playerA = ref(null)
const playerB = ref(null)
const pool = ref([])
const loading = ref(true)
const submitting = ref(false)
const error = ref(null)
const eloError = ref(null)
const voteCount = ref(0)
const rankingsDate = ref(null)
const currentMatchupId = ref(null)
const eloRatings = ref([])
const eloMeta = ref(null)
const eloLoading = ref(true)

const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const dataBase = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '')
const voteEndpoint = `${apiBase}/api/vote`
const MAX_RSIC_RANK = 50
const ELO_MAX_ROWS = 50

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`

function normalizePlayer(p) {
  const weight = (p.display_weight || '').replace(/lbs?/i, '').trim()
  const birthplace = [p.city, p.state || p.country].filter(Boolean).join(', ')
  const ageRaw = Number(p.age_at_draft)
  const ageYears = Number.isFinite(ageRaw) ? (ageRaw > 100 ? ageRaw / 365.25 : ageRaw) : null
  const fmt = (val) => (typeof val === 'number' ? val.toFixed(1) : '—')

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
    birthplace,
    age: fmt(ageYears),
    ppg: fmt(p.ppg),
    rpg: fmt(p.rpg),
    apg: fmt(p.apg),
    spg: fmt(p.spg),
    tpg: fmt(p.tpg),
    bpg: fmt(p.bpg),
    rsci_rank: p.recruit_rank,
    ez: typeof p.ez === 'number' ? p.ez : null,
    recruit_rank: p.recruit_rank,
    classLower: (p.experience_display_value || '').toLowerCase()
  }
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
    eloRatings.value = (data.players || []).slice(0, ELO_MAX_ROWS)
  } catch (e) {
    console.error('Error loading Elo rankings:', e)
    eloError.value = e.message
    eloRatings.value = []
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

  const normalized = (data.players || []).map(normalizePlayer).filter(p => p.headshot)
  normalized.sort((a, b) => (b.ez || 0) - (a.ez || 0))

  // For testing, focus on RSCI freshmen
  const filtered = normalized.filter(
    (p) => p.classLower === 'freshman' && p.recruit_rank && p.recruit_rank <= MAX_RSIC_RANK
  )

  const selected = filtered.length > 0 ? filtered : normalized
  pool.value = selected.slice(0, 100) // keep a manageable pool
}

function pickMatchup() {
  if (pool.value.length < 2) {
    throw new Error('Not enough players to create a matchup')
  }

  const idxA = Math.floor(Math.random() * pool.value.length)
  let idxB = idxA
  while (idxB === idxA) {
    idxB = Math.floor(Math.random() * pool.value.length)
  }

  playerA.value = pool.value[idxA]
  playerB.value = pool.value[idxB]
  currentMatchupId.value = randomId()
}

async function vote(winnerId) {
  if (submitting.value || !playerA.value || !playerB.value) return
  submitting.value = true
  error.value = null

  try {
    const payload = {
      matchup_id: currentMatchupId.value || randomId(),
      player_a_id: playerA.value.id,
      player_b_id: playerB.value.id,
      winner_id: winnerId,
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
    pickMatchup()
  } catch (e) {
    console.error('Error submitting vote:', e)
    error.value = e.message || 'Unable to submit vote'
  } finally {
    submitting.value = false
  }
}

function skip() {
  if (submitting.value) return
  try {
    pickMatchup()
  } catch (e) {
    error.value = e.message
  }
}

async function initialize() {
  loading.value = true
  error.value = null
  eloLoading.value = true
  try {
    await Promise.all([loadPool(), loadEloRankings()])
    pickMatchup()
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
      
      <div v-else class="voting-matchup" :class="{ submitting }">
        <VotingCard 
          :player="playerA" 
          @vote="vote(playerA?.id)"
        />
        
        <VotingCard 
          :player="playerB" 
          @vote="vote(playerB?.id)"
        />
      </div>

      <button class="voting-skip" :disabled="submitting" @click="skip">
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
                <div class="elo-player">
                  <img v-if="p.headshot" :src="p.headshot" alt="" />
                  <div>
                    <div class="elo-name">{{ p.name }}</div>
                    <div class="elo-team">{{ p.team }}</div>
                  </div>
                </div>
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
  font-family: 'Orbitron', sans-serif;
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
  font-family: 'Share Tech Mono', monospace;
}

.voting-title {
  font-family: 'Orbitron', sans-serif;
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
  font-family: 'Share Tech Mono', monospace;
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
  font-family: 'Share Tech Mono', monospace;
}

.crowd-rankings {
  margin-top: 3rem;
}

.section-header h2 {
  font-family: 'Orbitron', sans-serif;
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
  font-family: 'Share Tech Mono', monospace;
}

.rankings-error {
  color: var(--accent-red);
  text-align: center;
  padding: 1rem;
  font-family: 'Share Tech Mono', monospace;
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
  font-family: 'Share Tech Mono', monospace;
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
  font-family: 'Share Tech Mono', monospace;
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
</style>
