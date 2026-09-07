<script setup lang="ts">
import { WifiOff } from '@lucide/vue'

const { online, offlineSince } = useConnection()

const isOffline = computed(() => !online.value)
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    leave-active-class="transition-all duration-200 ease-in"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div v-if="isOffline" class="sticky top-14 z-20 flex justify-center">
      <div class="flex w-full max-w-5xl items-center gap-2 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
        <WifiOff class="size-4 shrink-0" />
        <span>Offline · showing cached prices</span>
      </div>
    </div>
  </Transition>
</template>