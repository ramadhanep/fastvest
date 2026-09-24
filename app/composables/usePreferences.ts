import { kv, storageRawGet, storageRawSet } from '~/lib/storage'

export type ThemePreference = 'system' | 'light' | 'dark'
export type DisplayCurrency = 'USD' | 'IDR' | 'SGD' | 'MYR'
export type FontPreference = 'serif' | 'sans'
export type Locale = 'en' | 'id'

interface Preferences {
  theme: ThemePreference
  refreshInterval: number
  displayCurrency: DisplayCurrency
  fontFamily: FontPreference
  compactLayout: boolean
  locale: Locale
}

const preferences = ref<Preferences>({
  theme: 'system',
  refreshInterval: 60,
  displayCurrency: 'USD',
  fontFamily: 'serif',
  compactLayout: false,
  locale: 'en',
})
const loaded = ref(false)

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  refreshInterval: 60,
  displayCurrency: 'USD',
  fontFamily: 'serif',
  compactLayout: false,
  locale: 'en',
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
      el.lang = preferences.value.locale
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

  function setLocale(locale: Locale) {
    preferences.value.locale = locale
    persist()
    applyTypography()
  }

  if (import.meta.client && !loaded.value) load()
  if (import.meta.client) applyTypography()

  return {
    preferences: readonly(preferences),
    loaded: readonly(loaded),
    setTheme,
    setRefreshInterval,
    setDisplayCurrency,
    setLocale,
    setFontFamily,
    setCompactLayout,
    applyTheme,
    applyTypography,
  }
}