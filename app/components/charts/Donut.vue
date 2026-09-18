<script setup lang="ts">
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { formatCompact } from '~/utils/format'

use([CanvasRenderer, PieChart, TooltipComponent])

export interface DonutSegment {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{
    segments: DonutSegment[]
    size?: number
    selected?: string | null
  }>(),
  { size: 160, selected: null },
)

const emit = defineEmits<{
  (e: 'select', symbol: string): void
}>()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const tooltipBg = computed(() => (isDark.value ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.96)'))
const tooltipBorder = computed(() => (isDark.value ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'))
const tooltipText = computed(() => (isDark.value ? '#f5f5f7' : '#1c1c1e'))
const ringBorder = computed(() => (isDark.value ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'))

const total = computed(() => props.segments.reduce((s, p) => s + p.value, 0))

const pieData = computed(() =>
  props.segments.map((s) => ({
    name: s.label,
    value: s.value,
    itemStyle: {
      color: s.color,
      opacity: props.selected && props.selected !== s.label ? 0.3 : 1,
    },
  })),
)

interface TooltipParam {
  name: string
  color: string
  value: number
}

const option = computed(() => ({
  animationDuration: 700,
  animationEasing: 'cubicOut' as const,
  tooltip: {
    trigger: 'item' as const,
    confine: true,
    backgroundColor: tooltipBg.value,
    borderColor: tooltipBorder.value,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: tooltipText.value, fontSize: 12, fontFamily: 'Domine, system-ui, serif' },
    formatter: (p: TooltipParam) => {
      const pct = total.value ? (p.value / total.value) * 100 : 0
      const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>`
      return `<div style="font-size:12px">${dot}<strong>${p.name}</strong> · <span style="opacity:.7">${formatCompact(p.value)}</span></div><div style="font-size:11px;opacity:.7">${pct.toFixed(1)}% of portfolio</div>`
    },
  },
  series: [
    {
      type: 'pie' as const,
      radius: ['63%', '85%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: ringBorder.value, borderWidth: 2 },
      label: { show: false },
      emphasis: {
        scaleSize: 8,
        label: { show: false },
      },
      data: pieData.value,
    },
  ],
}))

function onClick(params: { name?: string; data?: unknown }) {
  const data = params.data as { name?: string } | null | undefined
  const label = data?.name ?? params.name
  if (label) emit('select', label)
}

const chartRef = ref<{ resize: () => void } | null>(null)

function resize() {
  chartRef.value?.resize()
}

defineExpose({ resize })
</script>

<template>
  <div role="img" :style="{ width: `${size}px` }" :aria-label="`Portfolio allocation: ${total ? total.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 0} total, ${segments.length} assets`">
    <VChart
      ref="chartRef"
      class="w-full"
      :style="{ height: `${size}px` }"
      :option="option"
      autoresize
      @click="onClick"
    />
  </div>
</template>