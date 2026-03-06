import type { PrinterWithStatus, PrinterData } from './api'

type Props = {
  printer: PrinterWithStatus
  data: PrinterData | null
  onLight: (light: 'chamber_light' | 'work_light', on: boolean) => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onClose: () => void
}

const STATE_LABELS: Record<string, string> = {
  IDLE: 'Parada',
  PREPARE: 'Preparando',
  RUNNING: 'Imprimindo',
  PAUSE: 'Pausada',
  FINISH: 'Finalizada',
  FAILED: 'Falha',
  UNKNOWN: 'Desconhecido',
}

export function PrinterDetail({
  printer,
  data,
  onLight,
  onPause,
  onResume,
  onStop,
  onClose,
}: Props) {
  const state = data?.gcode_state ?? 'UNKNOWN'
  const stateLabel = STATE_LABELS[state] ?? state
  const chamberOn =
    data?.lights_report?.find((l) => l.node === 'chamber_light')?.mode === 'on'
  const workOn =
    data?.lights_report?.find((l) => l.node === 'work_light')?.mode === 'on'

  return (
    <div className="fixed inset-0 z-10 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl border border-surface-600 bg-surface-800 shadow-xl overflow-hidden"
        role="dialog"
        aria-labelledby="detail-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600 bg-surface-700/50">
          <h2 id="detail-title" className="font-semibold text-stone-100 font-mono text-sm">
            {printer.serial_number}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-surface-600 transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {!data ? (
            <p className="text-stone-500 text-sm">Aguardando dados da impressora…</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    state === 'RUNNING'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : state === 'PAUSE'
                        ? 'bg-amber-500/20 text-amber-400'
                        : state === 'FAILED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-surface-600 text-stone-400'
                  }`}
                >
                  {stateLabel}
                </span>
                {data.gcode_file && (
                  <span className="text-stone-500 text-sm truncate">
                    {data.gcode_file}
                  </span>
                )}
              </div>

              {(state === 'RUNNING' || state === 'PAUSE' || state === 'PREPARE') && (
                <div className="rounded-xl bg-surface-700/50 p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-stone-500">Progresso</span>
                    <span className="font-mono text-stone-200">
                      {data.print_percent_done}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-600 overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${data.print_percent_done}%` }}
                    />
                  </div>
                  {data.remaining_print_time > 0 && (
                    <p className="text-stone-500 text-xs mt-1">
                      ~{data.remaining_print_time} min restantes
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-700/50 p-3">
                  <p className="text-xs text-stone-500">Mesa</p>
                  <p className="font-mono text-stone-200">
                    {data.bed_temperature?.toFixed(0) ?? '—'}°
                    {data.bed_target_temperature
                      ? ` / ${data.bed_target_temperature.toFixed(0)}°`
                      : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-700/50 p-3">
                  <p className="text-xs text-stone-500">Bico</p>
                  <p className="font-mono text-stone-200">
                    {data.nozzle_temperature?.toFixed(0) ?? '—'}°
                    {data.nozzle_target_temperature
                      ? ` / ${data.nozzle_target_temperature.toFixed(0)}°`
                      : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-700/50 p-3">
                  <p className="text-xs text-stone-500">Câmera</p>
                  <p className="font-mono text-stone-200">
                    {data.chamber_temperature?.toFixed(0) ?? '—'}°
                  </p>
                </div>
                <div className="rounded-lg bg-surface-700/50 p-3">
                  <p className="text-xs text-stone-500">Wi‑Fi</p>
                  <p className="font-mono text-stone-200">
                    {data.wifi_signal || '—'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-stone-500 mb-2">Luzes</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onLight('chamber_light', !chamberOn)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chamberOn
                        ? 'bg-accent text-surface-800'
                        : 'bg-surface-600 text-stone-400 hover:bg-surface-500'
                    }`}
                  >
                    Câmera
                  </button>
                  <button
                    type="button"
                    onClick={() => onLight('work_light', !workOn)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      workOn
                        ? 'bg-accent text-surface-800'
                        : 'bg-surface-600 text-stone-400 hover:bg-surface-500'
                    }`}
                  >
                    Trabalho
                  </button>
                </div>
              </div>

              {(state === 'RUNNING' || state === 'PAUSE' || state === 'PREPARE') && (
                <div className="flex gap-2 pt-2">
                  {state === 'RUNNING' && (
                    <button
                      type="button"
                      onClick={onPause}
                      className="flex-1 py-2.5 rounded-lg bg-amber-500/20 text-amber-400 font-medium text-sm hover:bg-amber-500/30 transition-colors"
                    >
                      Pausar
                    </button>
                  )}
                  {state === 'PAUSE' && (
                    <button
                      type="button"
                      onClick={onResume}
                      className="flex-1 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium text-sm hover:bg-emerald-500/30 transition-colors"
                    >
                      Retomar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onStop}
                    className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-400 font-medium text-sm hover:bg-red-500/30 transition-colors"
                  >
                    Parar impressão
                  </button>
                </div>
              )}

              {data.print_error_code && (
                <div className="rounded-lg bg-red-900/20 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                  Erro: {data.print_error_code}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
