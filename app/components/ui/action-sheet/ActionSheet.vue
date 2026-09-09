<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const sheetRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const animating = ref(false)

watch(
  () => props.open,
  (v) => {
    if (v) {
      visible.value = true
      animating.value = true
      requestAnimationFrame(() => {
        animating.value = false
      })
    } else {
      animating.value = true
      setTimeout(() => {
        visible.value = false
        animating.value = false
      }, 200)
    }
  },
)

function onBackdrop() {
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/40 transition-opacity duration-200"
        :class="open ? 'opacity-100' : 'opacity-0'"
        @click="onBackdrop"
      />

      <!-- Sheet -->
      <div
        ref="sheetRef"
        class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl bg-card overflow-hidden transition-all duration-200 ease-out"
        :class="open ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-[0.97]'"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>
