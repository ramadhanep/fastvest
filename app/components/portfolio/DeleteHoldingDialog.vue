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
  <UiAlertDialog :open="!!holding" @update:open="(v: boolean) => !v && emit('close')">
    <UiAlertDialogContent class="sm:max-w-md rounded-3xl p-5 sm:p-6 border border-border/80 bg-card shadow-2xl">
      <UiAlertDialogHeader class="text-left">
        <UiAlertDialogTitle class="text-base font-semibold tracking-tight text-foreground">
          Delete {{ holding?.symbol }}?
        </UiAlertDialogTitle>
        <UiAlertDialogDescription class="text-xs text-muted-foreground leading-relaxed">
          This removes this holding from your local portfolio. You can export a backup first in Settings if needed.
        </UiAlertDialogDescription>
      </UiAlertDialogHeader>
      <UiAlertDialogFooter class="mt-4 flex gap-2">
        <UiAlertDialogCancel class="rounded-full h-10 flex-1 font-medium text-xs" @click="emit('close')">
          Cancel
        </UiAlertDialogCancel>
        <UiAlertDialogAction
          class="rounded-full h-10 flex-1 bg-destructive text-destructive-foreground font-medium text-xs hover:bg-destructive/90"
          @click="emit('confirm')"
        >
          Delete
        </UiAlertDialogAction>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>