import { kv, storageRawGet, storageRawSet } from '~/lib/storage'

export type ThemePreference = 'system' | 'light' | 'dark'
export type DisplayCurrency = 'USD' | 'IDR' | 'SGD' | 'MYR'
export type FontPreference = 'serif' | 'sans'

interface Preferences {
  theme: ThemePreference
  refreshInterval: number
  displayCurrency: DisplayCurrency
  fontFamily: FontPreference
  compactLayout: boolean
}

const preferences = ref<Preferences>({
  theme: 'system',
  refreshInterval: 60,
  displayCurrency: 'USD',
  fontFamily: 'serif',
  compactLayout: false,
})
const loaded = ref(false)

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  refreshInterval: 60,
  displayCurrency: 'USD',
  fontFamily: 'serif',
  compactLayout: false,
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

  function applyTypography() {
    if (import.meta.client) {
      const el = document.documentElement
      el.dataset.font = preferences.value.fontFamily
      el.dataset.density = preferences.value.compactLayout ? 'compact' : 'comfortable'
    }
  }

  function setTheme(theme: ThemePreference) {
    preferences.value.theme = theme
    persist()
    applyTheme()
  }

  function setFontFamily(fontFamily: FontPreference) {
    preferences.value.fontFamily = fontFamily
    persist()
    applyTypography()
  }

  function setCompactLayout(compact: boolean) {
    preferences.value.compactLayout = compact
    persist()
    applyTypography()
  }

  function setRefreshInterval(seconds: number) {
    preferences.value.refreshInterval = seconds
    persist()
  }

  function setDisplayCurrency(currency: DisplayCurrency) {
    preferences.value.displayCurrency = currency
    persist()
  }

  if (import.meta.client && !loaded.value) load()
  if (import.meta.client) applyTypography()

  return {
    preferences: readonly(preferences),
    loaded: readonly(loaded),
    setTheme,
    setRefreshInterval,
    setDisplayCurrency,
    setFontFamily,
    setCompactLayout,
    applyTheme,
    applyTypography,
  }
}