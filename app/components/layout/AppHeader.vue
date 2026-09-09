<script setup lang="ts">
import { Settings, Sun, Moon, ArrowLeft } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    refreshing?: boolean
    backTo?: string
    brandColor?: string | null
  }>(),
  {
    refreshing: false,
    backTo: undefined,
    brandColor: null,
  },
)

const route = useRoute()
const isSettings = computed(() => route.path === '/settings')

const colorMode = useColorMode()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const isDark = computed(() => colorMode.value === 'dark')

const glassStyle = computed(() =>
  props.brandColor ? { backgroundColor: `${props.brandColor}22` } : {},
)
</script>

<template>
  <header class="fixed inset-x-0 top-3 z-40 flex justify-center px-4 pointer-events-none">
    <div
      class="w-full max-w-md pointer-events-auto rounded-[1.75rem] bg-white/40 dark:bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden p-1.5 transition-all duration-300 ease-out"
      :style="glassStyle"
    >
      <div class="flex items-center justify-between gap-2">
        <!-- Left: Brand or Back Button -->
        <NuxtLink
          v-if="isSettings || backTo"
          :to="backTo ?? '/'"
          aria-label="Back to Portfolio"
          class="inline-flex min-w-0 items-center gap-2 rounded-full bg-white/50 dark:bg-white/10 h-12 pl-4 pr-5 text-sm font-medium text-foreground/80 backdrop-blur-xl cursor-pointer ios-press hover:bg-white/70 dark:hover:bg-white/20 transition-colors shrink-0"
        >
          <ArrowLeft class="size-4 shrink-0" />
          <span>Portfolio</span>
        </NuxtLink>

        <NuxtLink
          v-else
          to="/"
          class="inline-flex min-w-0 items-center gap-2.5 rounded-full bg-white/50 dark:bg-white/10 h-12 pl-2 pr-5 font-medium text-foreground/80 backdrop-blur-xl cursor-pointer ios-press hover:bg-white/70 dark:hover:bg-white/20 transition-colors"
        >
          <img
            src="/pwa-192x192.png"
            alt="fastvest"
            width="32"
            height="32"
            class="size-8 rounded-full object-cover shrink-0"
          />
          <span class="font-serif text-sm font-semibold tracking-tight text-foreground/90">Portfolio</span>
        </NuxtLink>

        <!-- Right: Actions -->
        <div class="flex items-center gap-1">
          <NuxtLink
            v-if="!isSettings"
            to="/settings"
            aria-label="Settings"
            class="rounded-full bg-white/50 dark:bg-white/10 size-12 shrink-0 inline-flex items-center justify-center cursor-pointer ios-press transition-colors hover:bg-white/70 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground"
          >
            <Settings class="size-4" />
          </NuxtLink>


          <button
            type="button"
            aria-label="Toggle theme"
            class="rounded-full bg-white/50 dark:bg-white/10 size-12 shrink-0 inline-flex items-center justify-center cursor-pointer ios-press transition-colors hover:bg-white/70 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground"
            @click="colorMode.preference = isDark ? 'light' : 'dark'"
          >
            <Sun v-if="mounted && isDark" class="size-4" />
            <Moon v-else class="size-4" />
          </button>
        </div>
      </div>
    </div>
  </header>
  <div class="h-20" aria-hidden="true" />
</template>
