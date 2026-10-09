"use client"

import { useState, useCallback } from "react"
import { RotaryKnob } from "@/components/rotary-knob"
import { ToggleSwitch } from "@/components/toggle-switch"
import { cn } from "@/lib/utils"

interface ChannelStripProps {
  label: string
  level: number
  pan: number
  onLevelChange: (v: number) => void
  onPanChange: (v: number) => void
  muted: boolean
  solo: boolean
  onMute: () => void
  onSolo: () => void
  meterValue: number
}

function ChannelStrip({
  label,
  level,
  pan,
  onLevelChange,
  onPanChange,
  muted,
  solo,
  onMute,
  onSolo,
  meterValue,
}: ChannelStripProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-3">
      <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{label}</span>

      {/* Level meter */}
      <div className="relative w-3 h-28 bg-surface rounded-sm overflow-hidden">
        <div
          className={cn(
            "absolute bottom-0 w-full rounded-sm transition-all duration-75",
            muted ? "bg-muted-foreground/20" : "bg-primary/60",
          )}
          style={{ height: `${meterValue * (level / 10) * 100}%` }}
        />
        {!muted && meterValue * (level / 10) > 0.85 && (
          <div className="absolute top-0 w-full h-1 bg-destructive rounded-sm" />
        )}
      </div>

      {/* Level knob */}
      <RotaryKnob label="" value={level} min={0} max={10} step={0.1} unit="" onChange={onLevelChange} size="sm" />

      {/* Pan knob */}
      <RotaryKnob label="Pan" value={pan} min={-5} max={5} step={0.1} unit="" onChange={onPanChange} size="sm" />

      {/* Mute / Solo buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={onMute}
          className={cn(
            "w-7 h-6 rounded text-[9px] font-bold tracking-wider transition-colors",
            muted
              ? "bg-destructive/30 text-destructive-foreground border border-destructive/50"
              : "bg-surface text-muted-foreground border border-border/50 hover:border-border",
          )}
          aria-label={`${muted ? "Unmute" : "Mute"} ${label}`}
        >
          M
        </button>
        <button
          onClick={onSolo}
          className={cn(
            "w-7 h-6 rounded text-[9px] font-bold tracking-wider transition-colors",
            solo
              ? "bg-primary/30 text-primary-foreground border border-primary/50"
              : "bg-surface text-muted-foreground border border-border/50 hover:border-border",
          )}
          aria-label={`${solo ? "Unsolo" : "Solo"} ${label}`}
        >
          S
        </button>
      </div>
    </div>
  )
}

export function MixerPanel() {
  const [channels, setChannels] = useState({
    guitar: { level: 7, pan: -2, muted: false, solo: false },
    synth: { level: 6.5, pan: 2, muted: false, solo: false },
    drums: { level: 7.5, pan: 0, muted: false, solo: false },
    bass: { level: 6, pan: 0, muted: false, solo: false },
    master: { level: 8, pan: 0, muted: false, solo: false },
  })
  const [crossfade, setCrossfade] = useState(5)
  const [compressor, setCompressor] = useState(true)
  const [limiter, setLimiter] = useState(true)
  const [meterValues] = useState({ guitar: 0.7, synth: 0.6, drums: 0.8, bass: 0.5, master: 0.75 })

  const updateChannel = useCallback(
    (key: keyof typeof channels, field: string, value: number | boolean) => {
      setChannels((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }))
    },
    [],
  )

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between relative">
        <h2 className="font-serif text-xl tracking-[0.25em] text-foreground uppercase">
          Mixer
        </h2>
        <div className="flex items-center gap-4">
          <ToggleSwitch label="Comp" enabled={compressor} onChange={setCompressor} />
          <ToggleSwitch label="Limiter" enabled={limiter} onChange={setLimiter} />
        </div>
      </div>

      {/* Crossfade - Metal vs Electronic */}
      <div className="space-y-3 bg-surface rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tracking-wider text-primary uppercase">Djent</span>
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Crossfade</span>
          <span className="text-[10px] font-medium tracking-wider text-primary uppercase">DnB</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary/40 rounded-full transition-all"
            style={{ width: `${(crossfade / 10) * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={crossfade}
            onChange={(e) => setCrossfade(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            aria-label="Crossfade between Djent and DnB"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground shadow-[0_0_10px_oklch(0.55_0.18_290/0.5)] pointer-events-none transition-all"
            style={{ left: `calc(${(crossfade / 10) * 100}% - 8px)` }}
          />
        </div>
      </div>

      {/* Channel strips */}
      <div className="flex items-stretch justify-around border-t border-border/50 pt-5">
        <ChannelStrip
          label="Guitar"
          level={channels.guitar.level}
          pan={channels.guitar.pan}
          onLevelChange={(v) => updateChannel("guitar", "level", v)}
          onPanChange={(v) => updateChannel("guitar", "pan", v)}
          muted={channels.guitar.muted}
          solo={channels.guitar.solo}
          onMute={() => updateChannel("guitar", "muted", !channels.guitar.muted)}
          onSolo={() => updateChannel("guitar", "solo", !channels.guitar.solo)}
          meterValue={meterValues.guitar}
        />
        <div className="w-px bg-border/30" />
        <ChannelStrip
          label="Synth"
          level={channels.synth.level}
          pan={channels.synth.pan}
          onLevelChange={(v) => updateChannel("synth", "level", v)}
          onPanChange={(v) => updateChannel("synth", "pan", v)}
          muted={channels.synth.muted}
          solo={channels.synth.solo}
          onMute={() => updateChannel("synth", "muted", !channels.synth.muted)}
          onSolo={() => updateChannel("synth", "solo", !channels.synth.solo)}
          meterValue={meterValues.synth}
        />
        <div className="w-px bg-border/30" />
        <ChannelStrip
          label="Drums"
          level={channels.drums.level}
          pan={channels.drums.pan}
          onLevelChange={(v) => updateChannel("drums", "level", v)}
          onPanChange={(v) => updateChannel("drums", "pan", v)}
          muted={channels.drums.muted}
          solo={channels.drums.solo}
          onMute={() => updateChannel("drums", "muted", !channels.drums.muted)}
          onSolo={() => updateChannel("drums", "solo", !channels.drums.solo)}
          meterValue={meterValues.drums}
        />
        <div className="w-px bg-border/30" />
        <ChannelStrip
          label="Bass"
          level={channels.bass.level}
          pan={channels.bass.pan}
          onLevelChange={(v) => updateChannel("bass", "level", v)}
          onPanChange={(v) => updateChannel("bass", "pan", v)}
          muted={channels.bass.muted}
          solo={channels.bass.solo}
          onMute={() => updateChannel("bass", "muted", !channels.bass.muted)}
          onSolo={() => updateChannel("bass", "solo", !channels.bass.solo)}
          meterValue={meterValues.bass}
        />
        <div className="w-px bg-primary/20" />
        <ChannelStrip
          label="Master"
          level={channels.master.level}
          pan={channels.master.pan}
          onLevelChange={(v) => updateChannel("master", "level", v)}
          onPanChange={(v) => updateChannel("master", "pan", v)}
          muted={channels.master.muted}
          solo={channels.master.solo}
          onMute={() => updateChannel("master", "muted", !channels.master.muted)}
          onSolo={() => updateChannel("master", "solo", !channels.master.solo)}
          meterValue={meterValues.master}
        />
      </div>
    </div>
  )
}

