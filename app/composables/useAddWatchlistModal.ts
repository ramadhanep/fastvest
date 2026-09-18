const isWatchModalOpen = ref(false)

export function useAddWatchlistModal() {
  function open() {
    isWatchModalOpen.value = true
  }
  function close() {
    isWatchModalOpen.value = false
  }
  return {
    isOpen: isWatchModalOpen,
    open,
    close,
  }
}