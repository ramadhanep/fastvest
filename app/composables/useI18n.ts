import { en, type I18nKey } from '~/i18n/en'
import { id } from '~/i18n/id'
import { usePreferences, type Locale } from './usePreferences'

const dicts = { en, id } as const

export function useI18n() {
  const { preferences, setLocale } = usePreferences()

  const locale = computed<Locale>(() => preferences.value.locale ?? 'en')
  const dict = computed(() => dicts[locale.value])

  function t(key: I18nKey, params?: Record<string, string | number>): string {
    let s = dict.value[key] ?? en[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v))
    }
    return s
  }

  return { locale, t, setLocale }
}