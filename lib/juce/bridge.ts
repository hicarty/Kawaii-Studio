// Minimal client for the JUCE WebBrowserComponent native interop layer.
// When the UI runs inside the JUCE plugin, JUCE injects `window.__JUCE__`
// (see juce_gui_extra/native/javascript). In a plain browser it is absent and
// every call becomes a no-op so the Web Audio fallback can take over.

type JuceBackend = {
  emitEvent: (eventId: string, payload?: unknown) => void
  addEventListener: (eventId: string, listener: (payload: any) => void) => number
  removeEventListener: (listenerId: number) => void
}

type JuceGlobal = {
  backend: JuceBackend
  initialisationData: {
    __juce__functions: string[]
    __juce__sliders: string[]
    __juce__toggles: string[]
    __juce__comboBoxes: string[]
    __juce__platform: string[]
  }
}

declare global {
  interface Window {
    __JUCE__?: JuceGlobal
  }
}

export function isJuceBackendAvailable(): boolean {
  return typeof window !== "undefined" && !!window.__JUCE__?.backend
}

class PromiseHandler {
  private lastPromiseId = 0
  private promises = new Map<number, (value: any) => void>()

  constructor(backend: JuceBackend) {
    backend.addEventListener("__juce__complete", ({ promiseId, result }: any) => {
      const resolve = this.promises.get(promiseId)
      if (resolve) {
        resolve(result)
        this.promises.delete(promiseId)
      }
    })
  }

  createPromise(): [number, Promise<any>] {
    const promiseId = this.lastPromiseId++
    const promise = new Promise<any>((resolve) => this.promises.set(promiseId, resolve))
    return [promiseId, promise]
  }
}

let handler: PromiseHandler | null = null

export function nativeCall(name: string, ...args: unknown[]): Promise<any> {
  if (!isJuceBackendAvailable()) return Promise.resolve(undefined)

  const backend = window.__JUCE__!.backend
  if (!handler) handler = new PromiseHandler(backend)

  const [promiseId, promise] = handler.createPromise()
  backend.emitEvent("__juce__invoke", { name, params: args, resultId: promiseId })
  return promise
}

export function setParameter(id: string, value: number) {
  return nativeCall("setParameter", id, value)
}

export function getParameter(id: string): Promise<number> {
  return nativeCall("getParameter", id)
}

export function setTransport(playing: boolean, tempo: number) {
  return nativeCall("setTransport", playing, tempo)
}

export function noteOn(note: number, velocity = 0.8) {
  return nativeCall("noteOn", note, velocity)
}

export function noteOff(note: number) {
  return nativeCall("noteOff", note)
}

export function loadModel(path: string): Promise<string> {
  return nativeCall("loadModel", path)
}

export function getModelPath(): Promise<string> {
  return nativeCall("getModelPath")
}

export function openModelDialog(): Promise<string> {
  return nativeCall("openModelDialog")
}
