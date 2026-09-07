import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'vue'

export { default as Input } from './InputGroupInput.vue'
export { default as InputGroup } from './InputGroup.vue'
export { default as InputGroupAddon } from './InputGroupAddon.vue'
export { default as InputGroupButton } from './InputGroupButton.vue'
export { default as InputGroupTextarea } from './InputGroupTextarea.vue'
export { default as InputGroupText } from './InputGroupText.vue'

export type InputGroupAddonVariants = VariantProps<typeof inputGroupAddonVariants>

export const inputGroupButtonVariants = cva(
  '',
  {
    variants: {
      size: {
        default: 'h-8',
        sm: 'h-7',
        xs: 'h-6',
        lg: 'h-9',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

export const inputGroupAddonVariants = cva(
  'inline-flex min-w-fit items-center justify-center border-input text-muted-foreground bg-(--background) z-10 rounded-lg border px-2.5 text-sm rtl:origin-right transition-all',
  {
    variants: {
      align: {
        'default': 'rounded-r-none',
        'inline-start': 'border-r-0 rounded-r-none',
        'inline-end': 'border-l-0 rounded-l-none',
      },
    },
    defaultVariants: {
      align: 'default',
    },
  },
)

export type InputGroupButtonProps = {
  size?: VariantProps<typeof inputGroupButtonVariants>['size']
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  class?: HTMLAttributes['class']
}