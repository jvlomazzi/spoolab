import { useState, FormEvent } from 'react'

type Props = {
  onAdd: (host: string, accessCode: string, serialNumber: string) => Promise<void>
}

export function AddPrinterForm({ onAdd }: Props) {
  const [host, setHost] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!host.trim() || !accessCode.trim() || !serialNumber.trim()) return
    setSubmitting(true)
    try {
      await onAdd(host.trim(), accessCode.trim(), serialNumber.trim())
      setHost('')
      setAccessCode('')
      setSerialNumber('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-surface-600 bg-surface-700/50 p-4 space-y-3"
    >
      <h2 className="text-sm font-medium text-stone-300">Nova impressora</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="host" className="block text-xs text-stone-500 mb-1">
            IP
          </label>
          <input
            id="host"
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="192.168.1.200"
            className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono text-sm"
          />
        </div>
        <div>
          <label htmlFor="access_code" className="block text-xs text-stone-500 mb-1">
            Código de acesso
          </label>
          <input
            id="access_code"
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="8 caracteres"
            maxLength={32}
            className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono text-sm"
          />
        </div>
        <div>
          <label htmlFor="serial" className="block text-xs text-stone-500 mb-1">
            Número de série
          </label>
          <input
            id="serial"
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Ex: 28W1B41200A123"
            className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !host.trim() || !accessCode.trim() || !serialNumber.trim()}
          className="px-4 py-2 rounded-lg bg-accent text-surface-800 font-medium text-sm hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {submitting ? 'Adicionando…' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
