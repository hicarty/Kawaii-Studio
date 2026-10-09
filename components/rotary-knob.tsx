"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface RotaryKnobProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  unit?: string
  onChange: (value: number) => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export function RotaryKnob({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "%",
  onChange,
  size = "md",
  className,
}: RotaryKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const startYRef = useRef(0)
  const startValueRef = useRef(0)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const normalizedValue = (value - min) / (max - min)
  const angle = normalizedValue * 270 - 135

  const dimensions = {
    sm: { outer: 56, inner: 44, stroke: 2 },
    md: { outer: 72, inner: 58, stroke: 2.5 },
    lg: { outer: 88, inner: 72, stroke: 3 },
  }

  const dim = dimensions[size]
  const radius = (dim.outer - 8) / 2
  const center = dim.outer / 2

  useEffect(() => {
    const el = knobRef.current
    if (!el) return

    const handleDown = (e: PointerEvent) => {
      e.preventDefault()
      isDraggingRef.current = true
      startYRef.current = e.clientY
      startValueRef.current = value
      el.style.cursor = "grabbing"
    }

    const handleMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      const delta = startYRef.current - e.clientY
      const range = max - min
      const sensitivity = range / 150
      const newValue = Math.min(max, Math.max(min, startValueRef.current + delta * sensitivity))
      const stepped = Math.round(newValue / step) * step
      onChangeRef.current(stepped)
    }

    const handleUp = () => {
      isDraggingRef.current = false
      el.style.cursor = "grab"
    }

    el.addEventListener("pointerdown", handleDown)
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)

    return () => {
      el.removeEventListener("pointerdown", handleDown)
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
  }, [value, min, max, step])

  // Arc path for the value indicator track
  const arcStart = -225 * (Math.PI / 180)
  const arcEnd = arcStart + normalizedValue * 270 * (Math.PI / 180)
  const arcRadius = radius - 2

  const startX = center + arcRadius * Math.cos(arcStart)
  const startY = center + arcRadius * Math.sin(arcStart)
  const endX = center + arcRadius * Math.cos(arcEnd)
  const endY = center + arcRadius * Math.sin(arcEnd)
  const largeArc = normalizedValue * 270 > 180 ? 1 : 0

  // Indicator line end points
  const indicatorLength = radius - 8
  const indicatorAngle = (angle - 90) * (Math.PI / 180)
  const indX = center + indicatorLength * Math.cos(indicatorAngle)
  const indY = center + indicatorLength * Math.sin(indicatorAngle)
  const indStartX = center + indicatorLength * 0.45 * Math.cos(indicatorAngle)
  const indStartY = center + indicatorLength * 0.45 * Math.sin(indicatorAngle)

  const displayValue =
    unit === "dB"
      ? `${value.toFixed(1)} ${unit}`
      : unit === " BPM"
        ? `${Math.round(value)} BPM`
        : `${value.toFixed(step < 1 ? 1 : 0)}${unit === "%" ? "" : unit ? ` ${unit}` : ""}`

  const filterId = `glow-${label.replace(/\s/g, "")}-${size}`

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      {label && (
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      )}

      <div
        ref={knobRef}
        className="relative cursor-grab select-none touch-none"
        style={{ width: dim.outer, height: dim.outer }}
        role="slider"
        aria-label={label || "knob"}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault()
            onChange(Math.min(max, value + step))
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault()
            onChange(Math.max(min, value - step))
          }
        }}
      >
        <svg
          width={dim.outer}
          height={dim.outer}
          viewBox={`0 0 ${dim.outer} ${dim.outer}`}
          className="absolute inset-0 pointer-events-none"
        >
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={arcRadius}
            fill="none"
            stroke="var(--knob-track)"
            strokeWidth={dim.stroke}
            strokeDasharray="2 3"
            opacity={0.4}
          />

          {/* Outer ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--knob-track)"
            strokeWidth={1}
            opacity={0.6}
          />

          {/* Inner knob body */}
          <circle
            cx={center}
            cy={center}
            r={dim.inner / 2}
            fill="var(--knob-body)"
            stroke="var(--knob-body-border)"
            strokeWidth={1.5}
          />

          {/* Inner shadow/depth circle */}
          <circle cx={center} cy={center} r={dim.inner / 2 - 4} fill="var(--knob-shadow)" />

          {/* Value arc */}
          {normalizedValue > 0.005 && (
            <path
              d={`M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${endX} ${endY}`}
              fill="none"
              stroke="var(--knob-arc)"
              strokeWidth={dim.stroke}
              strokeLinecap="round"
              filter={`url(#${filterId})`}
              opacity={0.9}
            />
          )}

          {/* Indicator line */}
          <line
            x1={indStartX}
            y1={indStartY}
            x2={indX}
            y2={indY}
            stroke="var(--knob-indicator)"
            strokeWidth={2}
            strokeLinecap="round"
            filter={`url(#${filterId})`}
          />
        </svg>
      </div>

      <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{displayValue}</span>
    </div>
  )
}

