<script setup lang="ts">
const { preferences, applyTheme } = usePreferences()
const { online, justBackOnline } = useConnection()

applyTheme()

const showReconnected = ref(false)
watch(justBackOnline, (v) => {
  if (v) {
    showReconnected.value = true
    window.setTimeout(() => (showReconnected.value = false), 3000)
  }
})
</script>

<template>
  <div class="min-h-dvh">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <div
      class="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 transition-opacity duration-300"
      :class="showReconnected && !online ? 'opacity-0' : 'opacity-100'"
    >
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        leave-active-class="transition-all duration-200 ease-in"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="showReconnected"
          class="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg"
        >
          Back online · refreshing prices
        </div>
      </Transition>
    </div>
    <UiSonner :theme="preferences.theme === 'system' ? undefined : preferences.theme" rich-colors />
  </div>
</template>