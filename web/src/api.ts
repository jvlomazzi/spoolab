const API = '/api'

export type Printer = {
  id: string
  host: string
  access_code: string
  serial_number: string
}

export type PrinterWithStatus = Printer & { connected: boolean }

export type PrinterData = {
  gcode_state: string
  gcode_state_description: string
  bed_temperature: number
  bed_target_temperature: number
  nozzle_temperature: number
  nozzle_target_temperature: number
  chamber_temperature: number
  print_percent_done: number
  remaining_print_time: number
  gcode_file: string
  print_error_code: string
  lights_report: { node: string; mode: string }[]
  ams_exists: boolean
  wifi_signal: string
}

export async function listPrinters(): Promise<PrinterWithStatus[]> {
  const r = await fetch(`${API}/printers`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function addPrinter(body: {
  host: string
  access_code: string
  serial_number: string
}): Promise<Printer> {
  const r = await fetch(`${API}/printers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function removePrinter(id: string): Promise<Printer> {
  const r = await fetch(`${API}/printers/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function connectPrinter(id: string): Promise<void> {
  const r = await fetch(`${API}/printers/${id}/connect`, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
}

export async function disconnectPrinter(id: string): Promise<void> {
  const r = await fetch(`${API}/printers/${id}/disconnect`, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
}

export async function getPrinterData(id: string): Promise<PrinterData> {
  const r = await fetch(`${API}/printers/${id}/data`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function setLight(
  id: string,
  light: 'chamber_light' | 'work_light',
  on: boolean
): Promise<void> {
  const r = await fetch(`${API}/printers/${id}/light`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ light, on }),
  })
  if (!r.ok) throw new Error(await r.text())
}

export async function pausePrint(id: string): Promise<void> {
  const r = await fetch(`${API}/printers/${id}/pause`, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
}

export async function resumePrint(id: string): Promise<void> {
  const r = await fetch(`${API}/printers/${id}/resume`, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
}

export async function stopPrint(id: string): Promise<void> {
  const r = await fetch(`${API}/printers/${id}/stop`, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
}
