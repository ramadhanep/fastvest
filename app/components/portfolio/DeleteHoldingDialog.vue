<script setup lang="ts">
import { Trash2 } from '@lucide/vue'
import type { Holding } from '#shared/types'

defineProps<{
  holding: Holding | null
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <UiActionSheet :open="!!holding" @close="emit('close')">
    <div class="px-5 pt-4 pb-2" v-if="holding">
      <p class="text-sm font-semibold">Delete {{ holding.symbol }}?</p>
      <p class="text-[11px] text-muted-foreground mt-0.5">This removes the holding from your portfolio.</p>
    </div>
    <div class="px-5 pt-1 pb-5">
      <button
        type="button"
        class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-destructive text-destructive-foreground h-12 text-sm font-semibold transition-colors ios-press cursor-pointer hover:bg-destructive/90 active:bg-destructive/80"
        @click="emit('confirm')"
      >
        <Trash2 class="size-4" aria-hidden="true" />
        Delete {{ holding?.symbol }}
      </button>
      <p class="mt-2 text-center text-[11px] text-muted-foreground">Tap outside to cancel</p>
    </div>
  </UiActionSheet>
</template>