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

function hexChannel(h: string, shift: number): number {
  return (parseInt(h.slice(1), 16) >> shift) & 255
}

function luminance(h: string): number {
  const r = hexChannel(h, 16) / 255
  const g = hexChannel(h, 8) / 255
  const b = hexChannel(h, 0) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function blendToLuminance(h: string, target: number): string {
  const r = hexChannel(h, 16)
  const g = hexChannel(h, 8)
  const b = hexChannel(h, 0)
  const cur = luminance(h)
  if (Math.abs(cur - target) < 0.001) return h
  const k = (target - cur) / Math.max(cur, 0.0001)
  const br = Math.round(Math.max(0, Math.min(255, r + 255 * k)))
  const bg = Math.round(Math.max(0, Math.min(255, g + 255 * k)))
  const bb = Math.round(Math.max(0, Math.min(255, b + 255 * k)))
  return `#${((br << 16) | (bg << 8) | bb).toString(16).padStart(6, '0')}`
}

/** Adapts brand color so it always stays visible on both dark and light backgrounds. */
function visibleBrandColor(brand: string, dark: boolean): string {
  const lum = luminance(brand)
  if (dark) {
    // Too dark on dark bg → lighten to lum 0.65
    if (lum < 0.4) return blendToLuminance(brand, 0.65)
  } else {
    // Too bright on light bg → darken to lum 0.4
    if (lum > 0.75) return blendToLuminance(brand, 0.4)
  }
  return brand
}

const lineColor = computed(() => {
  if (hex.value) return visibleBrandColor(hex.value, isDark.value)
  return isDark.value ? '#e8e8ea' : '#1c1c1e'
})

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
      areaStyle: lineColor.value !== (isDark.value ? '#e8e8ea' : '#1c1c1e')
        ? {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: `rgba(${hexChannel(lineColor.value, 16)},${hexChannel(lineColor.value, 8)},${hexChannel(lineColor.value, 0)},0.22)`,
                },
                {
                  offset: 1,
                  color: `rgba(${hexChannel(lineColor.value, 16)},${hexChannel(lineColor.value, 8)},${hexChannel(lineColor.value, 0)},0)`,
                },
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