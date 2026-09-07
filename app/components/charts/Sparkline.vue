<script setup lang="ts">
import type { ChartPoint } from '#shared/types'

const props = withDefaults(
  defineProps<{
    points: ChartPoint[]
    height?: number
    id?: string
  }>(),
  { height: 120, id: 'spark' },
)

const up = ref(true)

watch(
  () => props.points,
  (pts) => {
    if (pts.length > 1) {
      up.value = (pts[pts.length - 1]?.close ?? 0) >= (pts[0]?.close ?? 0)
    }
  },
  { immediate: true },
)

const viewBox = computed(() => {
  const pts = props.points
  if (pts.length < 2) return '0 0 100 60'
  const min = Math.min(...pts.map((p) => p.close))
  const max = Math.max(...pts.map((p) => p.close))
  const span = max - min || 1
  return `0 ${min - span * 0.2} 100 ${span * 1.4}`
})

const path = computed(() => {
  const pts = props.points
    if (pts.length < 2) return ''
    const min = Math.min(...pts.map((p) => p?.close ?? 0))
    const max = Math.max(...pts.map((p) => p?.close ?? 0))
  const span = max - min || 1
  const pad = span * 0.15
  const top = min - pad
  const h = span + pad * 2
  return pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * 100
      const y = ((max - p.close + pad) / h) * 60
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
})

const areaPath = computed(() => {
  if (!path.value) return ''
  const first = props.points[0]
  const last = props.points[props.points.length - 1]
    const min = Math.min(...props.points.map((p) => p?.close ?? 0))
    const max = Math.max(...props.points.map((p) => p?.close ?? 0))
  const span = max - min || 1
  const pad = span * 0.15
  const h = span + pad * 2
  const bottomY = ((max - (min - pad) + pad) / h) * 60
  return `${path.value} L 100 ${bottomY} L 0 ${bottomY} Z`
})

const color = computed(() => (up.value ? 'var(--chart-2)' : 'var(--destructive)'))

const gridId = computed(() => `${props.id}-grad`)
</script>

<template>
  <svg
    :viewBox="viewBox"
    preserveAspectRatio="none"
    class="h-full w-full"
    role="img"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="gridId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.25" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <template v-if="points.length">
      <path :d="areaPath" :fill="`url(#${gridId})`" />
      <path :d="path" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
    </template>
    <template v-else>
      <rect x="0" y="0" width="100%" height="100%" rx="4" class="fill-muted" />
    </template>
  </svg>
</template>