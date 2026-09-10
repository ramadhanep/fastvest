<script setup lang="ts">
import { ref, computed } from 'vue'
import { Download, Upload, Trash2, RefreshCw, Layers, ExternalLink } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { ThemePreference } from '~/composables/usePreferences'

useHead({ title: 'Fastvest · Settings' })

const { holdings, exportPortfolio, importPortfolio, resetPortfolio, loadDemoPortfolio } = usePortfolio()
const canExport = computed(() => holdings.value.length > 0)
const { preferences, setTheme, setRefreshInterval } = usePreferences()
const { online } = useConnection()
const { clearCache } = useQuotes()

const fileInput = ref<HTMLInputElement | null>(null)
const confirmImportOpen = ref(false)
const confirmResetOpen = ref(false)
const pendingFile = ref<File | null>(null)
const importBusy = ref(false)

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

const INTERVALS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
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
  importBusy.value = true
  try {
    const res = await importPortfolio(pendingFile.value)
    if (res.ok) {
      toast.success('Portfolio imported')
    } else {
      toast.error('Import failed', { description: res.message })
    }
  } finally {
    importBusy.value = false
    pendingFile.value = null
    confirmImportOpen.value = false
  }
}

function confirmReset() {
  resetPortfolio()
  clearCache()
  toast.success('Portfolio reset')
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
        <h2 id="appearance-heading" class="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Appearance</h2>
        <div class="rounded-2xl bg-card border border-border/30 overflow-hidden">
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p class="text-sm font-medium">Theme</p>
              <p class="text-[11px] text-muted-foreground mt-0.5">App color scheme</p>
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
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="border-t border-border/30 px-4 py-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <RefreshCw class="size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p class="text-sm font-medium">Auto Refresh</p>
                <p class="text-[11px] text-muted-foreground mt-0.5">Price update frequency</p>
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
        </div>
      </section>

      <!-- Data -->
      <section aria-labelledby="data-heading">
        <h2 id="data-heading" class="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Data</h2>
        <div class="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/30">
          <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30 cursor-pointer" :disabled="!canExport" @click="exportPortfolio">
            <span class="size-7 rounded-lg bg-muted inline-flex items-center justify-center">
              <Download class="size-3.5 text-muted-foreground" aria-hidden="true" />
            </span>
            <span class="flex-1">
              <span class="text-sm font-medium block">Export</span>
              <span class="text-[11px] text-muted-foreground block mt-0.5">Backup to JSON file</span>
            </span>
          </button>
          <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30 cursor-pointer" @click="fileInput?.click()">
            <span class="size-7 rounded-lg bg-muted inline-flex items-center justify-center">
              <Upload class="size-3.5 text-muted-foreground" aria-hidden="true" />
            </span>
            <span class="flex-1">
              <span class="text-sm font-medium block">Import</span>
              <span class="text-[11px] text-muted-foreground block mt-0.5">Restore from backup</span>
            </span>
          </button>
          <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30 cursor-pointer" @click="loadDemoPortfolio">
            <span class="size-7 rounded-lg bg-muted inline-flex items-center justify-center">
              <Layers class="size-3.5 text-muted-foreground" aria-hidden="true" />
            </span>
            <span class="flex-1">
              <span class="text-sm font-medium block">Demo Data</span>
              <span class="text-[11px] text-muted-foreground block mt-0.5">Load sample portfolio</span>
            </span>
          </button>
          <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30 cursor-pointer" @click="confirmResetOpen = true">
            <span class="size-7 rounded-lg bg-destructive/10 inline-flex items-center justify-center">
              <Trash2 class="size-3.5 text-destructive" aria-hidden="true" />
            </span>
            <span class="flex-1">
              <span class="text-sm font-medium text-destructive block">Reset All</span>
              <span class="text-[11px] text-muted-foreground block mt-0.5">Clear all holdings and data</span>
            </span>
          </button>
        </div>
        <input ref="fileInput" type="file" accept="application/json,.json" class="sr-only" aria-hidden="true" tabindex="-1" @change="onFilePicked" />
        <p v-if="storageEstimate" class="mt-2 px-1 text-[11px] text-muted-foreground">Storage used: {{ storageEstimate }}</p>
      </section>

      <!-- About -->
      <section aria-labelledby="about-heading">
        <h2 id="about-heading" class="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">About</h2>
        <div class="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/30">
          <div class="px-4 py-3">
            <p class="text-sm font-medium">Fastvest</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">Local-first portfolio tracker · Yahoo Finance</p>
          </div>
          <div class="px-4 py-3 flex items-center justify-between">
            <span class="text-sm font-medium">Status</span>
            <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span class="inline-block size-2 rounded-full" :class="online ? 'bg-emerald-500' : 'bg-amber-500'" aria-hidden="true" />
              {{ online ? 'Connected' : 'Offline' }}
            </span>
          </div>
          <a href="https://github.com/ramadhanep/fastvest" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors active:bg-muted/30 cursor-pointer">
            View Source
            <ExternalLink class="size-3.5 text-muted-foreground" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>

    <!-- Dialogs -->
    <UiAlertDialog :open="confirmImportOpen" @update:open="(v: boolean) => (confirmImportOpen = v)">
      <UiAlertDialogContent class="sm:max-w-md rounded-2xl p-5 border border-border/50 bg-card">
        <UiAlertDialogHeader>
          <UiAlertDialogTitle class="text-base font-semibold">Import portfolio?</UiAlertDialogTitle>
          <UiAlertDialogDescription class="text-xs text-muted-foreground">
            This replaces your current {{ holdings.length }} holding{{ holdings.length === 1 ? '' : 's' }}.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter class="mt-4 flex gap-2">
          <UiAlertDialogCancel class="rounded-full h-10 flex-1 text-xs">Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction class="rounded-full h-10 flex-1 text-xs" :disabled="importBusy" @click="confirmImport">
            {{ importBusy ? 'Importing…' : 'Import' }}
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <UiAlertDialog :open="confirmResetOpen" @update:open="(v: boolean) => (confirmResetOpen = v)">
      <UiAlertDialogContent class="sm:max-w-md rounded-2xl p-5 border border-border/50 bg-card">
        <UiAlertDialogHeader>
          <UiAlertDialogTitle class="text-base font-semibold">Reset portfolio?</UiAlertDialogTitle>
          <UiAlertDialogDescription class="text-xs text-muted-foreground">
            This removes all holdings and cached quotes from this browser.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter class="mt-4 flex gap-2">
          <UiAlertDialogCancel class="rounded-full h-10 flex-1 text-xs">Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction class="rounded-full h-10 flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs" @click="confirmReset">
            Reset
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>
