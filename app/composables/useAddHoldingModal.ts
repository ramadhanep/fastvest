const isAddModalOpen = ref(false)

export function useAddHoldingModal() {
  function open() {
    isAddModalOpen.value = true
  }
  function close() {
    isAddModalOpen.value = false
  }
  return {
    isOpen: isAddModalOpen,
    open,
    close,
  }
}
