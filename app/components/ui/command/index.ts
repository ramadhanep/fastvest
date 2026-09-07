import type { InjectionKey, Ref } from 'vue'
import { provide, inject } from 'vue'

export { default as Command } from './Command.vue'
export { default as CommandDialog } from './CommandDialog.vue'
export { default as CommandEmpty } from './CommandEmpty.vue'
export { default as CommandGroup } from './CommandGroup.vue'
export { default as CommandInput } from './CommandInput.vue'
export { default as CommandItem } from './CommandItem.vue'
export { default as CommandList } from './CommandList.vue'
export { default as CommandSeparator } from './CommandSeparator.vue'
export { default as CommandShortcut } from './CommandShortcut.vue'

export interface CommandFilterState {
  search: string
  filtered: {
    count: number
    items: Map<string, number>
    groups: Set<string>
  }
}

export interface CommandContextState {
  allItems: Ref<Map<string, string>>
  allGroups: Ref<Map<string, Set<string>>>
  filterState: CommandFilterState
}

export const CommandContextKey: InjectionKey<CommandContextState> = Symbol('CommandContext')
export const CommandGroupKey: InjectionKey<{ id: string }> = Symbol('CommandGroup')

export function provideCommandContext(state: CommandContextState) {
  provide(CommandContextKey, state)
}

export function useCommand(): CommandContextState {
  const ctx = inject(CommandContextKey)
  if (!ctx)
    throw new Error('useCommand must be used within Command')
  return ctx
}

export function provideCommandGroupContext(state: { id: string }) {
  provide(CommandGroupKey, state)
}

export function useCommandGroup(): { id: string } | undefined {
  return inject(CommandGroupKey)
}