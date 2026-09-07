<script setup lang="ts">
export interface DonutSegment {
  label: string
  value: number
  color: string
}

const props = defineProps<{
  segments: DonutSegment[]
  size?: number
}>()

const size = computed(() => props.size ?? 160)
const stroke = 14
const radius = computed(() => (size.value - stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const total = computed(() => props.segments.reduce((s, p) => s + p.value, 0))

interface Arc {
  d: string
  color: string
}

const arcs = computed<Arc[]>(() => {
  if (!total.value) return []
  let offset = 0
  return props.segments.map((seg) => {
    const fraction = seg.value / total.value
    const startA = offset * 2 * Math.PI - Math.PI / 2
    const endA = startA + fraction * 2 * Math.PI
    offset += fraction
    const large = fraction > 0.5 ? 1 : 0
    const c = radius.value
    const s = size.value / 2
    return {
      color: seg.color,
      d: `M ${s + c * Math.cos(startA)} ${s + c * Math.sin(startA)} A ${c} ${c} 0 ${large} 1 ${s + c * Math.cos(endA)} ${s + c * Math.sin(endA)}`,
    }
  })
})
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" role="img" aria-label="Portfolio allocation donut chart">
    <defs>
      <filter id="donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.12)" />
      </filter>
    </defs>
    <circle :cx="size/2" :cy="size/2" :r="radius" class="fill-none stroke-border" :stroke-width="stroke" />
    <path
      v-for="(arc, i) in arcs"
      :key="i"
      :d="arc.d"
      :stroke="arc.color"
      class="fill-none"
      :stroke-width="stroke"
      stroke-linecap="round"
    />
  </svg>
</template>