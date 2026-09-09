<template>
  <div class="min-h-dvh bg-background text-foreground flex flex-col relative antialiased selection:bg-muted">
    <AppHeader
      :refreshing="refreshing"
      :last-updated="lastUpdated"
      :back-to="isDetail ? '/' : undefined"
      :brand-color="detailBrandColor"
      @refresh="headerRefresh"
    />
    <OfflineIndicator />
    <main class="mx-auto w-full max-w-md px-4 pb-28 pt-2 flex-1">
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

const { refreshing, lastUpdated, refresh } = useQuotes()
const { holdings } = usePortfolio()
const addModal = useAddHoldingModal()
const route = useRoute()
const isHome = computed(() => route.path === '/')
const isDetail = computed(() => route.path.startsWith('/holding/'))
const detailBrandColor = computed<string | null>(() =>
  isDetail.value ? brandColorFor(String(route.params.symbol ?? '')) ?? null : null,
)

function headerRefresh() {
  refresh(holdings.value.map((h) => h.symbol))
}
</script>
