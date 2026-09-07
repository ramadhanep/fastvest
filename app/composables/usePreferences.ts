import { kv, storageRawGet, storageRawSet } from '~/lib/storage'

export type ThemePreference = 'system' | 'light' | 'dark'

interface Preferences {
  theme: ThemePreference
  refreshInterval: number
}

const preferences = ref<Preferences>({ theme: 'system', refreshInterval: 60 })
const loaded = ref(false)

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  refreshInterval: 60,
}

export function usePreferences() {
  function load() {
    if (loaded.value) return
    const stored = storageRawGet<Partial<Preferences>>(kv.preferences)
    if (stored && typeof stored === 'object') {
      preferences.value = { ...DEFAULT_PREFERENCES, ...stored }
    }
    loaded.value = true
  }

  function persist() {
    storageRawSet(kv.preferences, preferences.value)
  }

  function applyTheme() {
    if (import.meta.client) {
      const colorMode = useColorMode()
      colorMode.preference = preferences.value.theme
    }
  }

  function setTheme(theme: ThemePreference) {
    preferences.value.theme = theme
    persist()
    applyTheme()
  }

  function setRefreshInterval(seconds: number) {
    preferences.value.refreshInterval = seconds
    persist()
  }

  if (import.meta.client && !loaded.value) load()

  return {
    preferences: readonly(preferences),
    loaded: readonly(loaded),
    setTheme,
    setRefreshInterval,
    applyTheme,
  }
}