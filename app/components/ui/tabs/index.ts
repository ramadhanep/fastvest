import { cva, type VariantProps } from 'class-variance-authority'

export { default as Tabs } from './Tabs.vue'
export { default as TabsContent } from './TabsContent.vue'
export { default as TabsList } from './TabsList.vue'
export { default as TabsTrigger } from './TabsTrigger.vue'

export const tabsListVariants = cva(
  'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        outline: 'border border-input rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type TabsListVariants = VariantProps<typeof tabsListVariants>