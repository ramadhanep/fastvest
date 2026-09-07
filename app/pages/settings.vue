<script setup lang="ts">
import { Download, Upload, Trash2, RefreshCw, ArrowLeft, Layers, ExternalLink } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { ThemePreference } from '~/composables/usePreferences'

useHead({ title: 'FastVest · Settings' })

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

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const INTERVALS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
]

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
      toast.success('Portfolio imported', {
        description: `${holdings.value.length} holdings replaced your local portfolio.`,
      })
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
  toast.success('Local portfolio reset')
  confirmResetOpen.value = false
}

function triggerLoadDemo() {
  loadDemoPortfolio()
}

const storageEstimate = ref<string | null>(null)
onMounted(async () => {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate()
    if (est.usage) {
      storageEstimate.value = formatBytes(est.usage)
    }
  }
})

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <div class="space-y-4 pb-12">
    <!-- Header title -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/"
        class="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Back to Portfolio"
      >
        <ArrowLeft class="size-4" />
      </NuxtLink>
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-foreground">Settings</h1>
        <p class="text-xs text-muted-foreground">Appearance, data, and app preferences</p>
      </div>
    </div>

    <!-- Appearance -->
    <section class="rounded-3xl border border-border/70 bg-card p-5" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" class="text-sm font-semibold text-foreground">Appearance</h2>
      <p class="mt-0.5 text-xs text-muted-foreground">Select color theme for your interface.</p>
      <div class="mt-3.5 flex flex-wrap gap-2">
        <UiButton
          v-for="opt in THEME_OPTIONS"
          :key="opt.value"
          :variant="preferences.theme === opt.value ? 'default' : 'outline'"
          size="sm"
          class="rounded-full text-xs font-medium px-4 h-8"
          @click="setTheme(opt.value)"
        >
          {{ opt.label }}
        </UiButton>
      </div>
    </section>

    <!-- Auto Refresh -->
    <section class="rounded-3xl border border-border/70 bg-card p-5" aria-labelledby="refresh-heading">
      <h2 id="refresh-heading" class="text-sm font-semibold text-foreground">Auto Refresh</h2>
      <p class="mt-0.5 text-xs text-muted-foreground">Frequency of market price updates when active.</p>
      <div class="mt-3.5 flex flex-wrap gap-2">
        <UiButton
          v-for="i in INTERVALS"
          :key="i.value"
          :variant="preferences.refreshInterval === i.value ? 'default' : 'outline'"
          size="sm"
          class="rounded-full text-xs font-medium px-3.5 h-8"
          @click="setRefreshInterval(i.value)"
        >
          {{ i.label }}
        </UiButton>
      </div>
      <p class="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <RefreshCw class="size-3 shrink-0" aria-hidden="true" />
        Prices automatically refresh when app is open and connected to internet.
      </p>
    </section>

    <!-- Data Management -->
    <section class="rounded-3xl border border-border/70 bg-card p-5" aria-labelledby="data-heading">
      <h2 id="data-heading" class="text-sm font-semibold text-foreground">Data Storage</h2>
      <p class="mt-0.5 text-xs text-muted-foreground leading-relaxed">
        Holdings are stored locally in browser storage. Export JSON files to backup or migrate.
      </p>

      <div class="mt-4 flex flex-wrap gap-2">
        <UiButton variant="outline" size="sm" class="rounded-full text-xs h-8" :disabled="!canExport" @click="exportPortfolio">
          <Download class="size-3 mr-1" aria-hidden="true" />
          Export
        </UiButton>

        <UiButton variant="outline" size="sm" class="rounded-full text-xs h-8" @click="fileInput?.click()">
          <Upload class="size-3 mr-1" aria-hidden="true" />
          Import
        </UiButton>

        <UiButton variant="outline" size="sm" class="rounded-full text-xs h-8" @click="triggerLoadDemo">
          <Layers class="size-3 mr-1 text-muted-foreground" aria-hidden="true" />
          Load Demo
        </UiButton>

        <input ref="fileInput" type="file" accept="application/json,.json" class="sr-only" aria-hidden="true" tabindex="-1" @change="onFilePicked" />

        <UiButton variant="destructive" size="sm" class="rounded-full text-xs h-8" @click="confirmResetOpen = true">
          <Trash2 class="size-3 mr-1" aria-hidden="true" />
          Reset All
        </UiButton>
      </div>

      <p v-if="storageEstimate" class="mt-3 text-[11px] text-muted-foreground">
        Local storage used: {{ storageEstimate }}
      </p>
    </section>

    <!-- About FastVest & License -->
    <section class="rounded-3xl border border-border/70 bg-card p-5">
      <h2 class="text-sm font-semibold text-foreground">About FastVest</h2>
      <div class="mt-2 space-y-2 text-xs text-muted-foreground leading-relaxed">
        <p>
          <strong class="font-medium text-foreground">FastVest</strong> is a local-first investment tracker with real-time market data powered by Yahoo Finance.
        </p>
        <p>
          100% private. All portfolio records stay on this device. Released under the <strong class="font-medium text-foreground">GPL-3.0 License</strong>.
        </p>
        <div class="pt-2 flex items-center justify-between border-t border-border/40 text-[11px]">
          <span class="flex items-center gap-1.5">
            <span class="inline-block size-2 rounded-full" :class="online ? 'bg-emerald-500' : 'bg-amber-500'" aria-hidden="true" />
            {{ online ? 'Connected' : 'Offline' }}
          </span>
          <a
            href="https://github.com/ramadhanep/fastvest"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-foreground hover:underline font-medium"
          >
            GitHub
            <ExternalLink class="size-3" />
          </a>
        </div>
      </div>
    </section>
  </div>

  <!-- Dialogs -->
  <UiAlertDialog :open="confirmImportOpen" @update:open="(v: boolean) => (confirmImportOpen = v)">
    <UiAlertDialogContent class="sm:max-w-md rounded-3xl p-5 sm:p-6 border border-border/80 bg-card">
      <UiAlertDialogHeader>
        <UiAlertDialogTitle class="text-base font-semibold">Import portfolio?</UiAlertDialogTitle>
        <UiAlertDialogDescription class="text-xs text-muted-foreground">
          This will replace your current local portfolio of {{ holdings.length }} holding{{ holdings.length === 1 ? '' : 's' }}.
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
    <UiAlertDialogContent class="sm:max-w-md rounded-3xl p-5 sm:p-6 border border-border/80 bg-card">
      <UiAlertDialogHeader>
        <UiAlertDialogTitle class="text-base font-semibold">Reset portfolio?</UiAlertDialogTitle>
        <UiAlertDialogDescription class="text-xs text-muted-foreground">
          This permanently removes all holdings and cached quotes from this browser. Export a backup first if you need it.
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
</template>
