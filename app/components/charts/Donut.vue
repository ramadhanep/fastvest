<script setup lang="ts">
export interface DonutSegment {
  label: string
  value: number
  color: string
}

const props = defineProps<{
  segments: DonutSegment[]
  size?: number
  animate?: boolean
}>()

const size = computed(() => props.size ?? 160)
const stroke = 14
const radius = computed(() => (size.value - stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const total = computed(() => props.segments.reduce((s, p) => s + p.value, 0))

interface Arc {
  d: string
  color: string
  length: number
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
      length: fraction * circumference.value,
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
      class="fill-none donut-arc"
      :class="{ 'donut-arc--animate': animate }"
      :stroke-width="stroke"
      stroke-linecap="round"
      :style="{
        '--dash': `${arc.length}`,
        animationDelay: animate ? `${i * 90}ms` : undefined,
      }"
    />
  </svg>
</template>

<style scoped>
.donut-arc {
  stroke-dasharray: var(--dash);
  stroke-dashoffset: var(--dash);
}

.donut-arc--animate {
  animation: donut-dash-in 700ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

@keyframes donut-dash-in {
  from {
    stroke-dashoffset: var(--dash);
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>