<script setup>
  import { computed } from 'vue'
  const props = defineProps({ 
    player: Object,
    gender: { type: String, default: 'men' }
  })
  const p = computed(() => props.player)
  const isRsci = computed(() => !!p.value.rsci_rank)
  const hasElo = computed(() => p.value.elo_rating != null)
  const espnPath = computed(() => props.gender === 'women' ? 'womens-college-basketball' : 'mens-college-basketball')
  const pct = (val) => `pct-${Math.round((val || 50) / 10) * 10}`
  const teamLogo = computed(() => `https://a.espncdn.com/i/teamlogos/ncaa/500/${p.value.team_id}.png`)
  const birthplace = computed(() => p.value.city && p.value.state ? `${p.value.city}, ${p.value.state}` : null)
  const age = computed(() => p.value.age_at_draft ? (p.value.age_at_draft / 365.25).toFixed(1) : null)
  const gp = computed(() => p.value.gp || 1)
  const shots = computed(() => p.value.shots || {})
  const assisted = computed(() => {
    const s = p.value.assisted_shots || {}
    const shotCounts = p.value.shots || {}
    const astDunk = shotCounts.ast_dunk || 0
    const astLay = shotCounts.ast_layup || 0
    const astMid = shotCounts.ast_mid || 0
    const ast3 = shotCounts.ast_3pt || 0
    const totalAst = astDunk + astLay + astMid + ast3 || 1
    return {
      pct: {
        dunk: s.dunk_ast_pct,
        layup: s.layup_ast_pct,
        mid: s.mid_ast_pct,
        three: s.three_ast_pct,
        dunk_pctile: s.dunk_ast_pct_pctile,
        layup_pctile: s.layup_ast_pct_pctile,
        mid_pctile: s.mid_ast_pct_pctile,
        three_pctile: s.three_ast_pct_pctile
      },
      counts: {
        dunk: astDunk,
        layup: astLay,
        mid: astMid,
        three: ast3,
        dunk_share: (astDunk / totalAst) * 100,
        layup_share: (astLay / totalAst) * 100,
        mid_share: (astMid / totalAst) * 100,
        three_share: (ast3 / totalAst) * 100
      }
    }
  })
  </script>
  
  <template>
    <div class="player-card" :class="{ rsci: isRsci }" :style="{ backgroundImage: `linear-gradient(rgba(17, 24, 39, 0.92), rgba(17, 24, 39, 0.92)), url('${teamLogo}')` }">
      <div class="card-rank-row">
        <span class="card-rank">{{ p.class_rank }}</span>
        <div class="ez-scores">
          <span class="ez-score" :class="pct(p.ez_pctile)">{{ (p.ez / gp)?.toFixed(1) }}</span>
          <span class="ez-score" :class="pct(p.ez_poss_pctile)">{{ (p.ez / (p.team_poss * p.minutes / p.team_minutes) * 75)?.toFixed(1) }}</span>
          <span class="ez-score" :class="pct(p.ez_struct?.score_pctile)">{{ (p.ez_struct?.ez_scoring / (p.team_poss * p.minutes / p.team_minutes) * 75)?.toFixed(1) }}</span>
          <span class="ez-score" :class="pct(p.ez_struct?.def_pctile)">{{ (p.ez_struct?.ez_defense / (p.team_poss * p.minutes / p.team_minutes) * 75)?.toFixed(1) }}</span>
          <span class="ez-score" :class="pct(p.ez_struct?.pass_pctile)">{{ (p.ez_struct?.ez_passing / (p.team_poss * p.minutes / p.team_minutes) * 75)?.toFixed(1) }}</span>
          <span class="ez-score" :class="pct(p.ez_struct?.reb_pctile)">{{ (p.ez_struct?.ez_rebounding / (p.team_poss * p.minutes / p.team_minutes) * 75)?.toFixed(1) }}</span>
        </div>
      </div>
      <div class="ez-labels"><span>EZ</span><span>EZ75</span><span>Off</span><span>Def</span><span>Pass</span><span>Reb</span></div>
      <div class="card-player-info">
        <a :href="`https://www.espn.com/${espnPath}/player/_/id/${p.player_id}`" class="player-link" target="_blank">
          <img :src="p.headshot_href" class="player-photo" :alt="p.display_name">
          <div class="player-name-photo"><span class="jersey">#{{ p.jersey }}</span> {{ p.display_name }}</div>
        </a>
        <div class="player-details">
          <div class="player-meta">
            {{ p.display_height }}<span v-if="p.display_weight"> / {{ p.display_weight }}</span><br>
            {{ p.experience_display_value }} {{ p.position_display_name }}<br>
            <span v-if="birthplace">{{ birthplace }}<br></span>
            <span class="team">#{{ p.team_rank }} {{ p.team_location }} (SOS #{{ p.sos }})</span><br>
            {{ p.team_conf }}<span v-if="age"> • Age {{ age }}</span>
          </div>
          <span v-if="isRsci" class="rsci-badge">#{{ p.rsci_rank }} RSCI</span>
        </div>
        <div v-if="hasElo" class="elo-rank-badge">
          <div class="elo-rank-label">ELO RANK</div>
          <div class="elo-rank-value">#{{ p.elo_rank }}</div>
          <div class="elo-score">{{ p.elo_rating?.toFixed(0) }}</div>
        </div>
      </div>
      <table class="stats-table">
        <thead>
          <tr><th>gs</th><th>gp</th><th>min</th><th>mpg</th><th>ts%</th><th>usg%</th><th>ppp</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ p.gs }}</td>
            <td>{{ p.gp }}</td>
            <td :class="pct(p.mpgpctile)">{{ Math.round(p.minutes) }}</td>
            <td :class="pct(p.mpgpctile)">{{ Math.round(p.minutes / gp) }}</td>
            <td :class="pct(p.shooting?.tspctile)">{{ p.shooting?.ts }}</td>
            <td :class="pct(p.shooting?.usgpctile)">{{ p.shooting?.usg?.toFixed(1) }}</td>
            <td :class="pct(p.shooting?.ppppctile)">{{ p.shooting?.ppp?.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
      <table class="stats-table">
        <thead>
          <tr><th>pts</th><th>ast</th><th>reb</th><th>stl</th><th>blk</th><th>tov</th></tr>
        </thead>
        <tbody>
          <tr>
            <td :class="pct(p.ppgpctile)">{{ p.ppg?.toFixed(1) }}</td>
            <td :class="pct(p.apgpctile)">{{ p.apg?.toFixed(1) }}</td>
            <td :class="pct(p.rpgpctile)">{{ p.rpg?.toFixed(1) }}</td>
            <td :class="pct(p.spgpctile)">{{ p.spg?.toFixed(1) }}</td>
            <td :class="pct(p.bpgpctile)">{{ p.bpg?.toFixed(1) }}</td>
            <td :class="pct(100 - p.tpgpctile)">{{ p.tpg?.toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
      <table class="stats-table">
        <thead>
          <tr><th>dnk</th><th>dnk%</th><th>lay</th><th>lay%</th><th>mid</th><th>mid%</th></tr>
        </thead>
        <tbody>
          <tr>
            <td :class="pct(p.shooting?.dunka100pctile)">
              {{ (shots.ast_dunk || 0) + (shots.unast_dunk || 0) }}-{{ (shots.ast_dunk || 0) + (shots.unast_dunk || 0) + (shots.miss_dunk || 0) }}
              ({{ shots.unast_dunk || 0 }})
            </td>
            <td :class="pct(p.shooting?.dunkpctpctile)">{{ p.shooting?.dunkpct?.toFixed(0) }}%</td>
            <td :class="pct(p.shooting?.layupa100pctile)">
              {{ (shots.ast_layup || 0) + (shots.unast_layup || 0) }}-{{ (shots.ast_layup || 0) + (shots.unast_layup || 0) + (shots.miss_layup || 0) }}
              ({{ shots.unast_layup || 0 }})
            </td>
            <td :class="pct(p.shooting?.layuppctpctile)">{{ p.shooting?.layuppct?.toFixed(0) }}%</td>
            <td :class="pct(p.shooting?.mida100pctile)">
              {{ (shots.ast_mid || 0) + (shots.unast_mid || 0) }}-{{ (shots.ast_mid || 0) + (shots.unast_mid || 0) + (shots.miss_mid || 0) }}
              ({{ shots.unast_mid || 0 }})
            </td>
            <td :class="pct(p.shooting?.midpctpctile)">{{ p.shooting?.midpct?.toFixed(0) }}%</td>
          </tr>
        </tbody>
      </table>
      <table class="stats-table">
        <thead>
          <tr><th>dnk ast%</th><th>lay ast%</th><th>mid ast%</th><th>3pt ast%</th></tr>
        </thead>
        <tbody>
          <tr>
            <td :class="pct(assisted.pct.dunk_pctile)">{{ assisted.pct.dunk?.toFixed(1) ?? '—' }}%</td>
            <td :class="pct(assisted.pct.layup_pctile)">{{ assisted.pct.layup?.toFixed(1) ?? '—' }}%</td>
            <td :class="pct(assisted.pct.mid_pctile)">{{ assisted.pct.mid?.toFixed(1) ?? '—' }}%</td>
            <td :class="pct(assisted.pct.three_pctile)">{{ assisted.pct.three?.toFixed(1) ?? '—' }}%</td>
          </tr>
        </tbody>
      </table>
      <table class="stats-table">
        <thead>
          <tr><th>2pt</th><th>2p%</th><th>3pt</th><th>3p%</th><th>ft</th><th>ft%</th><th>ftr</th></tr>
        </thead>
        <tbody>
          <tr>
            <td :class="pct(p.shooting?.fg2pctpctile)">{{ shots.fg2m }}-{{ shots.fg2a }}</td>
            <td :class="pct(p.shooting?.fg2pctpctile)">{{ p.shooting?.fg2pct?.toFixed(0) }}%</td>
            <td :class="pct(p.shooting?.fg3pctpctile)">{{ shots.fgm - shots.fg2m }}-{{ shots.fga - shots.fg2a }}</td>
            <td :class="pct(p.shooting?.fg3pctpctile)">{{ p.shooting?.fg3pct?.toFixed(0) }}%</td>
            <td :class="pct(p.shooting?.ftpctpctile)">{{ shots.ftm }}-{{ shots.fta }}</td>
            <td :class="pct(p.shooting?.ftpctpctile)">{{ p.shooting?.ftpct?.toFixed(0) }}%</td>
            <td :class="pct(p.shooting?.ftrpctile)">{{ p.shooting?.ftr?.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
      <table class="stats-table">
        <thead>
          <tr><th>astr</th><th>ast%</th><th>tor</th><th>to%</th><th>atr</th></tr>
        </thead>
        <tbody>
          <tr>
            <td :class="pct(p.apgpctile)">{{ p.apg?.toFixed(1) }}</td>
            <td :class="pct(p.passing?.astpctpctile)">{{ p.passing?.astpct }}</td>
            <td :class="pct(100 - p.tpgpctile)">{{ p.tpg?.toFixed(1) }}</td>
            <td :class="pct(100 - p.tpgpctile)">{{ (p.tov / (p.ast + p.tov) * 100)?.toFixed(1) }}</td>
            <td :class="pct(p.apgpctile)">{{ (p.ast / p.tov)?.toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
      <table class="stats-table">
        <thead>
          <tr><th>st%</th><th>bk%</th><th>orr</th><th>or%</th><th>drr</th><th>dr%</th></tr>
        </thead>
        <tbody>
          <tr>
            <td :class="pct(p.spgpctile)">{{ p.spg?.toFixed(1) }}</td>
            <td :class="pct(p.bpgpctile)">{{ p.bpg?.toFixed(1) }}</td>
            <td :class="pct(p.rpgpctile)">{{ (p.orb / gp)?.toFixed(1) }}</td>
            <td :class="pct(p.rpgpctile)">{{ ((p.orb / p.minutes) * 40)?.toFixed(1) }}</td>
            <td :class="pct(p.rpgpctile)">{{ (p.drb / gp)?.toFixed(1) }}</td>
            <td :class="pct(p.rpgpctile)">{{ ((p.drb / p.minutes) * 40)?.toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
      <table class="stats-table">
        <thead>
          <tr><th>dnk ast</th><th>dnk%</th><th>lay ast</th><th>lay%</th><th>mid ast</th><th>mid%</th><th>3pt ast</th><th>3pt%</th></tr>
        </thead>
        <tbody>
          <tr>
            <td class="pct-50">{{ assisted.counts.dunk }}</td>
            <td class="pct-50">{{ assisted.counts.dunk_share?.toFixed(1) }}%</td>
            <td class="pct-50">{{ assisted.counts.layup }}</td>
            <td class="pct-50">{{ assisted.counts.layup_share?.toFixed(1) }}%</td>
            <td class="pct-50">{{ assisted.counts.mid }}</td>
            <td class="pct-50">{{ assisted.counts.mid_share?.toFixed(1) }}%</td>
            <td class="pct-50">{{ assisted.counts.three }}</td>
            <td class="pct-50">{{ assisted.counts.three_share?.toFixed(1) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <style scoped>
  @import '../assets/player-card.css';
  </style>
  
