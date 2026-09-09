<script setup lang="ts">
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components'
import type { ChartPoint } from '#shared/types'
import { formatCurrency, formatNumber } from '~/utils/format'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent])

const props = withDefaults(
  defineProps<{
    points: ChartPoint[]
    currency?: string
    brandColor?: string
    height?: number
  }>(),
  {
    currency: 'USD',
    brandColor: 'var(--chart-2)',
    height: 260,
  },
)

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const axisColor = computed(() => (isDark.value ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'))
const labelColor = computed(() => (isDark.value ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'))
const gridColor = computed(() => (isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'))
const tooltipBg = computed(() => (isDark.value ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.96)'))
const tooltipBorder = computed(() => (isDark.value ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'))
const tooltipText = computed(() => (isDark.value ? '#f5f5f7' : '#1c1c1e'))

const hex = computed(() => {
  if (props.brandColor?.startsWith('#')) return props.brandColor
  return null
})

function hexToRgba(h: string, alpha: number): string {
  const c = h.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const lineColor = computed(() => hex.value ?? (isDark.value ? '#e8e8ea' : '#1c1c1e'))

const data = computed(() =>
  props.points.map((p) => ({ value: [new Date(p.timestamp * (p.timestamp < 1e12 ? 1000 : 1)), p.close] as [Date, number] })),
)

const option = computed(() => ({
  animationDuration: 500,
  animationEasing: 'cubicOut' as const,
  grid: { left: 4, right: 8, top: 16, bottom: 6, containLabel: false },
  tooltip: {
    trigger: 'axis' as const,
    triggerOn: 'mousemove' as const,
    confine: true,
    backgroundColor: tooltipBg.value,
    borderColor: tooltipBorder.value,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: tooltipText.value, fontSize: 12, fontFamily: 'Domine, system-ui, serif' },
    formatter: (params: { value: (number | Date)[]; name: string }[]) => {
      const p = params[0]
      if (!p) return ''
      const d = p.value[0] as Date
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const close = p.value[1] as number
      return `<div style="font-size:11px;opacity:.7;margin-bottom:2px">${dateStr}</div><strong>${formatCurrency(close, props.currency)}</strong>`
    },
  },
  xAxis: {
    type: 'time' as const,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: labelColor.value, fontSize: 10, hideOverlap: true },
    splitLine: { show: false },
  },
  yAxis: {
    type: 'value' as const,
    scale: true,
    position: 'right' as const,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: labelColor.value, fontSize: 10, formatter: (v: number) => formatNumber(v) },
    splitLine: { lineStyle: { color: gridColor.value, type: 'dashed' as const } },
  },
  dataZoom: [
    {
      type: 'inside' as const,
      throttle: 60,
      zoomOnMouseWheel: false,
      moveOnMouseMove: false,
      moveOnMouseWheel: true,
    },
  ],
  series: [
    {
      name: 'close',
      type: 'line' as const,
      data: data.value,
      showSymbol: false,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      sampling: 'lttb' as const,
      lineStyle: { color: lineColor.value, width: 2.5 },
      itemStyle: { color: lineColor.value },
      areaStyle: hex.value
        ? {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: hexToRgba(hex.value, 0.22) },
                { offset: 1, color: hexToRgba(hex.value, 0) },
              ],
            },
          }
        : undefined,
      markLine: {
        silent: true,
        symbol: 'none' as const,
        data: [{ type: 'average' as const }],
        lineStyle: { color: gridColor.value, type: 'dashed' as const, width: 1 },
        label: { show: false },
      },
      emphasis: { focus: 'series' as const },
    },
  ],
}))
</script>

<template>
  <VChart
    :option="option"
    autoresize
    class="w-full"
    :style="{ height: `${height}px` }"
  />
</template>