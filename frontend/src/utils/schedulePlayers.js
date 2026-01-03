export function mergeFeaturedPlayers(game, seasonMap = new Map(), ranks = new Map()) {
  const seasonLookup = seasonMap instanceof Map ? seasonMap : new Map()
  const rankLookup = ranks instanceof Map ? ranks : new Map()

  const base = Array.isArray(game?.featured_players) ? game.featured_players : []
  return base.map((p) => {
    const pid = Number(p.player_id)
    const season = seasonLookup.get(pid)
    const merged = season ? { ...p, ...season, player_id: pid || season.player_id } : { ...p, player_id: pid }
    const r = rankLookup.get(pid)
    if (r) {
      merged.display_rank = r
      merged.class_rank = r
    }
    if (!merged.headshot && merged.headshot_href) {
      merged.headshot = merged.headshot_href
    }
    return merged
  })
}
