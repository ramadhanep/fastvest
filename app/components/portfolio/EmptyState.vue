<script setup lang="ts">
import { Plus } from '@lucide/vue'

const { t } = useI18n()

const emit = defineEmits<{
  add: []
  loadDemo: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div class="flex items-center justify-center size-14 rounded-2xl bg-muted/50 mb-4">
      <span class="text-2xl font-bold text-muted-foreground">FV</span>
    </div>

    <h1 class="text-lg font-semibold tracking-tight text-foreground">
      {{ t('emptyTitle') }}
    </h1>
    <p class="mt-1 max-w-[240px] text-xs text-muted-foreground leading-relaxed">
      {{ t('emptyBody') }}
    </p>

    <div class="mt-5 flex flex-col items-center gap-2.5 w-full max-w-[200px]">
      <button
        type="button"
        class="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all ios-press cursor-pointer"
        @click="emit('add')"
      >
        <Plus class="size-4" />
        {{ t('emptyAdd') }}
      </button>

      <button
        type="button"
        class="w-full inline-flex items-center justify-center h-10 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ios-press cursor-pointer"
        @click="emit('loadDemo')"
      >
        {{ t('emptyLoadDemo') }}
      </button>
    </div>
  </div>
</template>
