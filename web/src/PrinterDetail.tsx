import { useState, useEffect, useCallback } from 'react'
import type { PrinterWithStatus, PrinterData, FileEntry, TrayData, AmsData } from './api'
import { getPrinterFiles } from './api'
import { getPrinterImageSrc, getPrinterModelLabel, PRINTER_MODELS } from './printerImages'

type Props = {
  printer: PrinterWithStatus
  data: PrinterData | null
  onLight: (light: 'chamber_light' | 'work_light', on: boolean) => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onClose: () => void
  onUpdateModel: (id: string, model: string) => Promise<void>
  onUpdateAnalytics: (
    id: string,
    data: { machine_price?: number; machine_life_hours?: number; cost_per_hour?: number }
  ) => Promise<void>
}

const ANALYTICS_ET_KEY = 'spoolab:et'

function getStoredEstTime(printerId: string, fileName: string): number | undefined {
  try {
    const raw = localStorage.getItem(`${ANALYTICS_ET_KEY}:${printerId}:${fileName}`)
    if (raw == null) return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  } catch {
    return undefined
  }
}

function setStoredEstTime(printerId: string, fileName: string, minutes: number) {
  try {
    if (minutes > 0) {
      localStorage.setItem(`${ANALYTICS_ET_KEY}:${printerId}:${fileName}`, String(minutes))
    } else {
      localStorage.removeItem(`${ANALYTICS_ET_KEY}:${printerId}:${fileName}`)
    }
  } catch {
    // ignore
  }
}

const PRINT_EXT = ['.gcode', '.3mf', '.gcode.3mf']

