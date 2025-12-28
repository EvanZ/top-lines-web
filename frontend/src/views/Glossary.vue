<script setup>
import { ref, onMounted, watch, inject } from 'vue'
import DailyPlayerCard from '../components/DailyPlayerCard.vue'
import SeasonPlayerCard from '../components/SeasonPlayerCard.vue'

const gender = inject('gender', ref('men'))
const dataBase = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '')
const DAILY_WINDOW = 3

const loading = ref(true)
const error = ref(null)
const dailyPlayer = ref(null)
const seasonPlayer = ref(null)
const dailyDate = ref(null)
const seasonDate = ref(null)
const dailyPlayers = ref([])
const seasonPlayers = ref([])

const percentileItem = {
  label: 'PCTL',
  formula: '100 * percent_rank() over (partition by class order by metric)'
}

const withPercentile = (items) => [...items, percentileItem]

const dailyGlossary = {
  ez: [
    { label: 'EZ', formula: 'round(REB + SCOR + PASS + STOCKS, 3) in stage_top_lines' },
    { label: 'EZ75', formula: 'round(75 * EZ * sgl.minutes / (minutes * poss), 1)' },
    { label: 'REB', formula: '0.6*ORB/adj_orb + 0.3*DRB/adj_drb' },
    { label: 'STOCKS', formula: '1.0*STL/adj_stl + 0.7*BLK/adj_blk' },
    { label: 'PASS', formula: '0.7*AST/adj_ast - 0.8*TOV/adj_tov' },
    { label: 'SCOR-1', formula: '0.3*(AST_DUNK/adj_ast_dunk + AST_MID/adj_ast_mid + AST_LAYUP/adj_ast_layup)' },
    { label: 'SCOR-2', formula: '1.0*(UNAST_DUNK/adj_unast_dunk + UNAST_LAYUP/adj_unast_layup + UNAST_MID/adj_unast_mid + UNAST_TIP)' },
    { label: 'SCOR-3', formula: '2.0*UNAST_3PT/adj_unast_3pt + 1.3*AST_3PT/adj_ast_3pt' },
    { label: 'SCOR-4', formula: '-0.7*(MISS_TIP + MISS_DUNK/adj_miss_dunk + MISS_LAYUP/adj_miss_layup + MISS_MID/adj_miss_mid + MISS_3PT/adj_miss_3pt)' },
    { label: 'SCOR-5', formula: '0.5*FTM - 0.5*(FTA-FTM) + 0.1*FTA/adj_fta + 0.1*(FGA/adj_fga - FG3A/adj_fg3a) + 0.2*FG3A/adj_fg3a' },
    { label: 'ADJ', formula: 'adj_* = team_adj.*_ortg * opp_adj.*_drtg (DRB/STL/BLK swap ortg/drtg)' }
  ],
  box: [
    { label: 'PTS', formula: 'FTM + 2*FGM + FG3M' },
    { label: 'AST', formula: 'Assists' },
    { label: 'TOV', formula: 'Turnovers' },
    { label: 'ORB', formula: 'Offensive rebounds' },
    { label: 'DRB', formula: 'Defensive rebounds' },
    { label: 'STL', formula: 'Steals' },
    { label: 'BLK', formula: 'Blocks' }
  ],
  rates: [
    { label: 'USG%', formula: '100 * (FGA + 0.44*FTA + TOV) * team_minutes / (minutes * team_FGA + 0.44*team_FTA + team_TOV)' },
    { label: 'TS%', formula: '100 * (FTM + 2*FGM + FG3M) / (2 * (FGA + 0.44*FTA))' },
    { label: 'PPP', formula: '(FTM + 2*FGM + FG3M) / (FGA + 0.44*FTA + TOV)' },
    { label: 'AST%', formula: '100 * AST * team_minutes / (minutes * (team_FGM - player_FGM))' },
    { label: 'TOV%', formula: '100 * TOV / (FGA + 0.44*FTA + TOV)' },
    { label: 'ORB%', formula: '100 * ORB * team_minutes / (minutes * (opp_DRB + team_ORB))' },
    { label: 'DRB%', formula: '100 * DRB * team_minutes / (minutes * (opp_ORB + team_DRB))' }
  ],
  shots: [
    { label: 'DUNK', formula: 'Dunk makes-attempts (unassisted in parentheses)' },
    { label: 'LAYUP', formula: 'Layup makes-attempts (unassisted in parentheses)' },
    { label: 'MID', formula: 'Midrange makes-attempts (unassisted in parentheses)' },
    { label: '2PT', formula: 'FG2M-FG2A (unassisted 2PT makes)' },
    { label: '3PT', formula: 'FG3M-FG3A (unassisted 3PT makes)' },
    { label: 'FT', formula: 'FTM-FTA' }
  ],
  assists: [
    { label: 'DNK AST', formula: 'Assists leading to dunk makes' },
    { label: 'LAY AST', formula: 'Assists leading to layup makes' },
    { label: 'MID AST', formula: 'Assists leading to midrange makes' },
    { label: '2PT AST', formula: 'Dunk + Layup + Mid assists' },
    { label: '3PT AST', formula: 'Assists leading to 3PT makes' }
  ]
}

