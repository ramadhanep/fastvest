<template>
  <div class="min-h-dvh bg-background text-foreground flex flex-col relative antialiased selection:bg-muted">
    <AppHeader
      :refreshing="refreshing"
      :back-to="isDetail ? '/' : undefined"
      :brand-color="detailBrandColor"
    />
    <OfflineIndicator />

    <!-- Pull to Refresh indicator -->
    <div
      class="flex items-center justify-center overflow-hidden transition-all duration-300 ease-out"
      :style="{ height: pullIndicatorHeight + 'px', opacity: pullIndicatorOpacity }"
    >
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <svg
          class="size-4 transition-transform duration-300"
          :class="{ 'rotate-180': pullReady, 'animate-spin': refreshing }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
        <span>{{ refreshing ? 'Refreshing...' : pullReady ? 'Release to refresh' : 'Pull down to refresh' }}</span>
      </div>
    </div>

    <main
      ref="mainEl"
      class="mx-auto w-full max-w-md px-0 sm:px-4 pb-28 pt-2 flex-1"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <slot />
    </main>

    <!-- Floating Add Button (only on home page) -->
    <div
      v-if="isHome"
      class="fixed bottom-6 right-6 sm:right-[max(1.5rem,calc((100vw-28rem)/2+1.5rem))] z-40 pointer-events-auto"
    >
      <button
        type="button"
        aria-label="Add Holding"
        class="size-13 rounded-full bg-foreground text-background shadow-xl hover:opacity-90 transition-all flex items-center justify-center cursor-pointer ios-press"
        @click="addModal.open"
      >
        <Plus class="size-5.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { brandColorFor } from '~/utils/brand-colors'

const { refreshing, refresh } = useQuotes()
const { holdings } = usePortfolio()
const addModal = useAddHoldingModal()
const route = useRoute()
const isHome = computed(() => route.path === '/')
const isDetail = computed(() => route.path.startsWith('/holding/'))
const detailBrandColor = computed<string | null>(() =>
  isDetail.value ? brandColorFor(String(route.params.symbol ?? '')) ?? null : null,
)

const mainEl = ref<HTMLElement | null>(null)
const pullY = ref(0)
const pulling = ref(false)
let startY = 0

const PULL_THRESHOLD = 80
const MAX_PULL = 140

const pullReady = computed(() => pullY.value >= PULL_THRESHOLD && !refreshing.value)
const pullIndicatorHeight = computed(() => Math.min(pullY.value, MAX_PULL))
const pullIndicatorOpacity = computed(() => Math.min(pullY.value / PULL_THRESHOLD, 1))

function onTouchStart(e: TouchEvent) {
  if (refreshing.value) return
  const el = mainEl.value
  if (!el || el.scrollTop > 0) return
  const t = e.touches[0]
  if (!t) return
  startY = t.clientY
  pulling.value = true
}

function onTouchMove(e: TouchEvent) {
  if (!pulling.value) return
  const el = mainEl.value
  if (el && el.scrollTop > 0) { pullY.value = 0; return }
  const t = e.touches[0]
  if (!t) return
  const dy = t.clientY - startY
  if (dy > 0) {
    pullY.value = dy * 0.5
  } else {
    pullY.value = 0
  }
}

function onTouchEnd() {
  if (!pulling.value) return
  pulling.value = false
  if (pullReady.value) {
    refresh(holdings.value.map((h) => h.symbol))
  }
  pullY.value = 0
}
</script>
