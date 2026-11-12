export interface ShareRow {
  label: string
  pct: number
  color: string
}

const MAX_ROWS = 10

/** Near-black brand colors vanish on the dark card; lift them to a readable gray. */
function visibleOn(dark: boolean, hex: string): string {
  if (!dark || !/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r! + 0.587 * g! + 0.114 * b! < 70 ? '#8E8E93' : hex
}

/** Collapse a long tail into "Others" so the image stays readable. */
export function topRows(rows: readonly ShareRow[], othersLabel: string): ShareRow[] {
  const sorted = [...rows].sort((a, b) => b.pct - a.pct)
  if (sorted.length <= MAX_ROWS) return sorted
  const head = sorted.slice(0, MAX_ROWS - 1)
  const rest = sorted.slice(MAX_ROWS - 1).reduce((s, r) => s + r.pct, 0)
  return [...head, { label: othersLabel, pct: rest, color: '#9CA3AF' }]
}

/**
 * Draws a 1080px-wide allocation card (percentages only — never amounts) for
 * sharing to chat/stories. Plain canvas, no chart library.
 */
export function renderAllocationImage(rows: readonly ShareRow[], title: string, footer: string, dark: boolean): Promise<Blob> {
  const W = 1080
  const PAD = 80
  const ROW_H = 96
  const H = PAD * 2 + 140 + rows.length * ROW_H + 60
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas unavailable'))

  const fg = dark ? '#F5F5F7' : '#1C1C1E'
  const muted = dark ? 'rgba(245,245,247,0.55)' : 'rgba(28,28,30,0.55)'
  const track = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const font = 'system-ui, -apple-system, "Segoe UI", sans-serif'

  ctx.fillStyle = dark ? '#0A0A0B' : '#F5F5F7'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = fg
  ctx.font = `700 56px ${font}`
  ctx.fillText(title, PAD, PAD + 56)

  let y = PAD + 140
  const barW = W - PAD * 2
  for (const r of rows) {
    const color = visibleOn(dark, r.color)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(PAD + 12, y + 2, 12, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = fg
    ctx.font = `600 36px ${font}`
    ctx.fillText(r.label, PAD + 40, y + 14)
    const pctText = `${r.pct.toFixed(1)}%`
    ctx.textAlign = 'right'
    ctx.fillText(pctText, W - PAD, y + 14)
    ctx.textAlign = 'left'

    ctx.fillStyle = track
    ctx.fillRect(PAD, y + 34, barW, 12)
    ctx.fillStyle = color
    ctx.fillRect(PAD, y + 34, Math.max(4, (barW * Math.min(r.pct, 100)) / 100), 12)
    y += ROW_H
  }

  ctx.fillStyle = muted
  ctx.font = `400 28px ${font}`
  ctx.fillText(footer, PAD, H - PAD + 20)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encode failed'))), 'image/png'),
  )
}

/** Web Share with a file when supported (iOS/Android), download otherwise. */
export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      throw e
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
