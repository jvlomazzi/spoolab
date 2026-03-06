// Lista de modelos para selects (valor, label)
export const PRINTER_MODELS = [
  { value: '', label: '— Não informado' },
  { value: 'X1C', label: 'X1 Carbon' },
  { value: 'X1E', label: 'X1E' },
  { value: 'P1S', label: 'P1S' },
  { value: 'P2S', label: 'P2S' },
  { value: 'A1', label: 'A1' },
  { value: 'A1mini', label: 'A1 mini' },
  { value: 'H2D', label: 'H2D' },
  { value: 'H2S', label: 'H2S' },
  { value: 'H2C', label: 'H2C' },
] as const

// Mapeia modelo (valor do form) para nome do arquivo em /printers/
const MODEL_IMAGE: Record<string, string> = {
  X1C: 'X1C.png',
  X1E: 'X1E.png',
  A1: 'A1.png',
  A1mini: 'A1mini.png',
  P1S: 'P1S.png',
  P2S: 'P2S-qw75b7il1t.png',
  H2D: 'H2D-139c8d33e2ed.png',
  H2S: 'H2S-mimdn0opvna.png',
  H2C: 'h2c-h2e4s63566c.png',
}

const MODEL_LABEL: Record<string, string> = {
  X1C: 'X1 Carbon',
  X1E: 'X1E',
  A1: 'A1',
  A1mini: 'A1 mini',
  P1S: 'P1S',
  P2S: 'P2S',
  H2D: 'H2D',
  H2S: 'H2S',
  H2C: 'H2C',
}

export function getPrinterImageSrc(model?: string): string {
  if (!model) return ''
  const file = MODEL_IMAGE[model]
  return file ? `/printers/${file}` : ''
}

export function getPrinterModelLabel(model?: string): string {
  if (!model) return ''
  return MODEL_LABEL[model] ?? model
}
