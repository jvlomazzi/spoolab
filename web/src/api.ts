const API = '/api'

export type Printer = {
  id: string
  host: string
  access_code: string
  serial_number: string
  model?: string
  machine_price?: number
  machine_life_hours?: number
  cost_per_hour?: number
}

export type PrinterWithStatus = Printer & { connected: boolean }

export type TrayData = {
  id: number
  bed_temperature: number
  drying_temperature: number
  drying_time: number
  nozzle_temp_max: number
  nozzle_temp_min: number
  tray_color: string
  tray_diameter: number
  tray_sub_brands: string
  tray_type: string
  tray_weight: number
}

export type AmsData = {
  id: number
  humidity: number
  temperature: number
  trays: TrayData[]
}

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
  ams?: AmsData[]
  vt_tray?: TrayData
  wifi_signal: string
  nozzle_diameter?: string
  auxiliary_fan_speed?: number
  chamber_fan_speed?: number
  part_fan_speed?: number
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
  model?: string
}): Promise<Printer> {
  const r = await fetch(`${API}/printers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updatePrinter(
  id: string,
  body: {
    model?: string
    machine_price?: number
    machine_life_hours?: number
    cost_per_hour?: number
  }
): Promise<Printer> {
  const r = await fetch(`${API}/printers/${id}`, {
    method: 'PATCH',
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

export type FileEntry = {
  name: string
  size: number
  mod_time: string
  is_dir: boolean
}

export type PrinterFilesResponse = {
  path: string
  entries: FileEntry[]
}

export async function getPrinterFiles(
  id: string,
  path: string = '/'
): Promise<PrinterFilesResponse> {
  const r = await fetch(`${API}/printers/${id}/files?path=${encodeURIComponent(path)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
