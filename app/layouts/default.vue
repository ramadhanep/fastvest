<template>
  <div class="min-h-dvh bg-background text-foreground flex flex-col relative antialiased selection:bg-muted">
    <AppHeader
      :refreshing="refreshing"
      :back-to="isDetail ? '/' : undefined"
      :brand-color="headerBrandColor"
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

    <!-- Animated FAB (only on home page) -->
    <!-- Slides down when scrolling down, slides back up when scrolling up — GPU-composited 60fps -->
    <Transition name="fab-fade">
      <div
        v-if="isHome"
        class="fixed bottom-0 inset-x-0 z-40 flex items-end justify-center px-4 pointer-events-none"
        style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 1.5rem))"
      >
        <div
          class="w-full max-w-md pointer-events-auto fab-slide"
          :class="{ 'fab-slide--hidden': !fabVisible }"
        >
          <!-- Liquid glass container — mirrors AppHeader outer div exactly -->
          <div
            class="w-full rounded-[1.75rem] bg-white/40 dark:bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden p-1.5 transition-[background-color] duration-500 ease-out"
            :style="glassStyle"
          >
            <button
              type="button"
              aria-label="Add Portfolio"
              class="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/50 dark:bg-white/10 h-12 px-5 text-sm font-medium text-foreground/80 backdrop-blur-xl cursor-pointer ios-press hover:bg-white/70 dark:hover:bg-white/20 transition-colors"
              @click="addModal.open"
            >
              <Plus class="size-4 shrink-0" />
              <span class="fab-label font-medium tracking-tight">Add Portfolio</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
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

// ─── Shared random portfolio color ───────────────────────────────────────────
// Picked once when holdings load/change, stable for the session so both
// AppHeader and FAB always show the same tint simultaneously.
const randomPortfolioColor = ref<string | null>(null)

watch(
  holdings,
  (newHoldings) => {
    const colors = newHoldings
      .map((h) => brandColorFor(h.symbol))
      .filter(Boolean) as string[]
    randomPortfolioColor.value = colors.length
      ? (colors[Math.floor(Math.random() * colors.length)] ?? null)
      : null
  },
  { immediate: true },
)

// Glass tint style shared by both FAB container and AppHeader (via prop)
const glassStyle = computed(() =>
  randomPortfolioColor.value
    ? { backgroundColor: `${randomPortfolioColor.value}22` }
    : {},
)

// AppHeader brand-color:
//   - home page  → same random portfolio color as FAB
//   - detail page → the specific holding's brand color
//   - other pages → null (no tint)
const headerBrandColor = computed<string | null>(() => {
  if (isDetail.value) return brandColorFor(String(route.params.symbol ?? '')) ?? null
  if (isHome.value) return randomPortfolioColor.value
  return null
})

const mainEl = ref<HTMLElement | null>(null)
const pullY = ref(0)
const pulling = ref(false)
let startY = 0

const PULL_THRESHOLD = 80
const MAX_PULL = 140

const pullReady = computed(() => pullY.value >= PULL_THRESHOLD && !refreshing.value)
const pullIndicatorHeight = computed(() => Math.min(pullY.value, MAX_PULL))
const pullIndicatorOpacity = computed(() => Math.min(pullY.value / PULL_THRESHOLD, 1))

// ─── FAB scroll hide/show via translateY ─────────────────────────────────────
// Slides out to the bottom when scrolling down, slides back in from the bottom
// when scrolling up. Pure transform — GPU composited, 60fps.

const fabVisible = ref(true)
let lastScrollY = 0
let scrollTicking = false
let accumulatedDown = 0
let accumulatedUp = 0

const COLLAPSE_AFTER = 70 // px down before hiding
const EXPAND_AFTER   = 35 // px up before showing

function onWindowScroll() {
  if (scrollTicking) return
  scrollTicking = true
  requestAnimationFrame(() => {
    const currentY = window.scrollY
    const delta = currentY - lastScrollY

    if (currentY <= 0) {
      fabVisible.value = true
      accumulatedDown = 0
      accumulatedUp = 0
    } else if (delta > 0) {
      accumulatedDown += delta
      accumulatedUp = 0
      if (accumulatedDown >= COLLAPSE_AFTER) {
        fabVisible.value = false
        accumulatedDown = 0
      }
    } else if (delta < 0) {
      accumulatedUp += Math.abs(delta)
      accumulatedDown = 0
      if (accumulatedUp >= EXPAND_AFTER) {
        fabVisible.value = true
        accumulatedUp = 0
      }
    }

    lastScrollY = currentY
    scrollTicking = false
  })
}

onMounted(() => {
  window.addEventListener('scroll', onWindowScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onWindowScroll)
})

// ─── Pull to refresh ─────────────────────────────────────────────────────────

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

<style scoped>
/* ── FAB slide wrapper ───────────────────────────────────
   GPU-composited translateY transition for 60fps hide/show.
   will-change: transform tells the browser to promote this
   layer ahead of time so the animation never drops frames. */
.fab-slide {
  will-change: transform;
  transition: transform 380ms cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-slide--hidden {
  /* Slide out: move down by 100% of own height + safe-area + padding so it
     fully disappears below the viewport edge */
  transform: translateY(calc(100% + max(2rem, env(safe-area-inset-bottom, 2rem))));
  pointer-events: none;
}

/* ── FAB label ───────────────────────────────────────── */
.fab-label {
  font-size: 0.9375rem; /* 15px */
  white-space: nowrap;
}

/* ── Page-entry fade-up (route enter/leave) ──────────── */
.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: opacity 300ms ease, transform 300ms cubic-bezier(0.34, 1.2, 0.64, 1);
}

.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
