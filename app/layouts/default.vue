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

    <!-- Animated FAB (only on home page) -->
    <!-- Full-width bar when scrolled up or at top; compact pill when scrolling down -->
    <Transition name="fab-fade">
      <div
        v-if="isHome"
        class="fixed bottom-0 inset-x-0 z-40 flex items-end justify-center pb-6 px-4 pointer-events-none"
        style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 1.5rem))"
      >
        <div
          class="pointer-events-auto fab-container"
          :class="fabExpanded ? 'fab-expanded' : 'fab-collapsed'"
        >
          <button
            type="button"
            class="fab-button ios-press"
            :class="fabExpanded ? 'fab-button-expanded' : 'fab-button-collapsed'"
            :aria-label="fabExpanded ? 'Add Portfolio' : 'Add Holding'"
            @click="addModal.open"
          >
            <!-- Icon always visible -->
            <Plus class="fab-icon shrink-0" :class="fabExpanded ? 'size-5' : 'size-5.5'" />
            <!-- Label only in expanded state -->
            <span
              class="fab-label font-medium tracking-tight"
              :class="fabExpanded ? 'fab-label-visible' : 'fab-label-hidden'"
            >
              Add Portfolio
            </span>
          </button>
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

// ─── Animated FAB scroll logic ───────────────────────────────────────────────
// fabExpanded = true  → full-width pill (at top or scrolling up)
// fabExpanded = false → compact round button (scrolling down)

const fabExpanded = ref(true)

let lastScrollY = 0
let scrollTicking = false
let accumulatedDown = 0   // accumulated downward movement
let accumulatedUp = 0     // accumulated upward movement

const COLLAPSE_AFTER = 60  // px scrolled down to collapse
const EXPAND_AFTER = 30    // px scrolled up to expand

function onWindowScroll() {
  if (scrollTicking) return
  scrollTicking = true
  requestAnimationFrame(() => {
    const currentY = window.scrollY
    const delta = currentY - lastScrollY

    if (currentY <= 0) {
      // At very top — always expand
      fabExpanded.value = true
      accumulatedDown = 0
      accumulatedUp = 0
    } else if (delta > 0) {
      // Scrolling down
      accumulatedDown += delta
      accumulatedUp = 0
      if (accumulatedDown >= COLLAPSE_AFTER) {
        fabExpanded.value = false
        accumulatedDown = 0
      }
    } else if (delta < 0) {
      // Scrolling up
      accumulatedUp += Math.abs(delta)
      accumulatedDown = 0
      if (accumulatedUp >= EXPAND_AFTER) {
        fabExpanded.value = true
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
/* ── FAB container ───────────────────────────────────── */
.fab-container {
  transition:
    max-width 420ms cubic-bezier(0.34, 1.56, 0.64, 1),
    border-radius 420ms cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: max-width, border-radius;
}

.fab-expanded {
  max-width: 28rem; /* matches max-w-md */
  width: 100%;
  border-radius: 9999px;
}

.fab-collapsed {
  max-width: 52px;
  width: 52px;
  border-radius: 9999px;
  /* Shift to right side */
  margin-left: auto;
}

/* ── FAB button ──────────────────────────────────────── */
.fab-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  cursor: pointer;
  background: var(--foreground);
  color: var(--background);
  border: none;
  outline: none;
  overflow: hidden;
  /* shadow */
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.18),
    0 1px 4px rgba(0, 0, 0, 0.10);
  transition:
    height 420ms cubic-bezier(0.34, 1.56, 0.64, 1),
    border-radius 420ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 300ms ease,
    opacity 200ms ease;
  will-change: height, border-radius;
}

.fab-button-expanded {
  height: 52px;
  border-radius: 9999px;
  gap: 0.5rem;
  padding: 0 1.5rem;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.22),
    0 2px 8px rgba(0, 0, 0, 0.12);
}

.fab-button-collapsed {
  height: 52px;
  border-radius: 9999px;
  gap: 0;
  padding: 0;
}

.fab-button:active {
  opacity: 0.85;
  transform: scale(0.97);
}

/* ── FAB icon ────────────────────────────────────────── */
.fab-icon {
  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

/* ── FAB label ───────────────────────────────────────── */
.fab-label {
  font-size: 0.9375rem; /* 15px */
  white-space: nowrap;
  overflow: hidden;
  transition:
    max-width 380ms cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 280ms ease,
    margin-left 380ms cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: max-width, opacity;
}

.fab-label-visible {
  max-width: 200px;
  opacity: 1;
}

.fab-label-hidden {
  max-width: 0;
  opacity: 0;
  pointer-events: none;
}

/* ── Fade in/out the entire FAB wrapper ─────────────── */
.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: opacity 300ms ease, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>

