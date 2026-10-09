"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Download, Film, FileAudio, Music } from "lucide-react"

interface ExportPanelProps {
  tempo: number
  mood: string
}

export function ExportPanel({ tempo, mood }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<"wav" | "midi" | "film" | null>(null)

  const handleExport = (format: "wav" | "midi" | "film") => {
    setIsExporting(true)
    setExportFormat(format)
    setTimeout(() => {
      setIsExporting(false)
      setExportFormat(null)
    }, 2000)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />

      <div className="flex items-center justify-between relative">
        <h2 className="font-serif text-xl tracking-[0.25em] text-foreground uppercase">
          Export
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
          FILM SOUNDTRACK
        </span>
      </div>

      {/* Project info strip */}
      <div className="flex items-center gap-6 px-4 py-3 bg-surface rounded-lg">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Tempo</span>
          <span className="text-sm font-mono text-foreground">{tempo} BPM</span>
        </div>
        <div className="w-px h-8 bg-border/30" />
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Mood</span>
          <span className="text-sm font-mono text-foreground capitalize">{mood}</span>
        </div>
        <div className="w-px h-8 bg-border/30" />
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Bit Depth</span>
          <span className="text-sm font-mono text-foreground">24-bit</span>
        </div>
        <div className="w-px h-8 bg-border/30" />
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Sample Rate</span>
          <span className="text-sm font-mono text-foreground">48 kHz</span>
        </div>
      </div>

      {/* Export buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => handleExport("wav")}
          disabled={isExporting}
          className={cn(
            "flex flex-col items-center gap-2 py-5 rounded-xl border transition-all",
            exportFormat === "wav"
              ? "bg-primary/15 border-primary/50"
              : "bg-surface border-border/50 hover:border-border hover:bg-surface-raised",
            isExporting && "opacity-50 cursor-not-allowed",
          )}
        >
          <FileAudio className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">WAV Stems</span>
        </button>

        <button
          onClick={() => handleExport("midi")}
          disabled={isExporting}
          className={cn(
            "flex flex-col items-center gap-2 py-5 rounded-xl border transition-all",
            exportFormat === "midi"
              ? "bg-primary/15 border-primary/50"
              : "bg-surface border-border/50 hover:border-border hover:bg-surface-raised",
            isExporting && "opacity-50 cursor-not-allowed",
          )}
        >
          <Music className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">MIDI Files</span>
        </button>

        <button
          onClick={() => handleExport("film")}
          disabled={isExporting}
          className={cn(
            "flex flex-col items-center gap-2 py-5 rounded-xl border transition-all",
            exportFormat === "film"
              ? "bg-primary/15 border-primary/50"
              : "bg-primary/10 border-primary/30 hover:bg-primary/20",
            isExporting && "opacity-50 cursor-not-allowed",
          )}
        >
          <Film className="w-5 h-5 text-primary" />
          <span className="text-[10px] font-medium tracking-wider text-primary uppercase">Film Master</span>
        </button>
      </div>

      {/* Exporting indicator */}
      {isExporting && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-surface rounded-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            Exporting {exportFormat === "film" ? "film master" : exportFormat?.toUpperCase()} at {tempo} BPM...
          </span>
        </div>
      )}
    </div>
  )
}

