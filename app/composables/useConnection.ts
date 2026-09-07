export function useConnection() {
  const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const offlineSince = ref<number | null>(null)
  const justBackOnline = ref(false)

  function setOnline(value: boolean) {
    if (value === online.value) return
    online.value = value
    if (value) {
      offlineSince.value = null
      justBackOnline.value = true
      window.setTimeout(() => (justBackOnline.value = false), 3000)
    } else {
      offlineSince.value = Date.now()
    }
  }

  if (import.meta.client) {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    onUnmounted(() => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    })
  }

  return {
    online: readonly(online),
    offlineSince: readonly(offlineSince),
    justBackOnline: readonly(justBackOnline),
  }
}