const STORAGE_KEY = 'toplines-filters-v1'

export const loadSharedFilters = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    return {
      selectedClasses: Array.isArray(data.selectedClasses) ? data.selectedClasses : null,
      rsciOnly: typeof data.rsciOnly === 'boolean' ? data.rsciOnly : null,
      selectedPosition: typeof data.selectedPosition === 'string' ? data.selectedPosition : '',
      selectedConferences: Array.isArray(data.selectedConferences) ? data.selectedConferences : [],
      onlyWithPlayers: typeof data.onlyWithPlayers === 'boolean' ? data.onlyWithPlayers : null,
      sortAsc: typeof data.sortAsc === 'boolean' ? data.sortAsc : null,
      scheduleStatuses: Array.isArray(data.scheduleStatuses) ? data.scheduleStatuses : null,
      toplineDates: Array.isArray(data.toplineDates) ? data.toplineDates : null,
      scheduleDate: typeof data.scheduleDate === 'string' ? data.scheduleDate : null,
    }
  } catch {
    return {}
  }
}

export const saveSharedFilters = (filters) => {
  const existing = loadSharedFilters()
  const payload = {
    selectedClasses: Array.isArray(filters.selectedClasses) ? filters.selectedClasses : (existing.selectedClasses || []),
    rsciOnly: typeof filters.rsciOnly === 'boolean' ? filters.rsciOnly : !!existing.rsciOnly,
    selectedPosition: typeof filters.selectedPosition === 'string' ? filters.selectedPosition : (existing.selectedPosition || ''),
    selectedConferences: Array.isArray(filters.selectedConferences) ? filters.selectedConferences : (existing.selectedConferences || []),
    onlyWithPlayers: typeof filters.onlyWithPlayers === 'boolean' ? filters.onlyWithPlayers : !!existing.onlyWithPlayers,
    sortAsc: typeof filters.sortAsc === 'boolean' ? filters.sortAsc : (typeof existing.sortAsc === 'boolean' ? existing.sortAsc : true),
    scheduleStatuses: Array.isArray(filters.scheduleStatuses) ? filters.scheduleStatuses : (existing.scheduleStatuses || ['upcoming', 'live', 'finished']),
    toplineDates: Array.isArray(filters.toplineDates) ? filters.toplineDates : (existing.toplineDates || []),
    scheduleDate: typeof filters.scheduleDate === 'string' ? filters.scheduleDate : (existing.scheduleDate || ''),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore write errors (private mode, storage disabled, etc.)
  }
}
