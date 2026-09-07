<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAssetLogoUrl, getSymbolInitials } from '~/utils/asset-logos'

const props = withDefaults(
  defineProps<{
    symbol: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    size: 'md',
  },
)

const imgFailed = ref(false)
const logoUrl = computed(() => (imgFailed.value ? null : getAssetLogoUrl(props.symbol)))
const initials = computed(() => getSymbolInitials(props.symbol))

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-8 text-[11px]'
    case 'lg':
      return 'size-11 text-sm'
    case 'md':
    default:
      return 'size-9 text-xs'
  }
})
</script>

<template>
  <div class="relative shrink-0 flex items-center justify-center select-none" :class="sizeClasses">
    <img
      v-if="logoUrl"
      :src="logoUrl"
      :alt="symbol"
      class="size-full rounded-full object-contain"
      loading="lazy"
      @error="imgFailed = true"
    />
    <div
      v-else
      class="size-full rounded-full bg-muted border border-border/60 text-muted-foreground font-semibold flex items-center justify-center uppercase tracking-tight"
    >
      {{ initials }}
    </div>
  </div>
</template>
