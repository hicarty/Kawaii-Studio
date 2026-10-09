"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Download, Film, FileAudio, Music, RefreshCw, Check, AlertTriangle } from "lucide-react"
import { exportMidiFiles } from "@/lib/export/midi"
import { exportStems } from "@/lib/export/wav"
import { renderFilmMaster } from "@/lib/export/video"
import { revokeObjectUrl, type ExportFile } from "@/lib/export/types"
import type { ExportMood } from "@/lib/export/song"

interface ExportPanelProps {
  tempo: number
  mood: string
}

type Format = "wav" | "midi" | "film"
type Phase = "idle" | "working" | "done"

const FORMAT_LABEL: Record<Format, string> = {
  wav: "WAV Stems",
  midi: "MIDI Files",
  film: "Film Master",
}

export function ExportPanel({ tempo, mood }: ExportPanelProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [status, setStatus] = useState("")
  const [files, setFiles] = useState<ExportFile[]>([])
  const [exportFormat, setExportFormat] = useState<Format | null>(null)
  const [error, setError] = useState<string | null>(null)
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    const urls = urlsRef.current
    return () => urls.forEach(revokeObjectUrl)
  }, [])

  const clearFiles = () => {
    urlsRef.current.forEach(revokeObjectUrl)
    urlsRef.current = []
    setFiles([])
  }

  const handleExport = async (format: Format) => {
    setError(null)
    setPhase("working")
    setExportFormat(format)
    setStatus(format === "midi" ? "Generating MIDI…" : format === "wav" ? "Rendering stems at 48 kHz…" : "Preparing film master…")

    try {
      const emitted = mood as ExportMood
      const result: ExportFile[] =
        format === "midi"
          ? await exportMidiFiles(emitted, tempo)
          : format === "wav"
            ? await exportStems(emitted, tempo)
            : [await renderFilmMaster(emitted, tempo, setStatus)]

      clearFiles()
      urlsRef.current = result.map((f) => f.url)
      setFiles(result)
      setPhase("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase("idle")
      setExportFormat(null)
    }
  }

  const reset = () => {
    clearFiles()
    setPhase("idle")
    setExportFormat(null)
    setError(null)
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

      {phase === "idle" && (
        <>
          {/* Export buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleExport("wav")}
              className={cn(
                "flex flex-col items-center gap-2 py-5 rounded-xl border transition-all",
                exportFormat === "wav"
                  ? "bg-primary/15 border-primary/50"
                  : "bg-surface border-border/50 hover:border-border hover:bg-surface-raised",
                "cursor-pointer",
              )}
            >
              <FileAudio className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">WAV Stems</span>
            </button>

            <button
              onClick={() => handleExport("midi")}
              className={cn(
                "flex flex-col items-center gap-2 py-5 rounded-xl border transition-all",
                exportFormat === "midi"
                  ? "bg-primary/15 border-primary/50"
                  : "bg-surface border-border/50 hover:border-border hover:bg-surface-raised",
                "cursor-pointer",
              )}
            >
              <Music className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">MIDI Files</span>
            </button>

            <button
              onClick={() => handleExport("film")}
              className={cn(
                "flex flex-col items-center gap-2 py-5 rounded-xl border transition-all cursor-pointer",
                exportFormat === "film"
                  ? "bg-primary/15 border-primary/50"
                  : "bg-primary/10 border-primary/30 hover:bg-primary/20",
              )}
            >
              <Film className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-medium tracking-wider text-primary uppercase">Film Master</span>
            </button>
          </div>
        </>
      )}

      {phase === "working" && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-surface rounded-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">{status}</span>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-mono text-foreground">
                {files.length} {files.length === 1 ? "file" : "files"} ready — {FORMAT_LABEL[exportFormat ?? "wav"]}
              </span>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              New export
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {files.map((file) => (
              <a
                key={file.name}
                href={file.url}
                download={file.name}
                className="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface hover:bg-surface-raised rounded-lg border border-border/50 transition-colors group"
              >
                <span className="text-[11px] font-mono text-foreground truncate">{file.name}</span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-primary uppercase">
                  <Download className="w-3.5 h-3.5" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
          <span className="text-[10px] font-mono text-destructive">{error}</span>
        </div>
      )}
    </div>
  )
}