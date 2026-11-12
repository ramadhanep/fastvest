<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { XIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  injectDialogRootContext,
  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import DialogOverlay from './DialogOverlay.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DialogContentProps & { class?: HTMLAttributes['class'], showCloseButton?: boolean }>(), {
  showCloseButton: true,
})
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)

// ─── Swipe down to dismiss (iOS sheet) ──────────────────────────────────────
// Only when nothing under the finger is scrolled; otherwise the drag belongs to
// the scroll. Released past DISMISS_AFTER closes, anything less springs back.
const DISMISS_AFTER = 110
const root = injectDialogRootContext()
const dragY = ref(0)
const dragging = ref(false)
let startY = 0

function scrolledAncestor(target: EventTarget | null, sheet: HTMLElement): boolean {
  for (let el = target as HTMLElement | null; el && el !== sheet.parentElement; el = el.parentElement) {
    if (el.scrollTop > 0) return true
  }
  return false
}

function onSheetTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  if (!t || scrolledAncestor(e.target, e.currentTarget as HTMLElement)) return
  startY = t.clientY
  dragging.value = true
}

function onSheetTouchMove(e: TouchEvent) {
  const t = e.touches[0]
  if (!dragging.value || !t) return
  dragY.value = Math.max(0, t.clientY - startY)
}

function onSheetTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (dragY.value > DISMISS_AFTER) root.onOpenChange(false)
  dragY.value = 0
}
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ 'aria-describedby': undefined, ...$attrs, ...forwarded }"
      :style="dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined"
      @touchstart.passive="onSheetTouchStart"
      @touchmove.passive="onSheetTouchMove"
      @touchend="onSheetTouchEnd"
      @touchcancel="dragging = false; dragY = 0"
      :class="cn('bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-open:slide-in-from-bottom data-closed:slide-out-to-bottom ring-foreground/10 grid gap-4 rounded-t-3xl px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-sm ring-1 transition-transform duration-[300ms] ease-[cubic-bezier(0.32,0.72,0,1)] fixed inset-x-0 bottom-0 mx-auto z-50 w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain outline-none', props.class)"
    >
      <!-- Mobile-only app: every dialog is a bottom sheet. Grabber is decorative. -->
      <div aria-hidden="true" class="mx-auto -mt-1 -mb-2 h-1 w-9 rounded-full bg-muted-foreground/30" />
      <slot />

      <DialogClose
        v-if="showCloseButton"
        data-slot="dialog-close"
        as-child
      >
        <Button variant="ghost" class="absolute top-2 right-2" size="icon-sm">
          <XIcon />
          <span class="sr-only">Close</span>
        </Button>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>

