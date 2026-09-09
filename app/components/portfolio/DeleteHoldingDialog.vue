<script setup lang="ts">
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
    <div class="divide-y divide-border/40">
      <UiActionSheetItem destructive @click="emit('confirm')">
        Delete Holding
      </UiActionSheetItem>
    </div>
    <UiActionSheetCancel @click="emit('close')" />
  </UiActionSheet>
</template>
