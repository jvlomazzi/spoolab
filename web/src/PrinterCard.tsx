import type { PrinterWithStatus } from './api'

type Props = {
  printer: PrinterWithStatus
  isSelected: boolean
  onSelect: () => void
  onConnect: () => void
  onDisconnect: () => void
  onRemove: () => void
}

export function PrinterCard({
  printer,
  isSelected,
  onSelect,
  onConnect,
  onDisconnect,
  onRemove,
}: Props) {
  return (
    <div
      className={`rounded-xl border bg-surface-700/50 overflow-hidden transition-colors ${
        isSelected ? 'border-accent ring-1 ring-accent/30' : 'border-surface-600'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`shrink-0 w-2 h-2 rounded-full ${
              printer.connected ? 'bg-emerald-500' : 'bg-surface-500'
            }`}
            title={printer.connected ? 'Conectada' : 'Desconectada'}
          />
          <span className="font-mono text-sm text-stone-200 truncate">
            {printer.serial_number}
          </span>
          <span className="text-stone-500 text-sm truncate hidden sm:inline">
            {printer.host}
          </span>
        </div>
        <span className="text-stone-500 text-xs shrink-0">
          {isSelected ? '▲' : '▼'}
        </span>
      </button>
      <div className="px-4 pb-3 pt-0 flex flex-wrap gap-2">
        {printer.connected ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDisconnect()
            }}
            className="px-3 py-1.5 rounded-lg text-sm bg-surface-600 text-stone-300 hover:bg-surface-500 transition-colors"
          >
            Desconectar
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onConnect()
            }}
            className="px-3 py-1.5 rounded-lg text-sm bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
          >
            Conectar
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm('Remover esta impressora da lista?')) onRemove()
          }}
          className="px-3 py-1.5 rounded-lg text-sm text-stone-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          Remover
        </button>
      </div>
    </div>
  )
}