function isPrintFile(name: string): boolean {
  const lower = name.toLowerCase()
  return PRINT_EXT.some((ext) => lower.endsWith(ext))
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

function Section({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-surface-600 bg-surface-700/40 overflow-hidden ${className}`}>
      <h3 className="px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider border-b border-surface-600 bg-surface-800/50">
        {title}
      </h3>
      <div className="p-4">{children}</div>
    </section>
  )
}

function TrayChip({ tray }: { tray: TrayData }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-surface-600/50 px-3 py-2 border border-surface-500"
      title={tray.tray_sub_brands || tray.tray_type || 'Bandeja'}
    >
      <span
        className="w-4 h-4 rounded-full shrink-0 border border-stone-600"
        style={{ backgroundColor: tray.tray_color || '#444' }}
      />
      <span className="text-sm text-stone-200 truncate">
        {tray.tray_type || tray.tray_sub_brands || `Bandeja ${tray.id}`}
      </span>
      {tray.tray_weight > 0 && (
        <span className="text-xs text-stone-500 shrink-0">{tray.tray_weight}g</span>
      )}
    </div>
  )
}

export function PrinterDetail({
  printer,
  data,
  onLight,
  onPause,
  onResume,
  onStop,
  onClose,
  onUpdateModel,
  onUpdateAnalytics,
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview')
  const [modelSaving, setModelSaving] = useState(false)
  const [analyticsRevision, setAnalyticsRevision] = useState(0)
  const [analyticsPath, setAnalyticsPath] = useState('/cache')
  const [analyticsEntries, setAnalyticsEntries] = useState<FileEntry[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [analyticsSaving, setAnalyticsSaving] = useState(false)
  const [analyticsConfig, setAnalyticsConfig] = useState({
    machine_price: printer.machine_price ?? 0,
    machine_life_hours: printer.machine_life_hours ?? 0,
    cost_per_hour: printer.cost_per_hour ?? 0,
  })

  useEffect(() => {
    setAnalyticsConfig({
      machine_price: printer.machine_price ?? 0,
      machine_life_hours: printer.machine_life_hours ?? 0,
      cost_per_hour: printer.cost_per_hour ?? 0,
    })
  }, [printer.machine_price, printer.machine_life_hours, printer.cost_per_hour])

  const loadAnalyticsHistory = useCallback(() => {
    setAnalyticsError(null)
    setAnalyticsLoading(true)
    getPrinterFiles(printer.id, analyticsPath)
      .then((res) => {
        const files = res.entries
          .filter((e) => !e.is_dir && isPrintFile(e.name))
          .sort((a, b) => new Date(b.mod_time).getTime() - new Date(a.mod_time).getTime())
        setAnalyticsEntries(files)
      })
      .catch((e) => setAnalyticsError(e instanceof Error ? e.message : 'Falha ao carregar'))
      .finally(() => setAnalyticsLoading(false))
  }, [printer.id, analyticsPath])

  useEffect(() => {
    if (activeTab === 'analytics' && printer.connected) {
      loadAnalyticsHistory()
    }
  }, [activeTab, printer.connected, loadAnalyticsHistory])

  const state = data?.gcode_state ?? 'UNKNOWN'
  const stateLabel = STATE_LABELS[state] ?? state
  const chamberOn = data?.lights_report?.find((l) => l.node === 'chamber_light')?.mode === 'on'
  const workOn = data?.lights_report?.find((l) => l.node === 'work_light')?.mode === 'on'
  const amsList: AmsData[] = data?.ams ?? []
  const vtTray = data?.vt_tray

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header da página dedicada */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-surface-600 bg-surface-800/80">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-surface-600 transition-colors"
          aria-label="Voltar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="shrink-0 w-12 h-12 rounded-lg bg-surface-700 border border-surface-600 overflow-hidden flex items-center justify-center">
          {getPrinterImageSrc(printer.model) ? (
            <img src={getPrinterImageSrc(printer.model)} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-stone-500 text-xl">🖨</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-stone-100 truncate">
            {getPrinterModelLabel(printer.model) || printer.serial_number}
          </h2>
          <p className="text-xs text-stone-500 font-mono truncate">{printer.serial_number}</p>
          <p className="text-xs text-stone-500 truncate">{printer.host}</p>
        </div>
        <div className="shrink-0">
          <label htmlFor="detail-model" className="sr-only">Modelo</label>
          <select
            id="detail-model"
            value={printer.model ?? ''}
            onChange={async (e) => {
              const model = e.target.value
              setModelSaving(true)
              try {
                await onUpdateModel(printer.id, model)
              } finally {
                setModelSaving(false)
              }
            }}
            disabled={modelSaving}
            className="px-2 py-1.5 rounded-lg bg-surface-600 border border-surface-500 text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
          >
            {PRINTER_MODELS.map((m) => (
              <option key={m.value || 'none'} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Abas */}
      <div className="shrink-0 flex border-b border-surface-600 bg-surface-800/50">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-accent border-b-2 border-accent bg-surface-700/30'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Visão geral
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'text-accent border-b-2 border-accent bg-surface-700/30'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Analytics
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {activeTab === 'analytics' ? (
            /* Aba Analytics */
            <>
              <Section title="Configuração para custo e depreciação">
                <p className="text-stone-500 text-sm mb-3">
                  Preencha para calcular custo operacional e depreciação por impressão. Tempo estimado pode ser informado na tabela abaixo.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Preço da máquina (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={analyticsConfig.machine_price || ''}
                      onChange={(e) =>
                        setAnalyticsConfig((c) => ({
                          ...c,
                          machine_price: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-stone-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Vida útil (horas)</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={analyticsConfig.machine_life_hours || ''}
                      onChange={(e) =>
                        setAnalyticsConfig((c) => ({
                          ...c,
                          machine_life_hours: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-stone-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Custo por hora (R$) — energia + filamento</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={analyticsConfig.cost_per_hour || ''}
                      onChange={(e) =>
                        setAnalyticsConfig((c) => ({
                          ...c,
                          cost_per_hour: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-stone-200 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setAnalyticsSaving(true)
                    try {
                      await onUpdateAnalytics(printer.id, analyticsConfig)
                    } finally {
                      setAnalyticsSaving(false)
                    }
                  }}
                  disabled={analyticsSaving}
                  className="mt-3 px-4 py-2 rounded-lg bg-accent text-surface-800 text-sm font-medium disabled:opacity-50"
                >
                  {analyticsSaving ? 'Salvando…' : 'Salvar configuração'}
                </button>
              </Section>

              <Section title="Histórico de impressão (cache)">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {['/cache', '/'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAnalyticsPath(p)}
                      className={`px-2 py-1.5 rounded text-xs font-medium ${
                        analyticsPath === p ? 'bg-accent/30 text-accent' : 'bg-surface-600 text-stone-400 hover:bg-surface-500'
                      }`}
                    >
                      {p === '/' ? 'Raiz' : 'Cache'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={loadAnalyticsHistory}
                    disabled={analyticsLoading}
                    className="px-2 py-1.5 rounded text-xs bg-surface-600 text-stone-400 hover:bg-surface-500 disabled:opacity-50"
                  >
                    {analyticsLoading ? '…' : '↻ Atualizar'}
                  </button>
                </div>
                {analyticsError ? (
                  <p className="text-red-400 text-sm">{analyticsError}</p>
                ) : analyticsEntries.length === 0 && !analyticsLoading ? (
                  <p className="text-stone-500 text-sm">Nenhum arquivo .gcode/.3mf neste diretório.</p>
                ) : (
                  <>
                    {/* Resumo */}
                    {(() => {
                      const totalSize = analyticsEntries.reduce((s, e) => s + e.size, 0)
                      const estTimes = analyticsEntries.map((e) => getStoredEstTime(printer.id, e.name) ?? 0)
                      const totalEstMin = estTimes.reduce((a, b) => a + b, 0)
                      const price = analyticsConfig.machine_price || 0
                      const life = analyticsConfig.machine_life_hours || 0
                      const costPerHr = analyticsConfig.cost_per_hour || 0
                      const depreciaçãoPorHora = life > 0 ? price / life : 0
                      const custoTotal = (totalEstMin / 60) * costPerHr
                      const deprecTotal = (totalEstMin / 60) * depreciaçãoPorHora
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                          <div className="rounded-lg bg-surface-600/50 p-2">
                            <p className="text-xs text-stone-500">Arquivos</p>
                            <p className="font-mono text-stone-200">{analyticsEntries.length}</p>
                          </div>
                          <div className="rounded-lg bg-surface-600/50 p-2">
                            <p className="text-xs text-stone-500">Espaço</p>
                            <p className="font-mono text-stone-200">
                              {(totalSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <div className="rounded-lg bg-surface-600/50 p-2">
                            <p className="text-xs text-stone-500">Tempo est. total</p>
                            <p className="font-mono text-stone-200">
                              {totalEstMin > 0 ? `${(totalEstMin / 60).toFixed(1)} h` : '—'}
                            </p>
                          </div>
                          <div className="rounded-lg bg-surface-600/50 p-2">
                            <p className="text-xs text-stone-500">Custo est.</p>
                            <p className="font-mono text-stone-200">
                              {custoTotal > 0 ? `R$ ${custoTotal.toFixed(2)}` : '—'}
                            </p>
                          </div>
                          <div className="rounded-lg bg-surface-600/50 p-2">
                            <p className="text-xs text-stone-500">Depreciação est.</p>
                            <p className="font-mono text-stone-200">
                              {deprecTotal > 0 ? `R$ ${deprecTotal.toFixed(2)}` : '—'}
                            </p>
                          </div>
                        </div>
                      )
                    })()}
                    <div className="overflow-x-auto rounded-lg border border-surface-600">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-surface-600 bg-surface-800/50">
                            <th className="text-left px-3 py-2 text-stone-500 font-medium">Arquivo</th>
                            <th className="text-left px-3 py-2 text-stone-500 font-medium">Data</th>
                            <th className="text-right px-3 py-2 text-stone-500 font-medium">Tamanho</th>
                            <th className="text-right px-3 py-2 text-stone-500 font-medium">Tempo est. (min)</th>
                            <th className="text-right px-3 py-2 text-stone-500 font-medium">Custo (R$)</th>
                            <th className="text-right px-3 py-2 text-stone-500 font-medium">Depreciação (R$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsEntries.map((e) => {
                            const estMin = getStoredEstTime(printer.id, e.name) ?? 0
                            const price = analyticsConfig.machine_price || 0
                            const life = analyticsConfig.machine_life_hours || 0
                            const costPerHr = analyticsConfig.cost_per_hour || 0
                            const deprecPerHr = life > 0 ? price / life : 0
                            const custo = estMin > 0 ? (estMin / 60) * costPerHr : 0
                            const deprec = estMin > 0 ? (estMin / 60) * deprecPerHr : 0
                            return (
                              <tr key={e.name} className="border-b border-surface-600/80 hover:bg-surface-600/20">
                                <td className="px-3 py-2 font-mono text-stone-200 truncate max-w-[180px]" title={e.name}>
                                  {e.name}
                                </td>
                                <td className="px-3 py-2 text-stone-400">{e.mod_time}</td>
                                <td className="px-3 py-2 text-right text-stone-400">
                                  {(e.size / 1024).toFixed(1)} KB
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={estMin || ''}
                                    onChange={(ev) => {
                                      const v = Number(ev.target.value) || 0
                                      setStoredEstTime(printer.id, e.name, v)
                                      setAnalyticsRevision((r) => r + 1)
                                    }}
                                    placeholder="—"
                                    className="w-16 px-2 py-1 rounded bg-surface-800 border border-surface-600 text-stone-200 text-right text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-stone-400">
                                  {custo > 0 ? custo.toFixed(2) : '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-stone-400">
                                  {deprec > 0 ? deprec.toFixed(2) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Section>
            </>
          ) : !data ? (
            <p className="text-stone-500 text-center py-8">Aguardando dados da impressora…</p>
          ) : (
            <>
              {/* Status atual + progresso */}
              <Section title="Status">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
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
                    <span className="text-stone-400 text-sm font-mono truncate max-w-[200px] sm:max-w-none">
                      {data.gcode_file}
                    </span>
                  )}
                </div>
                {(state === 'RUNNING' || state === 'PAUSE' || state === 'PREPARE') && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-stone-500">Progresso</span>
                      <span className="font-mono text-stone-200">{data.print_percent_done}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-600 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${data.print_percent_done}%` }}
                      />
                    </div>
                    {data.remaining_print_time > 0 && (
                      <p className="text-stone-500 text-xs mt-1">~{data.remaining_print_time} min restantes</p>
                    )}
                  </div>
                )}
                {(state === 'RUNNING' || state === 'PAUSE' || state === 'PREPARE') && (
                  <div className="flex gap-2 mt-4">
                    {state === 'RUNNING' && (
                      <button
                        type="button"
                        onClick={onPause}
                        className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 font-medium text-sm hover:bg-amber-500/30"
                      >
                        Pausar
                      </button>
                    )}
                    {state === 'PAUSE' && (
                      <button
                        type="button"
                        onClick={onResume}
                        className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium text-sm hover:bg-emerald-500/30"
                      >
                        Retomar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onStop}
                      className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 font-medium text-sm hover:bg-red-500/30"
                    >
                      Parar impressão
                    </button>
                  </div>
                )}
                {data.print_error_code && (
                  <div className="mt-3 rounded-lg bg-red-900/20 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                    Erro: {data.print_error_code}
                  </div>
                )}
              </Section>

              {/* Temperaturas + rede */}
              <Section title="Temperaturas e rede">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-surface-600/50 p-3">
                    <p className="text-xs text-stone-500">Mesa</p>
                    <p className="font-mono text-stone-200">
                      {data.bed_temperature?.toFixed(0) ?? '—'}°
                      {data.bed_target_temperature ? ` / ${data.bed_target_temperature.toFixed(0)}°` : ''}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-600/50 p-3">
                    <p className="text-xs text-stone-500">Bico</p>
                    <p className="font-mono text-stone-200">
                      {data.nozzle_temperature?.toFixed(0) ?? '—'}°
                      {data.nozzle_target_temperature ? ` / ${data.nozzle_target_temperature.toFixed(0)}°` : ''}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-600/50 p-3">
                    <p className="text-xs text-stone-500">Câmera</p>
                    <p className="font-mono text-stone-200">{data.chamber_temperature?.toFixed(0) ?? '—'}°</p>
                  </div>
                  <div className="rounded-lg bg-surface-600/50 p-3">
                    <p className="text-xs text-stone-500">Wi‑Fi</p>
                    <p className="font-mono text-stone-200">{data.wifi_signal || '—'}</p>
                  </div>
                </div>
                {(data.nozzle_diameter || data.part_fan_speed !== undefined) && (
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-500">
                    {data.nozzle_diameter && <span>Bico: {data.nozzle_diameter}</span>}
                    {data.part_fan_speed !== undefined && <span>Vent. peça: {data.part_fan_speed}</span>}
                    {data.chamber_fan_speed !== undefined && <span>Vent. câmera: {data.chamber_fan_speed}</span>}
                  </div>
                )}
              </Section>

              {/* Filamento: AMS + bandeja interna */}
              <Section title="Filamento">
                {data.ams_exists && amsList.length > 0 ? (
                  <div className="space-y-4">
                    {amsList.map((ams) => (
                      <div key={ams.id}>
                        <p className="text-xs text-stone-500 mb-2">
                          AMS {ams.id} · {ams.temperature?.toFixed(0) ?? '—'}° · Umidade {ams.humidity}/5
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ams.trays.map((t) => (
                            <TrayChip key={t.id} tray={t} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {vtTray && (vtTray.tray_type || vtTray.tray_sub_brands || vtTray.tray_weight > 0) && (
                  <div className={amsList.length > 0 ? 'mt-4 pt-3 border-t border-surface-600' : ''}>
                    <p className="text-xs text-stone-500 mb-2">Bandeja interna (VT)</p>
                    <TrayChip tray={vtTray} />
                  </div>
                )}
                {!data.ams_exists && (!vtTray || (!vtTray.tray_type && vtTray.tray_weight === 0)) && (
                  <p className="text-stone-500 text-sm">Nenhum filamento reportado.</p>
                )}
              </Section>

              {/* Controles: luzes */}
              <Section title="Controles">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onLight('chamber_light', !chamberOn)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chamberOn ? 'bg-accent text-surface-800' : 'bg-surface-600 text-stone-400 hover:bg-surface-500'
                    }`}
                  >
                    Luz câmera
                  </button>
                  <button
                    type="button"
                    onClick={() => onLight('work_light', !workOn)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      workOn ? 'bg-accent text-surface-800' : 'bg-surface-600 text-stone-400 hover:bg-surface-500'
                    }`}
                  >
                    Luz trabalho
                  </button>
                </div>
              </Section>

            </>
          )}
        </div>
      </div>
    </div>
  )
}
