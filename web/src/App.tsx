import { useState, useCallback, useEffect } from 'react'
import {
  listPrinters,
  addPrinter,
  removePrinter,
  connectPrinter,
  disconnectPrinter,
  getPrinterData,
  setLight,
  pausePrint,
  resumePrint,
  stopPrint,
  type PrinterWithStatus,
  type PrinterData,
} from './api'
import { AddPrinterForm } from './AddPrinterForm'
import { PrinterCard } from './PrinterCard'
import { PrinterDetail } from './PrinterDetail'

export default function App() {
  const [printers, setPrinters] = useState<PrinterWithStatus[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [data, setData] = useState<PrinterData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPrinters = useCallback(async () => {
    setError(null)
    try {
      const list = await listPrinters()
      setPrinters(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar impressoras')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrinters()
  }, [loadPrinters])

  useEffect(() => {
    if (!selectedId) {
      setData(null)
      return
    }
    const connected = printers.find((p) => p.id === selectedId)?.connected
    if (!connected) {
      setData(null)
      return
    }
    let cancelled = false
    const tick = async () => {
      try {
        const d = await getPrinterData(selectedId)
        if (!cancelled) setData(d)
      } catch {
        if (!cancelled) setData(null)
      }
    }
    tick()
    const id = setInterval(tick, 3000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [selectedId, printers])

  const handleAdd = async (host: string, accessCode: string, serialNumber: string) => {
    setError(null)
    try {
      await addPrinter({ host, access_code: accessCode, serial_number: serialNumber })
      await loadPrinters()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao adicionar')
      throw e
    }
  }

  const handleRemove = async (id: string) => {
    setError(null)
    try {
      await removePrinter(id)
      if (selectedId === id) setSelectedId(null)
      await loadPrinters()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao remover')
    }
  }

  const handleConnect = async (id: string) => {
    setError(null)
    try {
      await connectPrinter(id)
      await loadPrinters()
      setSelectedId(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao conectar')
    }
  }

  const handleDisconnect = async (id: string) => {
    setError(null)
    try {
      await disconnectPrinter(id)
      if (selectedId === id) setSelectedId(null)
      await loadPrinters()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao desconectar')
    }
  }

  const handleLight = async (id: string, light: 'chamber_light' | 'work_light', on: boolean) => {
    setError(null)
    try {
      await setLight(id, light, on)
      if (selectedId === id && data) setData({ ...data })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao alterar luz')
    }
  }

  const handlePause = async (id: string) => {
    setError(null)
    try {
      await pausePrint(id)
      if (selectedId === id) setTimeout(() => setData(null), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao pausar')
    }
  }

  const handleResume = async (id: string) => {
    setError(null)
    try {
      await resumePrint(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao retomar')
    }
  }

  const handleStop = async (id: string) => {
    setError(null)
    try {
      await stopPrint(id)
      if (selectedId === id) setTimeout(() => setData(null), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao parar')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-600 bg-surface-700/50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-stone-100">
          Spoolab
        </h1>
        <span className="text-sm text-stone-500 font-mono">Bambu Lab</span>
      </header>

      {error && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-lg bg-red-900/40 text-red-200 text-sm flex justify-between items-center">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-300 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <AddPrinterForm onAdd={handleAdd} />

        {loading ? (
          <p className="text-stone-500 mt-4">Carregando…</p>
        ) : printers.length === 0 ? (
          <div className="mt-8 rounded-xl border border-surface-600 bg-surface-700/30 p-8 text-center text-stone-400">
            <p>Nenhuma impressora cadastrada.</p>
            <p className="text-sm mt-1">Adicione uma acima usando IP, código de acesso e número de série.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {printers.map((p) => (
              <PrinterCard
                key={p.id}
                printer={p}
                isSelected={selectedId === p.id}
                onSelect={() => setSelectedId(selectedId === p.id ? null : p.id)}
                onConnect={() => handleConnect(p.id)}
                onDisconnect={() => handleDisconnect(p.id)}
                onRemove={() => handleRemove(p.id)}
              />
            ))}
          </div>
        )}

        {selectedId && (
          <PrinterDetail
            printer={printers.find((p) => p.id === selectedId)!}
            data={data}
            onLight={(light, on) => handleLight(selectedId, light, on)}
            onPause={() => handlePause(selectedId)}
            onResume={() => handleResume(selectedId)}
            onStop={() => handleStop(selectedId)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </main>
    </div>
  )
}