const seasonGlossary = {
  ez: [
    { label: 'EZ', formula: 'EZ_TOTAL / GP (EZ_TOTAL = sum(ez) from stage_top_lines)' },
    { label: 'EZ75', formula: '75 * EZ_TOTAL / (team_poss * minutes / team_minutes)' },
    { label: 'OFF', formula: '75 * ez_scoring / (team_poss * minutes / team_minutes)' },
    { label: 'DEF', formula: '75 * ez_defense / (team_poss * minutes / team_minutes) (stocks)' },
    { label: 'PASS', formula: '75 * ez_passing / (team_poss * minutes / team_minutes)' },
    { label: 'REB', formula: '75 * ez_rebounding / (team_poss * minutes / team_minutes)' },
    { label: 'COMP', formula: 'ez_* components are sums of daily ez_components (same weights as Daily EZ)' }
  ],
  usage: [
    { label: 'GS', formula: 'Games started' },
    { label: 'GP', formula: 'Games played' },
    { label: 'MIN', formula: 'Total minutes' },
    { label: 'MPG', formula: 'Minutes / GP' },
    { label: 'TS%', formula: '100 * (FTM + 2*FGM + FG3M) / (2 * (FGA + 0.44*FTA))' },
    { label: 'USG%', formula: '100 * (FGA + 0.44*FTA + TOV) * team_minutes / (minutes * team_poss)' },
    { label: 'PPP', formula: '(FTM + 2*FGM + FG3M) / (FGA + 0.44*FTA + TOV)' }
  ],
  perGame: [
    { label: 'PTS', formula: '(2*FG2M + 3*(FGM - FG2M) + FTM) / GP' },
    { label: 'AST', formula: 'AST / GP' },
    { label: 'REB', formula: '(ORB + DRB) / GP' },
    { label: 'STL', formula: 'STL / GP' },
    { label: 'BLK', formula: 'BLK / GP' },
    { label: 'TOV', formula: 'TOV / GP' }
  ],
  shotMix: [
    { label: 'DNK', formula: 'Dunk makes-attempts (unassisted in parentheses)' },
    { label: 'DNK%', formula: '100 * dunk_makes / dunk_attempts' },
    { label: 'LAY', formula: 'Layup makes-attempts (unassisted in parentheses)' },
    { label: 'LAY%', formula: '100 * layup_makes / layup_attempts' },
    { label: 'MID', formula: 'Midrange makes-attempts (unassisted in parentheses)' },
    { label: 'MID%', formula: '100 * mid_makes / mid_attempts' }
  ],
  assistRates: [
    { label: 'DNK AST%', formula: '100 * ast_dunk / (ast_dunk + unast_dunk)' },
    { label: 'LAY AST%', formula: '100 * ast_layup / (ast_layup + unast_layup)' },
    { label: 'MID AST%', formula: '100 * ast_mid / (ast_mid + unast_mid)' },
    { label: '3PT AST%', formula: '100 * ast_3pt / (ast_3pt + unast_3pt)' }
  ],
  shooting: [
    { label: '2PT', formula: 'FG2M-FG2A' },
    { label: '2P%', formula: '100 * FG2M / FG2A' },
    { label: '3PT', formula: 'FG3M-FG3A' },
    { label: '3P%', formula: '100 * FG3M / FG3A' },
    { label: 'FT', formula: 'FTM-FTA' },
    { label: 'FT%', formula: '100 * FTM / FTA' },
    { label: 'FTR', formula: 'FTA / FGA' }
  ],
  passing: [
    { label: 'ASTR', formula: '100 * AST * team_minutes / (minutes * team_poss)' },
    { label: 'AST%', formula: '100 * AST * team_minutes / (minutes * (team_FGM - player_FGM))' },
    { label: 'TOR', formula: '100 * TOV * team_minutes / (minutes * team_poss)' },
    { label: 'TO%', formula: '100 * TOV / (FGA + 0.44*FTA + TOV)' },
    { label: 'ATR', formula: 'AST / TOV' }
  ],
  defense: [
    { label: 'ST%', formula: 'STL / GP' },
    { label: 'BK%', formula: 'BLK / GP' },
    { label: 'ORR', formula: 'ORB / GP' },
    { label: 'OR%', formula: '(ORB / minutes) * 40' },
    { label: 'DRR', formula: 'DRB / GP' },
    { label: 'DR%', formula: '(DRB / minutes) * 40' }
  ],
  assistDist: [
    { label: 'DNK AST', formula: 'Assists leading to dunk makes' },
    { label: 'DNK%', formula: '100 * dunk_ast / total_ast' },
    { label: 'LAY AST', formula: 'Assists leading to layup makes' },
    { label: 'LAY%', formula: '100 * layup_ast / total_ast' },
    { label: 'MID AST', formula: 'Assists leading to midrange makes' },
    { label: 'MID%', formula: '100 * mid_ast / total_ast' },
    { label: '3PT AST', formula: 'Assists leading to 3PT makes' },
    { label: '3PT%', formula: '100 * three_ast / total_ast' }
  ]
}

