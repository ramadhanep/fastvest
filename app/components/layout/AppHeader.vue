<script setup lang="ts">
import { Settings, RefreshCw, Sun, Moon, ArrowLeft } from '@lucide/vue'
import { formatTimeAgo } from '~/utils/format'

const props = withDefaults(
  defineProps<{
    refreshing?: boolean
    lastUpdated?: string | null
    backTo?: string
  }>(),
  {
    refreshing: false,
    lastUpdated: null,
    backTo: undefined,
  },
)

const emit = defineEmits<{
  refresh: []
}>()

const route = useRoute()
const isSettings = computed(() => route.path === '/settings')

const colorMode = useColorMode()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const isDark = computed(() => colorMode.value === 'dark')
const timeLabel = computed(() => (props.lastUpdated ? formatTimeAgo(props.lastUpdated) : ''))
</script>

<template>
  <header class="fixed inset-x-0 top-3 z-40 flex justify-center px-4 pointer-events-none">
    <div
      class="w-full max-w-2xl pointer-events-auto rounded-[2rem] border border-white/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden p-2 transition-all duration-300 ease-out"
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
          class="inline-flex min-w-0 items-center gap-2.5 rounded-full bg-white/50 dark:bg-white/10 h-12 pl-4 pr-5 text-sm font-medium text-foreground/80 backdrop-blur-xl cursor-pointer ios-press hover:bg-white/70 dark:hover:bg-white/20 transition-colors"
        >
          <span class="font-bold tracking-tight text-base text-foreground">FastVest</span>
          <span v-if="refreshing" class="text-xs text-muted-foreground flex items-center gap-1.5 font-normal">
            <RefreshCw class="size-3 animate-spin" />
            Updating
          </span>
          <span v-else-if="lastUpdated" class="text-xs text-muted-foreground font-normal">
            {{ timeLabel }}
          </span>
        </NuxtLink>

        <!-- Right: Actions -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded-full bg-white/50 dark:bg-white/10 size-12 shrink-0 inline-flex items-center justify-center cursor-pointer ios-press transition-colors hover:bg-white/70 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground"
            :class="{ 'text-foreground': refreshing }"
            aria-label="Refresh quotes"
            :disabled="refreshing"
            @click="emit('refresh')"
          >
            <RefreshCw class="size-4" :class="{ 'animate-spin': refreshing }" />
          </button>

          <NuxtLink
            v-if="!isSettings"
            to="/settings"
            aria-label="Settings"
            class="rounded-full bg-white/50 dark:bg-white/10 size-12 shrink-0 inline-flex items-center justify-center cursor-pointer ios-press transition-colors hover:bg-white/70 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground"
          >
            <Settings class="size-4" />
          </NuxtLink>

          <a
            href="https://github.com/ramadhanep/fastvest"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            class="rounded-full bg-white/50 dark:bg-white/10 size-12 shrink-0 inline-flex items-center justify-center cursor-pointer ios-press transition-colors hover:bg-white/70 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="size-4" aria-hidden="true">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12Z"
              />
            </svg>
          </a>

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
