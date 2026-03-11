"use client"

import * as React from "react"
import { CircleHelp, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Unit = "second" | "min" | "hour" | "day" | "week" | "month" | "year"

type Config = {
  company: string
  count: number
  emoji: string
  interval: number
  unit: Unit
}

type Preset = Config & {
  id: string
  sourceUrl?: string
}

type ConveyorItem = {
  id: number
  emoji: string
}

const UNIT_SECONDS: Record<Unit, number> = {
  second: 1,
  min: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
  month: 2592000,
  year: 31536000,
}

const UNIT_LABELS: Record<Unit, string> = {
  second: "second",
  min: "min",
  hour: "hour",
  day: "day",
  week: "week",
  month: "month",
  year: "year",
}

const UNIT_ALIASES: Record<string, Unit> = {
  second: "second",
  seconds: "second",
  min: "min",
  minute: "min",
  minutes: "min",
  hour: "hour",
  hours: "hour",
  day: "day",
  days: "day",
  week: "week",
  weeks: "week",
  month: "month",
  months: "month",
  year: "year",
  years: "year",
}

const QUERY_KEYS = ["company", "emoji", "count", "interval", "unit"] as const
const CUSTOM_ID = "custom"

const PRESETS: Preset[] = [
  {
    id: "apple",
    company: "Apple",
    emoji: "📱",
    count: 251_700_000,
    interval: 1,
    unit: "year",
    sourceUrl:
      "https://www.idc.com/promo/smartphone-market-share/market-share/",
  },
  {
    id: "sony",
    company: "Sony",
    emoji: "🎮",
    count: 18_500_000,
    interval: 1,
    unit: "year",
    sourceUrl:
      "https://www.sony.com/en/SonyInfo/IR/library/presen/er/pdf/24q3_supplement.pdf",
  },
  {
    id: "toyota",
    company: "Toyota",
    emoji: "🚗",
    count: 10_536_807,
    interval: 1,
    unit: "year",
    sourceUrl:
      "https://www.best-selling-cars.com/brands/2025-full-year-global-toyota-worldwide-car-sales-by-country/",
  },
  {
    id: "tesla",
    company: "Tesla",
    emoji: "🔋",
    count: 1_660_000,
    interval: 1,
    unit: "year",
    sourceUrl:
      "https://www.sec.gov/Archives/edgar/data/1318605/000162828026003952/tsla-20251231.htm",
  },
  {
    id: "canon",
    company: "Canon",
    emoji: "📷",
    count: 2_880_000,
    interval: 1,
    unit: "year",
    sourceUrl: "https://global.canon/en/ir/conference/pdf/conf2025e-note.pdf",
  },
  {
    id: "adidas",
    company: "Adidas",
    emoji: "👟",
    count: 311_000_000,
    interval: 1,
    unit: "year",
    sourceUrl:
      "https://report.adidas-group.com/2023/en/group-management-report-our-company/global-operations.html",
  },
  {
    id: "yamaha",
    company: "Yamaha",
    emoji: "🏍️",
    count: 4_961_000,
    interval: 1,
    unit: "year",
    sourceUrl:
      "https://global.yamaha-motor.com/ir/library/factbook/pdf/2025/2025factbook.pdf",
  },
  {
    id: "rolex",
    company: "Rolex",
    emoji: "⌚",
    count: 1_150_000,
    interval: 1,
    unit: "year",
    sourceUrl:
      "https://revolutionwatch.com/what-we-can-learn-from-morgan-stanleys-ninth-annual-swiss-watch-report/",
  },
]

const DEFAULT_CONFIG: Config = {
  company: PRESETS[0].company,
  emoji: PRESETS[0].emoji,
  count: PRESETS[0].count,
  interval: PRESETS[0].interval,
  unit: PRESETS[0].unit,
}

const CELL_PADDING = 8
const CELL_GAP = 4
const EMOJI_SCALE = 0.72
const MIN_EMOJI_SIZE = 22
const MAX_EMOJI_SIZE = 44
const MAX_PRODUCTS_PER_SECOND = 10
const MAX_FACTORIES = 9
const ITEM_ENTRY_ANIMATION =
  "conveyor-enter-from-left 220ms cubic-bezier(0.16, 1, 0.3, 1) both"
const KEYCAP_REGEX = /^[0-9#*]\uFE0F?\u20E3$/u
const FLAG_REGEX = /^(?:\p{Regional_Indicator}{2})$/u

function normalizeUnit(value: string | null): Unit | null {
  if (!value) {
    return null
  }

  return UNIT_ALIASES[value.toLowerCase()] ?? null
}

function splitGraphemes(value: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    return Array.from(segmenter.segment(value), (segment) => segment.segment)
  }

  return Array.from(value)
}

function isEmojiGrapheme(value: string): boolean {
  return (
    /\p{Extended_Pictographic}/u.test(value) ||
    FLAG_REGEX.test(value) ||
    KEYCAP_REGEX.test(value)
  )
}

function normalizeEmoji(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const graphemes = splitGraphemes(trimmed)
  if (graphemes.length !== 1) {
    return null
  }

  const [grapheme] = graphemes
  return isEmojiGrapheme(grapheme) ? grapheme : null
}

function parseNumeric(value: string | null, fallback: number): number {
  if (value === null) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return parsed
}

function parseConfigFromQuery(searchParams: URLSearchParams, fallback: Config) {
  const hasRecognized = QUERY_KEYS.some((key) => searchParams.has(key))

  if (!hasRecognized) {
    return { hasRecognized: false, config: fallback }
  }

  const company = searchParams.get("company")
  const emoji = normalizeEmoji(searchParams.get("emoji"))
  const count = Math.max(
    0,
    parseNumeric(searchParams.get("count"), fallback.count)
  )
  const interval = parseNumeric(searchParams.get("interval"), fallback.interval)
  const unit = normalizeUnit(searchParams.get("unit"))

  return {
    hasRecognized: true,
    config: {
      company: company !== null ? company : fallback.company,
      emoji: emoji ?? fallback.emoji,
      count,
      interval,
      unit: unit ?? fallback.unit,
    },
  }
}

function toQueryParams(config: Config) {
  const params = new URLSearchParams()
  params.set("company", config.company)
  params.set("emoji", config.emoji)
  params.set("count", String(config.count))
  params.set("interval", String(config.interval))
  params.set("unit", config.unit)
  return params
}

function calculateRate(config: Config): number {
  if (config.interval <= 0 || config.count < 0) {
    return 0
  }

  const intervalSeconds = config.interval * UNIT_SECONDS[config.unit]
  const rawRate = config.count / intervalSeconds

  if (!Number.isFinite(rawRate) || rawRate <= 0) {
    return 0
  }

  return rawRate
}

function getSerpentinePosition(index: number, cols: number) {
  const row = Math.floor(index / cols)
  const col = index % cols
  const adjustedCol = row % 2 === 0 ? col : cols - col - 1
  return { row, col: adjustedCol }
}

type FactoryConveyorProps = {
  emoji: string
  factoryIndex: number
  mode: "compact" | "full"
  paused: boolean
  rate: number
}

function FactoryConveyor({
  emoji,
  factoryIndex,
  mode,
  paused,
  rate,
}: FactoryConveyorProps) {
  const isFullSize = mode === "full"
  const [rows, setRows] = React.useState(5)
  const [cols, setCols] = React.useState(8)
  const [conveyorSize, setConveyorSize] = React.useState({
    width: 0,
    height: 0,
  })
  const [items, setItems] = React.useState<ConveyorItem[]>([])

  const conveyorRef = React.useRef<HTMLDivElement | null>(null)
  const accumulatorRef = React.useRef(0)
  const lastFrameRef = React.useRef(0)
  const itemIdRef = React.useRef(0)

  const rateRef = React.useRef(rate)
  const pausedRef = React.useRef(paused)
  const capacityRef = React.useRef(rows * cols)
  const emojiRef = React.useRef(emoji || "😀")

  const capacity = rows * cols
  const innerWidth = Math.max(0, conveyorSize.width - CELL_PADDING * 2)
  const innerHeight = Math.max(0, conveyorSize.height - CELL_PADDING * 2)
  const cellWidth = Math.max(
    0,
    (innerWidth - CELL_GAP * Math.max(0, cols - 1)) / cols
  )
  const cellHeight = Math.max(
    0,
    (innerHeight - CELL_GAP * Math.max(0, rows - 1)) / rows
  )
  const shortestCellEdge = Math.min(cellWidth, cellHeight)
  const emojiFontSize =
    shortestCellEdge > 0
      ? Math.max(
          MIN_EMOJI_SIZE,
          Math.min(MAX_EMOJI_SIZE, shortestCellEdge * EMOJI_SCALE)
        )
      : MIN_EMOJI_SIZE
  const itemTransitionMs = rate >= 8 ? 90 : rate >= 4 ? 120 : 180
  const conveyorHeightClass = isFullSize
    ? "h-[54vh] min-h-[260px] max-h-[520px]"
    : "h-36 min-h-[144px]"

  React.useEffect(() => {
    rateRef.current = rate
    if (rate <= 0) {
      accumulatorRef.current = 0
      setItems([])
    }
  }, [rate])

  React.useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  React.useEffect(() => {
    capacityRef.current = capacity
    setItems((previous) => {
      if (previous.length <= capacity) {
        return previous
      }
      return previous.slice(0, capacity)
    })
  }, [capacity])

  React.useEffect(() => {
    emojiRef.current = emoji || "😀"
    accumulatorRef.current = 0
    setItems([])
  }, [emoji])

  React.useEffect(() => {
    const element = conveyorRef.current
    if (!element) {
      return
    }

    const updateConveyorGrid = (width: number, height: number) => {
      if (width <= 0 || height <= 0) {
        return
      }

      let nextCols = 0
      let nextRows = 0

      if (isFullSize) {
        const isMobile = width < 640
        const columnCellSize = isMobile ? 42 : 50
        const rowCellSize = isMobile ? 34 : 50
        nextCols = Math.max(4, Math.floor(width / columnCellSize))
        nextRows = Math.max(isMobile ? 5 : 3, Math.floor(height / rowCellSize))
      } else {
        const isNarrow = width < 280
        const columnCellSize = isNarrow ? 34 : 40
        const rowCellSize = isNarrow ? 30 : 36
        nextCols = Math.max(
          isNarrow ? 5 : 6,
          Math.floor(width / columnCellSize)
        )
        nextRows = Math.max(4, Math.floor(height / rowCellSize))
      }

      setConveyorSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height }
      )
      setCols((previous) => (previous === nextCols ? previous : nextCols))
      setRows((previous) => (previous === nextRows ? previous : nextRows))
    }

    const measure = () => {
      const rect = element.getBoundingClientRect()
      updateConveyorGrid(rect.width, rect.height)
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }

      updateConveyorGrid(entry.contentRect.width, entry.contentRect.height)
    })

    measure()
    observer.observe(element)
    window.addEventListener("resize", measure)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [isFullSize])

  React.useEffect(() => {
    let frame = 0
    lastFrameRef.current = performance.now()

    const run = (timestamp: number) => {
      const elapsedSeconds = Math.max(
        0,
        Math.min(1, (timestamp - lastFrameRef.current) / 1000)
      )
      lastFrameRef.current = timestamp

      const currentRate = rateRef.current
      if (!pausedRef.current && currentRate > 0) {
        accumulatorRef.current += elapsedSeconds * currentRate
        const maxPerFrame = Math.max(1, Math.ceil(currentRate / 10))
        const spawnCount = Math.min(
          maxPerFrame,
          Math.floor(accumulatorRef.current),
          capacityRef.current
        )

        if (spawnCount > 0) {
          accumulatorRef.current -= spawnCount
          setItems((previous) => {
            const spawned: ConveyorItem[] = []
            for (let index = 0; index < spawnCount; index += 1) {
              itemIdRef.current += 1
              spawned.push({
                id: itemIdRef.current,
                emoji: emojiRef.current || "😀",
              })
            }

            const next = [...spawned, ...previous]
            const maxItems = capacityRef.current
            if (next.length > maxItems) {
              return next.slice(0, maxItems)
            }

            return next
          })
        }
      }

      frame = requestAnimationFrame(run)
    }

    frame = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="rounded-md border bg-background p-2">
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground sm:text-xs">
        <span>Factory {factoryIndex + 1}</span>
        <span>
          {rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}/s
        </span>
      </div>
      <div
        ref={conveyorRef}
        className={`relative overflow-hidden rounded-sm bg-card ${conveyorHeightClass}`}
      >
        <div
          className="pointer-events-none absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            gap: `${CELL_GAP}px`,
            padding: `${CELL_PADDING}px`,
          }}
        >
          {Array.from({ length: capacity }).map((_, index) => {
            const position = getSerpentinePosition(index, cols)
            return (
              <span
                key={`factory-${factoryIndex}-cell-${index}`}
                className="rounded-none border border-border bg-muted"
                style={{
                  gridColumnStart: position.col + 1,
                  gridRowStart: position.row + 1,
                }}
              />
            )
          })}
        </div>

        <div className="pointer-events-none absolute inset-0">
          {items.map((item, index) => {
            const position = getSerpentinePosition(index, cols)
            const x = CELL_PADDING + position.col * (cellWidth + CELL_GAP)
            const y = CELL_PADDING + position.row * (cellHeight + CELL_GAP)

            return (
              <span
                key={item.id}
                className="absolute will-change-transform"
                style={{
                  left: 0,
                  top: 0,
                  width: `${cellWidth}px`,
                  height: `${cellHeight}px`,
                  transform: `translate(${x}px, ${y}px)`,
                  transitionProperty: "transform",
                  transitionDuration: `${itemTransitionMs}ms`,
                  transitionTimingFunction: "linear",
                }}
              >
                <span
                  className="flex h-full w-full items-center justify-center rounded-none border border-border bg-card leading-none will-change-transform"
                  style={{
                    fontSize: `${emojiFontSize}px`,
                    lineHeight: 1,
                    animation: ITEM_ENTRY_ANIMATION,
                  }}
                >
                  {item.emoji || "😀"}
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [config, setConfig] = React.useState<Config>(DEFAULT_CONFIG)
  const [activePresetId, setActivePresetId] = React.useState(PRESETS[0].id)
  const [isReady, setIsReady] = React.useState(false)

  const [paused, setPaused] = React.useState(false)
  const [countInput, setCountInput] = React.useState(String(config.count))
  const [intervalInput, setIntervalInput] = React.useState(
    String(config.interval)
  )
  const [emojiInput, setEmojiInput] = React.useState(config.emoji || "😀")
  const [emojiTooltipOpen, setEmojiTooltipOpen] = React.useState(false)
  const [shareTooltipOpen, setShareTooltipOpen] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [isMobileViewport, setIsMobileViewport] = React.useState(false)

  const emojiTooltipTimeoutRef = React.useRef<number | null>(null)
  const shareTooltipTimeoutRef = React.useRef<number | null>(null)
  const progressAccumulatorRef = React.useRef(0)
  const progressLastFrameRef = React.useRef(0)
  const progressRateRef = React.useRef(0)
  const progressPausedRef = React.useRef(paused)

  const rawRate = React.useMemo(() => calculateRate(config), [config])
  const requiredFactories =
    rawRate > 0 ? Math.ceil(rawRate / MAX_PRODUCTS_PER_SECOND) : 1
  const factoryCount = Math.max(1, Math.min(MAX_FACTORIES, requiredFactories))
  const maxSupportedRate = MAX_PRODUCTS_PER_SECOND * MAX_FACTORIES
  const effectiveRate = Math.min(rawRate, maxSupportedRate)
  const isFactoryLimitReached = requiredFactories > MAX_FACTORIES
  const isSingleFactory = factoryCount === 1
  const factoryGridColumns = Math.max(1, Math.ceil(Math.sqrt(factoryCount)))
  const cueRate = effectiveRate <= MAX_PRODUCTS_PER_SECOND ? effectiveRate : 0
  const showProgressCue = !paused && cueRate > 0
  const factoryRates = React.useMemo(() => {
    const rates = Array.from({ length: factoryCount }, () => 0)
    let remainingRate = effectiveRate

    for (let index = 0; index < factoryCount; index += 1) {
      const nextRate = Math.min(MAX_PRODUCTS_PER_SECOND, remainingRate)
      rates[index] = nextRate
      remainingRate = Math.max(0, remainingRate - nextRate)
    }

    return rates
  }, [effectiveRate, factoryCount])
  const inputsDisabled = activePresetId !== CUSTOM_ID
  const companyInputWidthCh = Math.max(
    10,
    Math.min(32, config.company.trim().length + 2)
  )
  const countInputWidthCh = Math.max(
    14,
    Math.min(28, Math.max(1, countInput.length) + 8)
  )
  const intervalInputWidthCh = Math.max(
    8,
    Math.min(16, Math.max(1, intervalInput.length) + 5)
  )

  const activePreset = React.useMemo(
    () => PRESETS.find((preset) => preset.id === activePresetId),
    [activePresetId]
  )

  const updateConfig = React.useCallback((patch: Partial<Config>) => {
    setConfig((previous) => ({ ...previous, ...patch }))
  }, [])

  const showEmojiValidationTooltip = React.useCallback(() => {
    setEmojiTooltipOpen(true)
    if (emojiTooltipTimeoutRef.current !== null) {
      window.clearTimeout(emojiTooltipTimeoutRef.current)
    }
    emojiTooltipTimeoutRef.current = window.setTimeout(() => {
      setEmojiTooltipOpen(false)
      emojiTooltipTimeoutRef.current = null
    }, 1800)
  }, [])

  const applyPreset = React.useCallback((preset: Preset) => {
    setActivePresetId(preset.id)
    setConfig({
      company: preset.company,
      count: preset.count,
      emoji: preset.emoji,
      interval: preset.interval,
      unit: preset.unit,
    })
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const searchParams = new URLSearchParams(window.location.search)
    const parsed = parseConfigFromQuery(searchParams, DEFAULT_CONFIG)

    if (parsed.hasRecognized) {
      setConfig(parsed.config)
      setActivePresetId(CUSTOM_ID)
    } else {
      const randomPreset = PRESETS[Math.floor(Math.random() * PRESETS.length)]
      applyPreset(randomPreset)
    }

    setIsReady(true)
  }, [applyPreset])

  React.useEffect(() => {
    setEmojiInput(config.emoji || "😀")
    setEmojiTooltipOpen(false)
  }, [config.emoji])

  React.useEffect(() => {
    setCountInput(String(config.count))
  }, [config.count])

  React.useEffect(() => {
    setIntervalInput(String(config.interval))
  }, [config.interval])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 768)
    }

    updateViewport()
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  React.useEffect(() => {
    progressRateRef.current = cueRate
    if (cueRate <= 0) {
      progressAccumulatorRef.current = 0
      setProgress(0)
    }
  }, [cueRate])

  React.useEffect(() => {
    progressPausedRef.current = paused
  }, [paused])

  React.useEffect(() => {
    let frame = 0
    progressLastFrameRef.current = performance.now()

    const run = (timestamp: number) => {
      const elapsedSeconds = Math.max(
        0,
        Math.min(1, (timestamp - progressLastFrameRef.current) / 1000)
      )
      progressLastFrameRef.current = timestamp

      const currentRate = progressRateRef.current
      if (!progressPausedRef.current && currentRate > 0) {
        progressAccumulatorRef.current += elapsedSeconds * currentRate
        const completed = Math.floor(progressAccumulatorRef.current)
        if (completed > 0) {
          progressAccumulatorRef.current -= completed
        }

        setProgress(Math.min(1, Math.max(0, progressAccumulatorRef.current)))
      }

      frame = requestAnimationFrame(run)
    }

    frame = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame)
  }, [])

  React.useEffect(() => {
    return () => {
      if (emojiTooltipTimeoutRef.current !== null) {
        window.clearTimeout(emojiTooltipTimeoutRef.current)
      }
      if (shareTooltipTimeoutRef.current !== null) {
        window.clearTimeout(shareTooltipTimeoutRef.current)
      }
    }
  }, [])

  async function handleShare() {
    if (typeof window === "undefined") {
      return
    }

    const params = toQueryParams(config)
    const nextUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, "Emoji Factory", nextUrl)

    const url = `${window.location.origin}${nextUrl}`

    try {
      await navigator.clipboard.writeText(url)
      setShareTooltipOpen(true)
      if (shareTooltipTimeoutRef.current !== null) {
        window.clearTimeout(shareTooltipTimeoutRef.current)
      }
      shareTooltipTimeoutRef.current = window.setTimeout(() => {
        setShareTooltipOpen(false)
        shareTooltipTimeoutRef.current = null
      }, 1800)
    } catch {
      setShareTooltipOpen(false)
    }
  }

  if (!isReady) {
    return <div className="min-h-svh bg-background" />
  }

  return (
    <main className="min-h-svh bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-base font-semibold sm:text-lg">
              Emoji Factory
            </h1>
            <div className="flex items-center gap-2">
              <Tooltip open={shareTooltipOpen}>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={handleShare}
                    aria-label="Copy setup link"
                  >
                    <Share2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Link copied
                </TooltipContent>
              </Tooltip>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="Open help"
                  >
                    <CircleHelp />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border">
                  <DialogHeader>
                    <DialogTitle>Help</DialogTitle>
                    <DialogDescription>
                      Pick a preset or switch and select Custom to edit values
                      manually. The conveyor fills based on production rate. You
                      can pause or resume production if you want. Each factory
                      can produce max 10/s, and we can spin up to 64 factories.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogDescription>
                    Use the share icon to copy a link with the current setup.
                  </DialogDescription>
                  <DialogDescription>
                    Made with ❤️ by{" "}
                    <a
                      href="https://beklein.com"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      beklein.com
                    </a>
                  </DialogDescription>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-foreground">
            <label htmlFor="preset" className="font-medium text-foreground">
              Preset
            </label>
            <Select
              value={activePresetId}
              onValueChange={(value) => {
                if (value === CUSTOM_ID) {
                  setActivePresetId(CUSTOM_ID)
                  return
                }

                const preset = PRESETS.find((item) => item.id === value)
                if (preset) {
                  applyPreset(preset)
                }
              }}
            >
              <SelectTrigger
                id="preset"
                size="sm"
                className="w-auto bg-background"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.company}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_ID}>Custom</SelectItem>
              </SelectContent>
            </Select>

            {activePreset?.sourceUrl ? (
              <a
                href={activePreset.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Source
              </a>
            ) : null}
          </div>

          <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm sm:text-base">
            <Input
              className="w-auto"
              value={config.company}
              onChange={(event) =>
                updateConfig({ company: event.target.value })
              }
              disabled={inputsDisabled}
              style={{ width: `${companyInputWidthCh}ch` }}
              aria-label="Company"
            />
            <span className="inline-flex h-8 items-center leading-none">
              produces
            </span>
            <Input
              className="w-auto"
              type="number"
              min={0}
              value={countInput}
              onChange={(event) => {
                const nextValue = event.target.value
                setCountInput(nextValue)
                if (nextValue.trim() === "") {
                  return
                }

                const nextCount = Number(nextValue)
                if (!Number.isFinite(nextCount)) {
                  return
                }
                updateConfig({ count: Math.max(0, nextCount) })
              }}
              onBlur={() => {
                if (countInput.trim() === "") {
                  setCountInput(String(config.count))
                  return
                }

                const parsed = Number(countInput)
                if (!Number.isFinite(parsed)) {
                  setCountInput(String(config.count))
                  return
                }

                const normalized = Math.max(0, parsed)
                if (normalized !== config.count) {
                  updateConfig({ count: normalized })
                }
                setCountInput(String(normalized))
              }}
              disabled={inputsDisabled}
              style={{ width: `${countInputWidthCh}ch` }}
              aria-label="Count"
            />
            <Tooltip open={emojiTooltipOpen}>
              <TooltipTrigger asChild>
                <span>
                  <Input
                    className="w-auto text-center text-lg leading-none"
                    value={emojiInput}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      if (nextValue.trim() === "") {
                        setEmojiInput("")
                        setEmojiTooltipOpen(false)
                        return
                      }

                      const nextEmoji = normalizeEmoji(nextValue)
                      if (nextEmoji) {
                        setEmojiInput(nextEmoji)
                        updateConfig({ emoji: nextEmoji })
                        setEmojiTooltipOpen(false)
                        return
                      }

                      showEmojiValidationTooltip()
                    }}
                    onPaste={(event) => {
                      const nextEmoji = normalizeEmoji(
                        event.clipboardData.getData("text")
                      )
                      event.preventDefault()
                      if (nextEmoji) {
                        setEmojiInput(nextEmoji)
                        updateConfig({ emoji: nextEmoji })
                        setEmojiTooltipOpen(false)
                        return
                      }

                      showEmojiValidationTooltip()
                    }}
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={() => {
                      if (emojiInput.trim() === "") {
                        setEmojiInput(config.emoji || "😀")
                      }
                      setEmojiTooltipOpen(false)
                    }}
                    disabled={inputsDisabled}
                    style={{ width: "4ch" }}
                    inputMode="text"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Emoji"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Emoji only. Clear the field, then enter one emoji.
              </TooltipContent>
            </Tooltip>
            <span className="inline-flex h-8 items-center leading-none">
              s every
            </span>
            <Input
              className="w-auto"
              type="number"
              value={intervalInput}
              onChange={(event) => {
                const nextValue = event.target.value
                setIntervalInput(nextValue)
                if (nextValue.trim() === "") {
                  return
                }

                const nextInterval = Number(nextValue)
                if (!Number.isFinite(nextInterval)) {
                  return
                }
                updateConfig({ interval: nextInterval })
              }}
              onBlur={() => {
                if (intervalInput.trim() === "") {
                  setIntervalInput(String(config.interval))
                  return
                }

                const parsed = Number(intervalInput)
                if (!Number.isFinite(parsed)) {
                  setIntervalInput(String(config.interval))
                  return
                }

                if (parsed !== config.interval) {
                  updateConfig({ interval: parsed })
                }
                setIntervalInput(String(parsed))
              }}
              disabled={inputsDisabled}
              style={{ width: `${intervalInputWidthCh}ch` }}
              aria-label="Interval"
            />
            <Select
              value={config.unit}
              onValueChange={(value) => updateConfig({ unit: value as Unit })}
              disabled={inputsDisabled}
            >
              <SelectTrigger className="w-auto bg-background" aria-label="Unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(UNIT_SECONDS) as Unit[]).map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {UNIT_LABELS[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="inline-flex h-8 items-center leading-none">.</span>
          </p>

          <div className="mt-3 flex justify-center">
            <div className="relative">
              <Button
                size="sm"
                variant={paused ? "default" : "secondary"}
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? "Resume Production" : "Pause Production"}
              </Button>
              <span
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden transition-opacity ${
                  showProgressCue ? "opacity-100" : "opacity-0"
                }`}
              >
                <span
                  className="block h-full bg-foreground"
                  style={{
                    width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                  }}
                />
              </span>
            </div>
          </div>

          {isFactoryLimitReached ? (
            <p className="mt-3 rounded-none border border-foreground/30 bg-muted px-3 py-2 text-xs text-foreground sm:text-sm">
              Warning: Too much stuff is being produced. We hit the cap of{" "}
              {MAX_FACTORIES} factories, so output is limited to{" "}
              {maxSupportedRate.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
              /s instead of{" "}
              {rawRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              /s.
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border bg-card p-2 sm:p-3">
          <div
            className={isSingleFactory ? "space-y-3" : "grid gap-3"}
            style={
              isSingleFactory
                ? undefined
                : {
                    gridTemplateColumns: `repeat(${
                      isMobileViewport ? 1 : factoryGridColumns
                    }, minmax(0, 1fr))`,
                  }
            }
          >
            {factoryRates.map((factoryRate, index) => (
              <FactoryConveyor
                key={`factory-${index + 1}`}
                emoji={config.emoji}
                factoryIndex={index}
                mode={isSingleFactory ? "full" : "compact"}
                paused={paused}
                rate={factoryRate}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
