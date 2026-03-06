import type { PrinterWithStatus, PrinterData } from './api'
import { getPrinterImageSrc, getPrinterModelLabel } from './printerImages'

const STATE_LABELS: Record<string, string> = {
  IDLE: 'Parada',
  PREPARE: 'Preparando',
  RUNNING: 'Imprimindo',
  PAUSE: 'Pausada',
  FINISH: 'Finalizada',
  FAILED: 'Falha',
  UNKNOWN: '—',
}

type Props = {
  printer: PrinterWithStatus
  data: PrinterData | null
  onSelect: () => void
  onConnect: () => void
  onDisconnect: () => void
  onRemove: () => void
}

export function PrinterCard({
  printer,
  data,
  onSelect,
  onConnect,
  onDisconnect,
  onRemove,
}: Props) {
  const state = data?.gcode_state ?? 'UNKNOWN'
  const stateLabel = STATE_LABELS[state] ?? state
  const isPrinting =
    state === 'RUNNING' || state === 'PAUSE' || state === 'PREPARE'
  const imgSrc = getPrinterImageSrc(printer.model)
  const modelLabel = getPrinterModelLabel(printer.model)

  return (
    <div className="rounded-xl border border-surface-600 bg-surface-700/50 overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left flex-1 flex flex-col min-h-0"
      >
        <div className="flex gap-4 p-4">
          <div className="shrink-0 w-20 h-20 rounded-lg bg-surface-800 border border-surface-600 overflow-hidden flex items-center justify-center">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-stone-600 text-2xl">🖨</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-100 truncate">
              {modelLabel || printer.serial_number}
            </p>
            {modelLabel && (
              <p className="text-stone-500 text-sm font-mono truncate">
                {printer.serial_number}
              </p>
            )}
            <p className="text-stone-500 text-xs mt-0.5 truncate">{printer.host}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`shrink-0 w-2 h-2 rounded-full ${
                  printer.connected ? 'bg-emerald-500' : 'bg-surface-500'
                }`}
                title={printer.connected ? 'Conectada' : 'Desconectada'}
              />
              {printer.connected && data && (
                <span
                  className={`text-xs font-medium ${
                    state === 'RUNNING'
                      ? 'text-emerald-400'
                      : state === 'PAUSE'
                        ? 'text-amber-400'
                        : state === 'FAILED'
                          ? 'text-red-400'
                          : 'text-stone-400'
                  }`}
                >
                  {stateLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {printer.connected && data && (
          <div className="px-4 pb-3 space-y-2">
            {isPrinting && (
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-stone-500">
                    {data.gcode_file ? (
                      <span className="truncate block max-w-[180px]" title={data.gcode_file}>
                        {data.gcode_file}
                      </span>
                    ) : (
                      'Progresso'
                    )}
                  </span>
                  <span className="font-mono text-stone-400">
                    {data.print_percent_done}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-600 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${data.print_percent_done}%` }}
                  />
                </div>
                {data.remaining_print_time > 0 && (
                  <p className="text-stone-500 text-xs mt-0.5">
                    ~{data.remaining_print_time} min
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3 text-xs">
              <span className="text-stone-500">
                Mesa <span className="font-mono text-stone-400">{data.bed_temperature?.toFixed(0) ?? '—'}°</span>
              </span>
              <span className="text-stone-500">
                Bico <span className="font-mono text-stone-400">{data.nozzle_temperature?.toFixed(0) ?? '—'}°</span>
              </span>
            </div>
          </div>
        )}
      </button>

      <div className="px-4 pb-3 pt-0 flex flex-wrap gap-2 border-t border-surface-600/80 pt-2 mt-auto">
        {printer.connected ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDisconnect()
            }}
            className="px-3 py-1.5 rounded-lg text-sm bg-surface-600 text-stone-300 hover:bg-surface-500"
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
            className="px-3 py-1.5 rounded-lg text-sm bg-accent/20 text-accent hover:bg-accent/30"
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
          className="px-3 py-1.5 rounded-lg text-sm text-stone-500 hover:text-red-400 hover:bg-red-900/20"
        >
          Remover
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm bg-surface-600 text-stone-400 hover:bg-surface-500"
        >
          Abrir →
        </button>
      </div>
    </div>
  )
}
