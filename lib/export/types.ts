export interface ExportFile {
  name: string
  url: string
}

export function objectUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function revokeObjectUrl(url: string) {
  URL.revokeObjectURL(url)
}