function normalizePlayer(player) {
  return {
    ...player,
    rsci_rank: player.recruit_rank,
    conference: player.team_conf,
    classLower: (player.experience_display_value || 'freshman').toLowerCase()
  }
}

function pickRandom(list) {
  if (!list.length) return null
  const idx = Math.floor(Math.random() * list.length)
  return list[idx]
}

function pickSamples() {
  dailyPlayer.value = pickRandom(dailyPlayers.value)
  seasonPlayer.value = pickRandom(seasonPlayers.value)
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function loadGlossary() {
  loading.value = true
  error.value = null
  try {
    const manifestResp = await fetch(`${dataBase}/manifest.json`)
    if (!manifestResp.ok) throw new Error(`Manifest HTTP ${manifestResp.status}`)
    const manifest = await manifestResp.json()
    const key = gender.value || 'men'
    const dailyList = manifest?.[key]?.daily || []
    const rankingsList = manifest?.[key]?.rankings || []
    dailyDate.value = dailyList[0] || manifest?.latest_date || null
    seasonDate.value = rankingsList[0] || manifest?.latest_date || null

    if (!dailyDate.value || !seasonDate.value) {
      throw new Error('No daily or season dates available in manifest')
    }

    const dailyUrl = `${dataBase}/${key}/daily/${dailyDate.value}_${DAILY_WINDOW}d.json`
    const seasonUrl = `${dataBase}/${key}/rankings/${seasonDate.value}.json`

    const [dailyResp, seasonResp] = await Promise.all([fetch(dailyUrl), fetch(seasonUrl)])
    if (!dailyResp.ok) throw new Error(`Daily report HTTP ${dailyResp.status}`)
    if (!seasonResp.ok) throw new Error(`Season report HTTP ${seasonResp.status}`)

    const dailyData = await dailyResp.json()
    const seasonData = await seasonResp.json()

    dailyPlayers.value = (dailyData.players || []).map(normalizePlayer)
    seasonPlayers.value = (seasonData.players || []).map(normalizePlayer)

    if (!dailyPlayers.value.length || !seasonPlayers.value.length) {
      throw new Error('No players found in daily or season reports')
    }

    pickSamples()
  } catch (e) {
    console.error('Error loading glossary data:', e)
    error.value = e.message
    dailyPlayer.value = null
    seasonPlayer.value = null
  } finally {
    loading.value = false
  }
}

watch(gender, loadGlossary)
onMounted(loadGlossary)
</script>

<template>
  <div class="glossary-view">
    <div class="page-header">
      <h1 class="page-title">Glossary</h1>
      <p class="page-subtitle">
        Definitions pulled from the analytics formulas, with live examples from the latest reports.
      </p>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      Loading glossary samples...
    </div>

    <div v-else-if="error" class="error">
      <p>Error loading glossary: {{ error }}</p>
      <p class="error-hint">Check that the manifest and report JSON files exist.</p>
    </div>

    <div v-else class="glossary-grid">
      <section class="glossary-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">Daily Report Sample</h2>
            <p class="section-subtitle">
              {{ formatDateDisplay(dailyDate) }} ({{ DAILY_WINDOW }}-day window)
            </p>
          </div>
          <span class="sample-tag">Random sample</span>
        </div>
        <DailyPlayerCard v-if="dailyPlayer" :player="dailyPlayer" :gender="gender">
          <template #glossary-after-ez>
            <div class="glossary-block">
              <div class="glossary-title">EZ Scores</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(dailyGlossary.ez)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-box>
            <div class="glossary-block">
              <div class="glossary-title">Box Score Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(dailyGlossary.box)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-rates>
            <div class="glossary-block">
              <div class="glossary-title">Efficiency + Usage Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(dailyGlossary.rates)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-shots>
            <div class="glossary-block">
              <div class="glossary-title">Shot Breakdown Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(dailyGlossary.shots)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-assists>
            <div class="glossary-block">
              <div class="glossary-title">Assist Targets Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(dailyGlossary.assists)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
        </DailyPlayerCard>
      </section>

      <section class="glossary-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">Season Rankings Sample</h2>
            <p class="section-subtitle">{{ formatDateDisplay(seasonDate) }} snapshot</p>
          </div>
          <span class="sample-tag">Random sample</span>
        </div>
        <SeasonPlayerCard v-if="seasonPlayer" :player="seasonPlayer" :gender="gender">
          <template #glossary-after-ez>
            <div class="glossary-block">
              <div class="glossary-title">EZ Scores</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(seasonGlossary.ez)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-usage>
            <div class="glossary-block">
              <div class="glossary-title">Usage + Pace Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(seasonGlossary.usage)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-pergame>
            <div class="glossary-block">
              <div class="glossary-title">Per-Game Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(seasonGlossary.perGame)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-shotmix>
            <div class="glossary-block">
              <div class="glossary-title">Rim + Midrange Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(seasonGlossary.shotMix)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-assist-rates>
            <div class="glossary-block">
              <div class="glossary-title">Assist Rate Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(seasonGlossary.assistRates)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-shooting>
            <div class="glossary-block">
              <div class="glossary-title">Shooting Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(seasonGlossary.shooting)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-passing>
            <div class="glossary-block">
              <div class="glossary-title">Passing Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(seasonGlossary.passing)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-defense>
            <div class="glossary-block">
              <div class="glossary-title">Stocks + Rebounding Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(seasonGlossary.defense)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #glossary-after-assist-distribution>
            <div class="glossary-block">
              <div class="glossary-title">Assist Distribution Row</div>
              <div class="glossary-items">
                <div v-for="item in withPercentile(seasonGlossary.assistDist)" :key="item.label" class="glossary-item">
                  <span class="glossary-key">{{ item.label }}</span>
                  <span class="glossary-formula">{{ item.formula }}</span>
                </div>
              </div>
            </div>
          </template>
        </SeasonPlayerCard>
      </section>
    </div>
  </div>
</template>

<style scoped>
.glossary-view {
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

.glossary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 2rem;
  align-items: start;
}

.glossary-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 0.2rem 0;
  color: var(--text-primary);
}

.section-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.sample-tag {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--border-glow);
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.2);
}

:root[data-theme='light'] .sample-tag {
  background: rgba(0, 0, 0, 0.04);
}

.glossary-block {
  margin: 0.6rem 0 0.9rem;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px dashed var(--border-glow);
  background: rgba(7, 13, 25, 0.5);
}

:root[data-theme='light'] .glossary-block {
  background: rgba(10, 14, 26, 0.04);
}

.glossary-title {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.glossary-items {
  display: grid;
  gap: 0.4rem;
}

.glossary-item {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 0.6rem;
  align-items: baseline;
}

.glossary-key {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--accent-gold);
  letter-spacing: 0.04em;
}

.glossary-formula {
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border-glow);
  border-top-color: var(--accent-cyan);
  animation: spin 1s linear infinite;
}

.error {
  background: rgba(255, 51, 102, 0.1);
  border: 1px solid rgba(255, 51, 102, 0.3);
  padding: 1rem;
  border-radius: 8px;
  color: var(--text-primary);
}

.error-hint {
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .sample-tag {
    align-self: flex-start;
  }
}
</style>
