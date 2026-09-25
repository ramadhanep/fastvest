<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, Trash2, RefreshCw, Layers, ExternalLink, Share2, Copy, Check, FileDown } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { ThemePreference } from '~/composables/usePreferences'
import type { ImportErrorCode } from '~/composables/usePortfolio'
import { MIN_PASSPHRASE } from '~/lib/backup'

useHead({ title: 'Fastvest · Settings' })

const { holdings, exportPortfolio, saveBackupFile, buildBackupCode, applyBackupCode, importPortfolio, resetPortfolio, loadDemoPortfolio } = usePortfolio()
const canExport = computed(() => holdings.value.length > 0)
const { preferences, setTheme, setRefreshInterval, setFontFamily, setCompactLayout } = usePreferences()
const { t, locale, setLocale } = useI18n()
const { online } = useConnection()
const { clearCache } = useQuotes()

const fileInput = ref<HTMLInputElement | null>(null)
const confirmImportOpen = ref(false)
const confirmResetOpen = ref(false)
const pendingFile = ref<File | null>(null)
const importBusy = ref(false)

const transferOpen = ref(false)
const transferMode = ref<'create' | 'enter'>('create')
const passphrase = ref('')
const transferCode = ref('')
const transferError = ref('')
const transferBusy = ref(false)
const copied = ref(false)

const passTooShort = computed(() => passphrase.value.trim().length < MIN_PASSPHRASE)

const IMPORT_ERROR_KEYS: Record<ImportErrorCode, 'transferErrWeakPass' | 'transferErrWrongPass' | 'transferErrCorrupt' | 'transferErrFormat' | 'transferErrRead'> = {
  weakPass: 'transferErrWeakPass',
  wrongPass: 'transferErrWrongPass',
  corrupt: 'transferErrCorrupt',
  format: 'transferErrFormat',
  read: 'transferErrRead',
  encrypted: 'transferErrFormat',
}

function openTransfer(mode?: 'create' | 'enter', code = '') {
  transferMode.value = mode ?? (canExport.value ? 'create' : 'enter')
  passphrase.value = ''
  transferCode.value = code
  transferError.value = ''
  copied.value = false
  transferOpen.value = true
}

async function createTransferCode() {
  if (passTooShort.value) return
  transferBusy.value = true
  try {
    transferCode.value = await buildBackupCode(passphrase.value)
    transferError.value = ''
  } catch {
    transferError.value = t('transferErrWeakPass')
  } finally {
    transferBusy.value = false
  }
}

async function copyTransferCode() {
  if (!transferCode.value) return
  await navigator.clipboard.writeText(transferCode.value)
  copied.value = true
  toast.success(t('transferCopiedToast'))
}

async function restoreTransferCode() {
  if (!transferCode.value || passTooShort.value) return
  transferBusy.value = true
  try {
    const res = await applyBackupCode(transferCode.value, passphrase.value)
    if (res.ok) {
      clearCache()
      transferOpen.value = false
      toast.success(t('settingsImported'))
    } else {
      transferError.value = t(IMPORT_ERROR_KEYS[res.code ?? 'corrupt'])
    }
  } finally {
    transferBusy.value = false
  }
}

const THEME_OPTIONS = [
  { value: 'system', tkey: 'themeSystem' },
  { value: 'light', tkey: 'themeLight' },
  { value: 'dark', tkey: 'themeDark' },
] as const

const INTERVALS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
] as const

const FONT_OPTIONS = [
  { value: 'serif', tkey: 'fontSerif' },
  { value: 'sans', tkey: 'fontSans' },
] as const

const DENSITY_OPTIONS = [
  { value: false, tkey: 'densityComfortable' },
  { value: true, tkey: 'densityCompact' },
] as const

const LANGS = [
  { value: 'en', tkey: 'langEn' },
  { value: 'id', tkey: 'langId' },
] as const

async function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pendingFile.value = file
  confirmImportOpen.value = true
  input.value = ''
}

async function confirmImport() {
  if (!pendingFile.value) return
  const file = pendingFile.value
  importBusy.value = true
  pendingFile.value = null
  confirmImportOpen.value = false
  try {
    const res = await importPortfolio(file)
    if (res.ok) {
      toast.success(t('settingsImported'))
    } else if (res.code === 'encrypted') {
      openTransfer('enter', res.backupCode ?? '')
    } else {
      toast.error(t('settingsImportFailed'), { description: t(IMPORT_ERROR_KEYS[res.code ?? 'format']) })
    }
  } finally {
    importBusy.value = false
  }
}

function confirmReset() {
  resetPortfolio()
  clearCache()
  toast.success(t('settingsResetDone'))
  confirmResetOpen.value = false
}

