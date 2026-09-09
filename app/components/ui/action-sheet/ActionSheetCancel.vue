<template>
  <div class="px-4 pb-2 pt-1">
    <button
      type="button"
      class="w-full py-3 rounded-xl bg-muted text-sm font-semibold text-foreground transition-colors ios-press cursor-pointer hover:bg-muted/80 active:bg-muted"
    >
      <slot>
        Cancel
      </slot>
    </button>
  </div>
</template>
