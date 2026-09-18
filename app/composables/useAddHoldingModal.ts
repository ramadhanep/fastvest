const isAddModalOpen = ref(false)
const prefill = ref<{ symbol: string; name?: string } | null>(null)

export function useAddHoldingModal() {
  function open() {
    isAddModalOpen.value = true
  }
  function close() {
    isAddModalOpen.value = false
  }
  function openWith(symbol: string, name?: string) {
    prefill.value = { symbol, name }
    open()
  }
  function takePrefill(): { symbol: string; name?: string } | null {
    const p = prefill.value
    prefill.value = null
    return p
  }
  return {
    isOpen: isAddModalOpen,
    open,
    close,
    openWith,
    takePrefill,
  }
}