const storageEstimate = ref<string | null>(null)
onMounted(async () => {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate()
    if (est.usage) storageEstimate.value = formatBytes(est.usage)
  }
})

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <div>
    <div class="space-y-6 pb-12 px-4 sm:px-0">
      <!-- Appearance -->
      <section aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" class="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{{ t('settingsAppearance') }}</h2>
        <div class="rounded-2xl bg-card border border-border/30 overflow-hidden">
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p class="text-sm font-medium">{{ t('settingsTheme') }}</p>
              <p class="text-[11px] text-muted-foreground mt-0.5">{{ t('settingsThemeSub') }}</p>
            </div>
            <div class="flex gap-1">
              <button
                v-for="opt in THEME_OPTIONS"
                :key="opt.value"
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ios-press"
                :class="preferences.theme === opt.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'"
                @click="setTheme(opt.value)"
              >
                {{ t(opt.tkey) }}
              </button>
            </div>
          </div>
          <div class="border-t border-border/30 px-4 py-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center justify-center size-7 rounded-lg bg-muted">
                <span class="font-serif text-[13px] font-semibold">Aa</span>
              </span>
              <div>
                <p class="text-sm font-medium">{{ t('settingsTypography') }}</p>
                <p class="text-[11px] text-muted-foreground mt-0.5">{{ t('settingsTypographySub') }}</p>
              </div>
            </div>
            <div class="flex gap-1">
              <button
                v-for="opt in FONT_OPTIONS"
                :key="opt.value"
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ios-press"
                :class="preferences.fontFamily === opt.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'"
                @click="setFontFamily(opt.value)"
              >
                <span :class="opt.value === 'serif' ? 'font-serif' : 'font-sans'">{{ t(opt.tkey) }}</span>
              </button>
            </div>
          </div>
          <div class="border-t border-border/30 px-4 py-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center justify-center size-7 rounded-lg bg-muted">
                <span class="text-xs font-medium">≡</span>
              </span>
              <div>
                <p class="text-sm font-medium">{{ t('settingsDensity') }}</p>
                <p class="text-[11px] text-muted-foreground mt-0.5">{{ t('settingsDensitySub') }}</p>
              </div>
            </div>
            <div class="flex gap-1">
              <button
                v-for="d in DENSITY_OPTIONS"
                :key="String(d.value)"
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ios-press"
                :class="preferences.compactLayout === d.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'"
                @click="setCompactLayout(d.value)"
              >
                {{ t(d.tkey) }}
              </button>
            </div>
          </div>
          <div class="border-t border-border/30 px-4 py-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <RefreshCw class="size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p class="text-sm font-medium">{{ t('settingsAutoRefresh') }}</p>
                <p class="text-[11px] text-muted-foreground mt-0.5">{{ t('settingsAutoRefreshSub') }}</p>
              </div>
            </div>
            <div class="flex gap-1">
              <button
                v-for="i in INTERVALS"
                :key="i.value"
                type="button"
                class="px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ios-press"
                :class="preferences.refreshInterval === i.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'"
                @click="setRefreshInterval(i.value)"
              >
                {{ i.label }}
              </button>
            </div>
          </div>
          <div class="border-t border-border/30 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium">{{ t('settingsLanguage') }}</p>
              <p class="text-[11px] text-muted-foreground mt-0.5">{{ t('settingsLanguageSub') }}</p>
            </div>
            <div class="flex gap-1">
              <button
                v-for="l in LANGS"
                :key="l.value"
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ios-press"
                :class="locale === l.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'"
                @click="setLocale(l.value)"
              >
                {{ t(l.tkey) }}
              </button>
            </div>
          </div>
        </div>
      </section>
      <section aria-labelledby="data-heading">
        <h2 id="data-heading" class="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{{ t('settingsData') }}</h2>
        <div class="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/30">
          <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30 cursor-pointer" @click="openTransfer()">
            <span class="size-7 rounded-lg bg-muted inline-flex items-center justify-center">
              <Share2 class="size-3.5 text-muted-foreground" aria-hidden="true" />
            </span>
            <span class="flex-1">
              <span class="text-sm font-medium block">{{ t('settingsTransfer') }}</span>
              <span class="text-[11px] text-muted-foreground block mt-0.5">{{ t('settingsTransferSub') }}</span>
            </span>
          </button>
          <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30 cursor-pointer" @click="fileInput?.click()">
            <span class="size-7 rounded-lg bg-muted inline-flex items-center justify-center">
              <Upload class="size-3.5 text-muted-foreground" aria-hidden="true" />
            </span>
            <span class="flex-1">
              <span class="text-sm font-medium block">{{ t('settingsImport') }}</span>
              <span class="text-[11px] text-muted-foreground block mt-0.5">{{ t('settingsImportSub') }}</span>
            </span>
          </button>
          <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30 cursor-pointer" @click="loadDemoPortfolio">
            <span class="size-7 rounded-lg bg-muted inline-flex items-center justify-center">
              <Layers class="size-3.5 text-muted-foreground" aria-hidden="true" />
            </span>
            <span class="flex-1">
              <span class="text-sm font-medium block">{{ t('settingsDemoData') }}</span>
              <span class="text-[11px] text-muted-foreground block mt-0.5">{{ t('settingsDemoDataSub') }}</span>
            </span>
          </button>
          <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30 cursor-pointer" @click="confirmResetOpen = true">
            <span class="size-7 rounded-lg bg-destructive/10 inline-flex items-center justify-center">
              <Trash2 class="size-3.5 text-destructive" aria-hidden="true" />
            </span>
            <span class="flex-1">
              <span class="text-sm font-medium text-destructive block">{{ t('settingsReset') }}</span>
              <span class="text-[11px] text-muted-foreground block mt-0.5">{{ t('settingsResetSub') }}</span>
            </span>
          </button>
        </div>
        <input ref="fileInput" type="file" accept="application/json,.json,.fvenc,text/plain" class="sr-only" aria-hidden="true" tabindex="-1" @change="onFilePicked" />
        <button
          type="button"
          class="mt-2 px-1 text-[11px] text-muted-foreground underline underline-offset-2 cursor-pointer disabled:opacity-40"
          :disabled="!canExport"
          @click="exportPortfolio"
        >
          {{ t('settingsExportLegacy') }}
        </button>
        <p v-if="storageEstimate" class="mt-2 px-1 text-[11px] text-muted-foreground">{{ t('settingsStorageUsed', { size: storageEstimate }) }}</p>
      </section>

      <!-- About -->
      <section aria-labelledby="about-heading">
        <h2 id="about-heading" class="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{{ t('settingsAbout') }}</h2>
        <div class="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/30">
          <div class="px-4 py-3">
            <p class="text-sm font-medium">Fastvest</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">{{ t('settingsAboutText') }}</p>
          </div>
          <div class="px-4 py-3 flex items-center justify-between">
            <span class="text-sm font-medium">{{ t('settingsStatus') }}</span>
            <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span class="inline-block size-2 rounded-full" :class="online ? 'bg-emerald-500' : 'bg-amber-500'" aria-hidden="true" />
              {{ online ? t('settingsConnected') : t('settingsOffline') }}
            </span>
          </div>
          <a href="https://github.com/ramadhanep/fastvest" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors active:bg-muted/30 cursor-pointer">
            {{ t('settingsViewSource') }}
            <ExternalLink class="size-3.5 text-muted-foreground" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>

    <!-- Dialogs -->
    <UiDialog :open="transferOpen" @update:open="(v: boolean) => transferOpen = v">
      <UiDialogContent class="sm:max-w-md rounded-2xl p-5 border border-border/50 bg-card">
        <UiDialogHeader class="text-left">
          <UiDialogTitle class="text-base font-semibold">{{ t('transferTitle') }}</UiDialogTitle>
        </UiDialogHeader>

        <div class="mt-3 flex gap-1 rounded-xl bg-muted/40 p-1">
          <button
            type="button"
            class="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            :class="transferMode === 'create' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'"
            @click="transferMode = 'create'; transferError = ''"
          >
            {{ t('transferTabCreate') }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            :class="transferMode === 'enter' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'"
            @click="transferMode = 'enter'; transferError = ''"
          >
            {{ t('transferTabReceive') }}
          </button>
        </div>

        <div class="mt-4">
          <UiLabel for="fv-pass" class="text-xs font-medium">{{ t('transferPassphrase') }}</UiLabel>
          <UiInput
            id="fv-pass"
            v-model="passphrase"
            type="password"
            autocomplete="off"
            spellcheck="false"
            class="mt-1.5 h-10 rounded-xl"
            autofocus
            aria-describedby="fv-pass-hint"
          />
          <p id="fv-pass-hint" class="mt-1.5 text-[11px] text-muted-foreground">{{ t('transferPassphraseHint') }}</p>
        </div>

        <!-- Create -->
        <div v-if="transferMode === 'create'" class="mt-4 space-y-3">
          <div v-if="transferCode">
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-xs font-medium">{{ t('transferCodeOut') }}</span>
              <span class="text-[11px] text-muted-foreground tabular-nums">{{ transferCode.length }} ch</span>
            </div>
            <UiTextarea
              :model-value="transferCode"
              readonly
              rows="4"
              spellcheck="false"
              class="mt-1.5 rounded-xl font-mono text-[11px] leading-relaxed break-all resize-none"
            />
            <p class="mt-1.5 text-[11px] text-muted-foreground">{{ t('transferCodeOutHint', { size: transferCode.length }) }}</p>
            <p class="mt-1 text-[11px] text-amber-600 dark:text-amber-400">{{ t('transferCodeSecret') }}</p>
            <div class="flex gap-2">
              <button
                type="button"
                class="h-10 flex-1 rounded-full text-xs font-medium bg-foreground text-background inline-flex items-center justify-center gap-1.5 cursor-pointer"
                @click="copyTransferCode"
              >
                <Check v-if="copied" class="size-3.5" aria-hidden="true" />
                <Copy v-else class="size-3.5" aria-hidden="true" />
                {{ copied ? t('transferCopied') : t('transferCopy') }}
              </button>
              <button
                type="button"
                class="h-10 flex-1 rounded-full text-xs font-medium border border-border inline-flex items-center justify-center gap-1.5 cursor-pointer"
                @click="saveBackupFile(transferCode)"
              >
                <FileDown class="size-3.5" aria-hidden="true" />
                {{ t('transferSaveFile') }}
              </button>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="w-full h-10 rounded-full text-xs font-medium bg-foreground text-background disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            :disabled="passTooShort || transferBusy || !canExport"
            @click="createTransferCode"
          >
            {{ transferBusy ? '…' : t('transferCreate') }}
          </button>
        </div>

        <!-- Enter -->
        <div v-else class="mt-4 space-y-3">
          <UiLabel for="fv-code" class="text-xs font-medium">{{ t('transferCodeIn') }}</UiLabel>
          <UiTextarea
            id="fv-code"
            v-model="transferCode"
            rows="4"
            spellcheck="false"
            class="rounded-xl font-mono text-[11px] leading-relaxed break-all resize-none"
            placeholder="FV1B1-…"
          />
          <p class="text-[11px] text-muted-foreground">
            {{ t('transferCodeInHint', { count: holdings.length, s: holdings.length === 1 ? '' : 's' }) }}
          </p>
          <button
            type="button"
            class="w-full h-10 rounded-full text-xs font-medium bg-foreground text-background disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            :disabled="passTooShort || transferBusy || !transferCode"
            @click="restoreTransferCode"
          >
            {{ transferBusy ? '…' : t('transferRestore') }}
          </button>
        </div>

        <p v-if="transferError" class="mt-3 text-xs font-medium text-destructive" role="alert">{{ transferError }}</p>
      </UiDialogContent>
    </UiDialog>

    <UiAlertDialog :open="confirmImportOpen" @update:open="(v: boolean) => (confirmImportOpen = v)">
      <UiAlertDialogContent class="sm:max-w-md rounded-2xl p-5 border border-border/50 bg-card">
        <UiAlertDialogHeader>
          <UiAlertDialogTitle class="text-base font-semibold">{{ t('settingsImportTitle') }}</UiAlertDialogTitle>
          <UiAlertDialogDescription class="text-xs text-muted-foreground">
            {{ t('settingsImportBody', { count: holdings.length, s: holdings.length === 1 ? '' : 's' }) }}
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter class="mt-4 flex gap-2">
          <UiAlertDialogCancel class="rounded-full h-10 flex-1 text-xs">{{ t('settingsImportCancel') }}</UiAlertDialogCancel>
          <UiAlertDialogAction class="rounded-full h-10 flex-1 text-xs" :disabled="importBusy" @click="confirmImport">
            {{ importBusy ? t('settingsImporting') : t('settingsImportConfirm') }}
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <UiAlertDialog :open="confirmResetOpen" @update:open="(v: boolean) => (confirmResetOpen = v)">
      <UiAlertDialogContent class="sm:max-w-md rounded-2xl p-5 border border-border/50 bg-card">
        <UiAlertDialogHeader>
          <UiAlertDialogTitle class="text-base font-semibold">{{ t('settingsResetTitle') }}</UiAlertDialogTitle>
          <UiAlertDialogDescription class="text-xs text-muted-foreground">
            {{ t('settingsResetBody') }}
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter class="mt-4 flex gap-2">
          <UiAlertDialogCancel class="rounded-full h-10 flex-1 text-xs">{{ t('settingsImportCancel') }}</UiAlertDialogCancel>
          <UiAlertDialogAction class="rounded-full h-10 flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs" @click="confirmReset">
            {{ t('settingsResetConfirm') }}
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>
