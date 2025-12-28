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
      selectedConferences: Array.isArray(data.selectedConferences) ? data.selectedConferences : []
    }
  } catch {
    return {}
  }
}

export const saveSharedFilters = (filters) => {
  const payload = {
    selectedClasses: Array.isArray(filters.selectedClasses) ? filters.selectedClasses : [],
    rsciOnly: !!filters.rsciOnly,
    selectedPosition: filters.selectedPosition || '',
    selectedConferences: Array.isArray(filters.selectedConferences) ? filters.selectedConferences : []
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore write errors (private mode, storage disabled, etc.)
  }
}
