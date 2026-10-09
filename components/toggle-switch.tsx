"use client"

import { cn } from "@/lib/utils"

interface ToggleSwitchProps {
  label: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  className?: string
}

export function ToggleSwitch({ label, enabled, onChange, className }: ToggleSwitchProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative w-14 h-7 rounded-full transition-colors duration-200",
          enabled ? "bg-primary/40" : "bg-muted",
        )}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span
          className={cn(
            "absolute top-0.5 w-6 h-6 rounded-full transition-all duration-200 shadow-md",
            enabled
              ? "left-[calc(100%-1.625rem)] bg-foreground"
              : "left-0.5 bg-muted-foreground/60",
          )}
        />
        {enabled && (
          <span className="absolute inset-0 rounded-full shadow-[0_0_12px_oklch(0.55_0.18_290/0.4)]" />
        )}
      </button>
      <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{label}</span>
    </div>
  )
}

