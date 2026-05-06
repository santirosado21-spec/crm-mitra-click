import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileSpreadsheet, Download, Trash2, CheckCircle2, XCircle, AlertTriangle, Search, Loader2, Database, WifiOff } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useToast } from '../../hooks/useToast'
import {
  isExtensivConfigured,
  getExtensivCustomers,
  getExtensivInventoryByCustomer,
  type ExtensivCustomer,
  type ExtensivStockItem,
} from '../../lib/extensiv'
import * as XLSX from 'xlsx'

/* ─── PDF.js setup ─────────────────────────────────────────────────── */
import * as pdfjsLib from 'pdfjs-dist'
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

/* ─── Types ────────────────────────────────────────────────────────── */
interface SKUResult {
  sku: string
  required: number
  stock: number | null
  status: 'ok' | 'insufficient' | 'missing' | 'partial'
  matchType: 'exact' | 'partial' | 'none'
  matchedSKUs: string[]
  candidateDecisions: Record<string, boolean | null>
  adjusted: boolean
}

interface InventoryMatch {
  stock: number | null
  matchedSKUs: string[]
  matchType: SKUResult['matchType']
}

const MAX_PARTIAL_CANDIDATES = 75

/* ─── Prefix matching helpers ─────────────────────────────────────── */
function sharedPrefixSegments(a: string, b: string): number {
  const pa = a.split('-')
  const pb = b.split('-')
  let count = 0
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    if (pa[i] === pb[i]) count++
    else break
  }
  return count
}

function findInventoryMatch(sku: string, inventory: Record<string, number>, invKeys: string[]): InventoryMatch {
  if (inventory[sku] !== undefined) {
    return { stock: inventory[sku], matchedSKUs: [sku], matchType: 'exact' }
  }
  const startsWithMatches = invKeys.filter(k => k.startsWith(sku))
  if (startsWithMatches.length > 0) {
    const candidates = startsWithMatches
      .sort((a, b) => a.length - b.length || a.localeCompare(b))
      .slice(0, MAX_PARTIAL_CANDIDATES)
    return { stock: null, matchedSKUs: candidates, matchType: 'partial' }
  }
  const ptSegments = sku.split('-')
  const minShared = Math.min(2, ptSegments.length)
  let bestShared = 0
  let bestMatches: string[] = []
  for (const k of invKeys) {
    const shared = sharedPrefixSegments(sku, k)
    if (shared >= minShared) {
      if (shared > bestShared) { bestShared = shared; bestMatches = [k] }
      else if (shared === bestShared) bestMatches.push(k)
    }
  }
  if (bestMatches.length > 0) {
    const candidates = bestMatches
      .sort((a, b) => a.length - b.length || a.localeCompare(b))
      .slice(0, MAX_PARTIAL_CANDIDATES)
    return { stock: null, matchedSKUs: candidates, matchType: 'partial' }
  }
  return { stock: null, matchedSKUs: [], matchType: 'none' }
}

function buildCandidateDecisions(candidates: string[]): SKUResult['candidateDecisions'] {
  return candidates.reduce<SKUResult['candidateDecisions']>((acc, candidate) => {
    acc[candidate] = null
    return acc
  }, {})
}

function getApprovedPartialStock(result: SKUResult, inventory: Record<string, number> | null): number | null {
  if (result.matchType !== 'partial' || !inventory) return result.stock
  const approvedSKUs = result.matchedSKUs.filter(sku => result.candidateDecisions[sku] === true)
  if (approvedSKUs.length === 0) return null
  return approvedSKUs.reduce((sum, sku) => sum + (inventory[sku] || 0), 0)
}

function isPartialReviewComplete(result: SKUResult): boolean {
  return result.matchType !== 'partial' || result.matchedSKUs.every(sku => result.candidateDecisions[sku] !== null)
}

function adjustPartialResult(result: SKUResult, inventory: Record<string, number> | null): SKUResult {
  if (result.matchType !== 'partial') return result
  const stock = getApprovedPartialStock(result, inventory)
  const status: SKUResult['status'] = stock === null
    ? 'missing'
    : stock >= result.required ? 'ok' : 'insufficient'
  return { ...result, stock, status, adjusted: true }
}

/* ─── SKU normalization (mirrors Python logic) ─────────────────────── */
// "Empty-like" placeholders only — dashes within a SKU (HD-003R) are kept.
const EMPTY_VALUES_RE = /^(n\/?a|n\.a\.?|none|nan|null|sin\s*sku|no\s*aplica)$/i

function normalizeSKU(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const cleaned = s.replace(/\s+/g, '').replace(/^(\d+)\.0$/, '$1').toUpperCase()
  if (EMPTY_VALUES_RE.test(cleaned)) return null
  return cleaned
}

/* ─── PDF grid extraction ─────────────────────────────────────────── */
interface PDFItem { text: string; x: number; y: number; page: number }
type PDFRow = PDFItem[]

const SKU_CODE_RE = /^[A-Z0-9][A-Z0-9\-\.\/]{1,}$/
const DESC_HEADER_RE = /descripci[oó]n/
const CANT_HEADER_RE = /^cant\.?$/i

function looksLikeSKU(text: string): boolean {
  const t = text.replace(/\s+/g, '').trim().toUpperCase()
  if (t.length < 2 || t.length > 50) return false
  return SKU_CODE_RE.test(t)
}

function rowToLine(row: PDFRow): string {
  return row.map(i => i.text).join(' ')
}

async function extractPDFGrid(file: File): Promise<PDFRow[]> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const allItems: PDFItem[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!('str' in item)) continue
      const tItem = item as { str: string; transform: number[] }
      if (!tItem.str.trim()) continue
      allItems.push({ text: tItem.str.trim(), x: Math.round(tItem.transform[4]), y: Math.round(tItem.transform[5]), page: i })
    }
  }

  allItems.sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y) || a.x - b.x)

  const rows: PDFRow[] = []
  let currentRow: PDFRow = []
  let lastY: number | null = null
  let lastPage: number | null = null

  for (const item of allItems) {
    if (lastY !== null && (item.page !== lastPage || Math.abs(item.y - lastY) > 4)) {
      if (currentRow.length > 0) rows.push(currentRow)
      currentRow = []
    }
    currentRow.push(item)
    lastY = item.y
    lastPage = item.page
  }
  if (currentRow.length > 0) rows.push(currentRow)
  return rows
}

/* ─── Strategy B: Description+SKU format (SO2554 style) ───────────── */
function extractDescriptionFormat(grid: PDFRow[], headerRowIdx: number, cantX: number): Record<string, number> {
  const result: Record<string, number> = {}
  let pendingQty = 0

  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r]
    const fullText = rowToLine(row)
    if (/inspiring the world|presente orden|page\s+\d/i.test(fullText)) continue
    if (/^(sub\s*total|total|iva|tax|envío)/i.test(fullText.trim())) continue

    const cantItems = row.filter(i => i.x >= cantX - 20)
    const descItems = row.filter(i => i.x < cantX - 20)

    if (cantItems.length > 0) {
      const cantText = cantItems[0].text.replace(/[^\d]/g, '')
      const qty = parseInt(cantText) || 0
      if (qty > 0) pendingQty = qty
    } else if (descItems.length > 0) {
      const text = descItems.map(i => i.text).join(' ').trim()
      if (looksLikeSKU(text) && pendingQty > 0) {
        const sku = normalizeSKU(text)
        if (sku) { result[sku] = (result[sku] || 0) + pendingQty; pendingQty = 0 }
      }
    }
  }
  return result
}

/* ─── Extract SKUs from PDF (multi-strategy) ──────────────────────── */
async function extractSKUsFromPDF(file: File): Promise<Record<string, number>> {
  const grid = await extractPDFGrid(file)
  const result: Record<string, number> = {}

  for (let r = 0; r < grid.length; r++) {
    const lineText = rowToLine(grid[r]).toLowerCase()

    // Strategy B: DESCRIPCIÓN + CANT (e.g. SO2554 format)
    if (DESC_HEADER_RE.test(lineText) && /\bcant\b/.test(lineText)) {
      let cantX: number | null = null
      for (const item of grid[r]) {
        if (CANT_HEADER_RE.test(item.text)) cantX = item.x
      }
      if (cantX !== null) {
        const res = extractDescriptionFormat(grid, r, cantX)
        if (Object.keys(res).length > 0) return res
      }
    }

    // Strategy A: SKU + QTY columns
    const skuRe = /sku|item|n°\s*de\s*parte|no\.?\s*de\s*parte|código|codigo|parte/
    const qtyRe = /qty|cantidad|quantity|piezas|unidades|units|req|cant\b/
    if (skuRe.test(lineText) && qtyRe.test(lineText)) {
      let skuX: number | null = null, qtyXA: number | null = null
      for (const item of grid[r]) {
        const t = item.text.toLowerCase()
        if (skuRe.test(t)) skuX = item.x
        if (qtyRe.test(t)) qtyXA = item.x
      }
      if (skuX !== null && qtyXA !== null) {
        for (let r2 = r + 1; r2 < grid.length; r2++) {
          const skuItems = grid[r2].filter(i => Math.abs(i.x - skuX!) < 30)
          const qtyItems = grid[r2].filter(i => Math.abs(i.x - qtyXA!) < 30)
          const sku = normalizeSKU(skuItems.map(i => i.text).join(' '))
          const qtyStr = qtyItems.map(i => i.text).join(' ').replace(/[^\d.]/g, '')
          if (sku && qtyStr) {
            const qty = parseInt(qtyStr) || 0
            if (qty > 0) result[sku] = (result[sku] || 0) + qty
          }
        }
        if (Object.keys(result).length > 0) return result
      }
    }
  }

  // Fallback
  for (const row of grid) {
    const line = rowToLine(row)
    const parts = line.split(/\s+/)
    if (parts.length >= 2) {
      const first = normalizeSKU(parts[0])
      const last = parts[parts.length - 1]
      if (first && first.length > 3 && /^\d+$/.test(last)) {
        result[first] = (result[first] || 0) + parseInt(last)
      }
    }
  }
  return result
}

/* ─── Extract SKUs from Excel Pick Ticket ──────────────────────────── */
function extractSKUsFromExcel(wb: XLSX.WorkBook): Record<string, number> {
  const skus: Record<string, number> = {}
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return skus

  const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
  let skuCol = -1, qtyCol = -1, headerRow = -1

  for (let r = 0; r < data.length; r++) {
    const row = data[r]
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      const h = String(row[c] ?? '').toLowerCase()
      if (/sku|item|n°\s*de\s*parte|no\.?\s*de\s*parte|código|codigo|parte/.test(h)) skuCol = c
      if (/qty|cantidad|quantity|piezas|unidades|units|req/.test(h)) qtyCol = c
    }
    if (skuCol !== -1 && qtyCol !== -1) { headerRow = r; break }
  }
  if (headerRow === -1) return skus

  for (let r = headerRow + 1; r < data.length; r++) {
    const row = data[r]
    if (!row) continue
    const sku = normalizeSKU(row[skuCol])
    const raw = String(row[qtyCol] ?? '').replace(/[^\d.]/g, '')
    if (sku && raw) {
      const qty = parseInt(raw) || 0
      if (qty > 0) skus[sku] = (skus[sku] || 0) + qty
    }
  }
  return skus
}

/* ─── Process manual inventory Excel ───────────────────────────────── */
function processManualInventory(wb: XLSX.WorkBook): Record<string, number> {
  const inv: Record<string, number> = {}
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return inv

  const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
  let skuCol = -1, stockCol = -1, headerRow = -1

  for (let r = 0; r < data.length; r++) {
    const row = data[r]
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      const h = String(row[c] ?? '').toLowerCase()
      if (/sku|item|código|codigo/.test(h)) skuCol = c
      if (/stock|disponible|cantidad|qty|available/.test(h) && !/req/.test(h)) stockCol = c
    }
    if (skuCol !== -1 && stockCol !== -1) { headerRow = r; break }
  }

  if (headerRow === -1 && data.length > 1) {
    headerRow = 0
    skuCol = 0
    stockCol = (data[0]?.length ?? 1) - 1
  }

  for (let r = headerRow + 1; r < data.length; r++) {
    const row = data[r]
    if (!row) continue
    const sku = normalizeSKU(row[skuCol])
    if (!sku) continue
    const raw = String(row[stockCol] ?? '0').replace(/[^\d.\-]/g, '')
    inv[sku] = parseInt(raw) || 0
  }
  return inv
}

/* ─── Download results as Excel ────────────────────────────────────── */
function downloadResults(results: SKUResult[], ptName: string) {
  const wb = XLSX.utils.book_new()
  const rows = results.map(r => ({
    'SKU (Pick Ticket)': r.sku,
    'Cantidad Requerida': r.required,
    'Cantidad en Stock': r.stock === null ? (r.matchType === 'partial' && !r.adjusted ? 'Pendiente de ajustar' : 'No aparece en sistema') : r.stock,
    'SKU Inventario': r.matchedSKUs.length > 0 ? r.matchedSKUs.join(', ') : '-',
    'Candidatos aprobados': r.matchedSKUs.filter(sku => r.candidateDecisions[sku] === true).join(', ') || '-',
    'Candidatos rechazados': r.matchedSKUs.filter(sku => r.candidateDecisions[sku] === false).join(', ') || '-',
    'Estado': r.matchType === 'partial'
      ? (!r.adjusted ? 'Coincidencia parcial - pendiente de ajustar' : r.status === 'ok' ? 'Coincidencia parcial ajustada - OK' : r.status === 'insufficient' ? 'Coincidencia parcial ajustada - stock insuficiente' : 'Coincidencia parcial ajustada - sin candidatos aprobados')
      : r.status === 'ok' ? 'OK' : r.status === 'insufficient' ? 'Stock insuficiente' : 'No encontrado',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 24 }, { wch: 36 }, { wch: 36 }, { wch: 36 }, { wch: 32 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Validación SKUs')
  XLSX.writeFile(wb, `Resultado_SKUs_${ptName.replace(/\.[^.]+$/, '')}.xlsx`)
}

/* ─── Component ────────────────────────────────────────────────────── */
export function ValidadorSKUPage() {
  const apiConfigured = isExtensivConfigured()
  const toast = useToast()

  // State
  const [ptFile, setPtFile] = useState<File | null>(null)
  const [invFile, setInvFile] = useState<File | null>(null)  // manual fallback
  const [results, setResults] = useState<SKUResult[]>([])
  const [processing, setProcessing] = useState(false)
  const [fetchingInv, setFetchingInv] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<ExtensivCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('')
  const [inventoryCache, setInventoryCache] = useState<Record<string, number> | null>(null)
  const [activeInventory, setActiveInventory] = useState<Record<string, number> | null>(null)
  const [invCount, setInvCount] = useState(0)
  const ptRef = useRef<HTMLInputElement>(null)
  const invRef = useRef<HTMLInputElement>(null)

  // Load Extensiv customers on mount
  useEffect(() => {
    if (!apiConfigured) return
    getExtensivCustomers()
      .then(setCustomers)
      .catch(e => console.warn('Could not load Extensiv customers:', e))
  }, [apiConfigured])

  // Fetch inventory when customer changes
  const fetchInventory = useCallback(async (customerId: number) => {
    setFetchingInv(true)
    setInventoryCache(null)
    setInvCount(0)
    setError('')
    try {
      const items: ExtensivStockItem[] = await getExtensivInventoryByCustomer(customerId)
      const inv: Record<string, number> = {}
      for (const item of items) {
        if (item.sku) inv[item.sku] = item.available
      }
      setInventoryCache(inv)
      setInvCount(Object.keys(inv).length)
    } catch (e) {
      setError(`Error al obtener inventario de Extensiv: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setFetchingInv(false)
    }
  }, [])

  const handleCustomerChange = (id: number | '') => {
    setSelectedCustomer(id)
    setResults([])
    setActiveInventory(null)
    if (id) fetchInventory(id)
    else { setInventoryCache(null); setInvCount(0) }
  }

  // Validate
  const handleValidate = useCallback(async () => {
    if (!ptFile) return
    // Need either API inventory or manual file
    const hasInventory = inventoryCache !== null || invFile !== null
    if (!hasInventory) {
      setError('Selecciona un cliente de Extensiv o sube un archivo de inventario.')
      return
    }

    setProcessing(true)
    setError('')
    setResults([])
    setActiveInventory(null)

    try {
      // 1. Extract SKUs from Pick Ticket
      let skusRequired: Record<string, number>
      if (ptFile.name.toLowerCase().endsWith('.pdf')) {
        skusRequired = await extractSKUsFromPDF(ptFile)
      } else {
        const buf = await ptFile.arrayBuffer()
        skusRequired = extractSKUsFromExcel(XLSX.read(buf))
      }

      if (Object.keys(skusRequired).length === 0) {
        setError('No se encontraron SKUs en el Pick Ticket. Verifica que el archivo tenga columnas de SKU y Cantidad.')
        setProcessing(false)
        return
      }

      // 2. Get inventory (API or manual)
      let inventory: Record<string, number>
      if (inventoryCache) {
        inventory = inventoryCache
      } else if (invFile) {
        const invBuf = await invFile.arrayBuffer()
        inventory = processManualInventory(XLSX.read(invBuf))
      } else {
        inventory = {}
      }
      setActiveInventory(inventory)

      // 3. Cross-reference: exact SKUs are validated; prefix/shared-segment matches require manual cleanup.
      const invKeys = Object.keys(inventory)
      const res: SKUResult[] = Object.entries(skusRequired).map(([sku, required]) => {
        const match = findInventoryMatch(sku, inventory, invKeys)
        let status: SKUResult['status'] = 'missing'
        if (match.matchType === 'partial') {
          status = 'partial'
        } else if (match.stock !== null) {
          status = match.stock >= required ? 'ok' : 'insufficient'
        }
        const candidateDecisions = buildCandidateDecisions(match.matchedSKUs)
        return { sku, required, stock: match.stock, status, matchType: match.matchType, matchedSKUs: match.matchedSKUs, candidateDecisions, adjusted: match.matchType !== 'partial' }
      })

      const order = { missing: 0, partial: 1, insufficient: 2, ok: 3 }
      res.sort((a, b) => order[a.status] - order[b.status])
      setResults(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar')
    } finally {
      setProcessing(false)
    }
  }, [ptFile, invFile, inventoryCache])

  const handleReset = () => {
    setPtFile(null)
    setInvFile(null)
    setResults([])
    setActiveInventory(null)
    setError('')
    setSearch('')
    if (ptRef.current) ptRef.current.value = ''
    if (invRef.current) invRef.current.value = ''
  }

  const stats = {
    total: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    partial: results.filter(r => r.status === 'partial').length,
    insufficient: results.filter(r => r.status === 'insufficient').length,
    missing: results.filter(r => r.status === 'missing').length,
  }

  const handleCandidateDecision = (sku: string, candidate: string, approved: boolean) => {
    setResults(prev => prev.map(result => {
      if (result.sku !== sku || result.matchType !== 'partial') return result
      const candidateDecisions = { ...result.candidateDecisions, [candidate]: approved }
      return { ...result, candidateDecisions, stock: null, status: 'partial', adjusted: false }
    }))
  }

  const partialResults = results.filter(r => r.matchType === 'partial')
  const pendingPartialCount = partialResults.filter(r => !isPartialReviewComplete(r)).length
  const canAdjustResults = partialResults.length > 0 && pendingPartialCount === 0

  const handleAdjustResults = () => {
    // 1) Si quedan SKUs sin decidir, scrolleamos al primero pendiente y avisamos.
    if (pendingPartialCount > 0) {
      const firstPending = partialResults.find(r => !isPartialReviewComplete(r))
      if (firstPending) {
        const row = document.getElementById(`sku-row-${firstPending.sku}`)
        row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        row?.classList.add('ring-2', 'ring-yellow-400')
        setTimeout(() => row?.classList.remove('ring-2', 'ring-yellow-400'), 2000)
      }
      toast.error(
        `Faltan ${pendingPartialCount} SKU${pendingPartialCount === 1 ? '' : 's'} por revisar`,
        'Confirma (✓) o declina (✗) cada candidato antes de ajustar.',
      )
      return
    }

    // 2) Inventory fallback: usa activeInventory; si está null por algún motivo,
    //    cae a inventoryCache (Extensiv) para que el cálculo no se rompa.
    const inv = activeInventory ?? inventoryCache
    if (!inv) {
      toast.error('No hay inventario cargado', 'Vuelve a validar para refrescar el inventario.')
      return
    }

    // 3) Aplicar ajustes y reordenar.
    const order = { missing: 0, partial: 1, insufficient: 2, ok: 3 }
    let adjustedCount = 0
    setResults(prev => {
      const next = prev.map(r => {
        if (r.matchType !== 'partial') return r
        adjustedCount++
        return adjustPartialResult(r, inv)
      })
      next.sort((a, b) => order[a.status] - order[b.status])
      return next
    })
    toast.success(
      `${adjustedCount} resultado${adjustedCount === 1 ? '' : 's'} ajustado${adjustedCount === 1 ? '' : 's'}`,
      'El stock se calculó solo con los candidatos aprobados (✓).',
    )
  }

  const filtered = search
    ? results.filter(r => r.sku.toLowerCase().includes(search.toLowerCase()))
    : results

  const canValidate = ptFile && (inventoryCache !== null || invFile !== null) && !processing && !fetchingInv

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[#1e3a5f]">Validador de SKUs</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Sube el Pick Ticket del cliente — el inventario se obtiene automáticamente de Extensiv
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* LEFT: Client + Inventory source */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <label className="text-xs font-semibold text-gray-600 block">Fuente de Inventario</label>

              {apiConfigured ? (
                <>
                  {/* Extensiv customer selector */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 mb-1 block">Cliente en Extensiv</label>
                    <select
                      value={selectedCustomer}
                      onChange={e => handleCustomerChange(e.target.value ? Number(e.target.value) : '')}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                    >
                      <option value="">Seleccionar cliente...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Inventory status */}
                  {fetchingInv && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 size={14} className="animate-spin" />
                      Obteniendo inventario de Extensiv...
                    </div>
                  )}
                  {inventoryCache && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Database size={14} />
                      {invCount.toLocaleString()} SKUs cargados de Extensiv
                    </div>
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[10px] text-gray-300 font-semibold">O SUBE MANUALMENTE</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <WifiOff size={14} />
                  <span>API de Extensiv no configurada. Sube el inventario manualmente.</span>
                </div>
              )}

              {/* Manual inventory upload (fallback) */}
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  invFile ? 'border-green-300 bg-green-50/50' :
                  inventoryCache ? 'border-gray-100 bg-gray-50/30 opacity-50' :
                  'border-gray-200 hover:border-[#1e3a5f]/30 hover:bg-gray-50'
                }`}
                onClick={() => { if (!inventoryCache) invRef.current?.click() }}
                onDragOver={e => { e.preventDefault() }}
                onDrop={e => {
                  e.preventDefault()
                  if (!inventoryCache && e.dataTransfer.files[0]) setInvFile(e.dataTransfer.files[0])
                }}
              >
                <input
                  ref={invRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setInvFile(e.target.files[0]) }}
                />
                {invFile ? (
                  <div className="flex min-w-0 items-center justify-center gap-2">
                    <FileSpreadsheet size={16} className="text-green-600" />
                    <span className="min-w-0 truncate text-sm font-medium text-green-700">{invFile.name}</span>
                    <button onClick={e => { e.stopPropagation(); setInvFile(null); if (invRef.current) invRef.current.value = '' }}
                      className="ml-2 text-gray-400 hover:text-red-500"><XCircle size={14} /></button>
                  </div>
                ) : inventoryCache ? (
                  <p className="text-xs text-gray-300">Usando inventario de Extensiv</p>
                ) : (
                  <>
                    <Upload size={20} className="text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Subir reporte de inventario (Excel)</p>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT: Pick Ticket upload */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <label className="text-xs font-semibold text-gray-600 mb-3 block">Pick Ticket (PDF o Excel)</label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  ptFile ? 'border-green-300 bg-green-50/50' : 'border-gray-200 hover:border-[#1e3a5f]/30 hover:bg-gray-50'
                }`}
                onClick={() => ptRef.current?.click()}
                onDragOver={e => { e.preventDefault() }}
                onDrop={e => {
                  e.preventDefault()
                  if (e.dataTransfer.files[0]) setPtFile(e.dataTransfer.files[0])
                }}
              >
                <input
                  ref={ptRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setPtFile(e.target.files[0]) }}
                />
                {ptFile ? (
                  <div className="flex min-w-0 items-center justify-center gap-2">
                    <FileSpreadsheet size={18} className="text-green-600" />
                    <span className="min-w-0 truncate text-sm font-medium text-green-700">{ptFile.name}</span>
                    <button onClick={e => { e.stopPropagation(); setPtFile(null); if (ptRef.current) ptRef.current.value = '' }}
                      className="ml-2 text-gray-400 hover:text-red-500"><XCircle size={14} /></button>
                  </div>
                ) : (
                  <>
                    <Upload size={28} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Arrastra o haz clic para subir el Pick Ticket</p>
                    <p className="text-[10px] text-gray-300 mt-1">PDF, XLS, XLSX</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleValidate}
              disabled={!canValidate}
              className="h-10 px-6 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#16304d] transition-colors disabled:opacity-40"
            >
              {processing ? (
                <><Loader2 size={16} className="animate-spin" /> Procesando...</>
              ) : (
                <><Search size={16} /> Validar SKUs</>
              )}
            </button>
            {results.length > 0 && (
              <>
                <button
                  onClick={() => downloadResults(results, ptFile?.name || 'pick_ticket')}
                  className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <Download size={16} /> Descargar Excel
                </button>
                {partialResults.length > 0 && (
                  <button
                    onClick={handleAdjustResults}
                    className={`h-10 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-colors ${
                      canAdjustResults
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : 'bg-yellow-300 hover:bg-yellow-400'
                    }`}
                    title={canAdjustResults
                      ? 'Ajustar resultado con los candidatos aprobados'
                      : `Faltan ${pendingPartialCount} SKU(s) por revisar — clic para ir al primero`
                    }
                  >
                    <CheckCircle2 size={16} /> Ajustar resultados
                    {pendingPartialCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                        {pendingPartialCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <Trash2 size={16} /> Limpiar
                </button>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {partialResults.length > 0 && pendingPartialCount > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              Confirma o declina todos los SKUs en duda para habilitar Ajustar resultados.
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: 'Nunito, sans-serif' }}>{stats.total}</p>
                  <p className="text-xs text-gray-400 mt-1">SKUs totales</p>
                </div>
                <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{stats.ok}</p>
                  <p className="text-xs text-gray-400 mt-1">Exactos disponibles</p>
                </div>
                <div className="bg-white rounded-xl border border-yellow-100 shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{stats.partial}</p>
                  <p className="text-xs text-gray-400 mt-1">Coincidencia parcial</p>
                </div>
                <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{stats.insufficient}</p>
                  <p className="text-xs text-gray-400 mt-1">Stock insuficiente</p>
                </div>
                <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-red-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{stats.missing}</p>
                  <p className="text-xs text-gray-400 mt-1">No encontrados</p>
                </div>
              </div>

              {/* Search */}
              <div className="mb-3">
                <div className="relative w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 w-full"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="max-w-full overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="min-w-[980px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">SKU (Pick Ticket)</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Requerido</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">En Stock</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">SKU Inventario</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const matchDisplay = r.matchedSKUs.length > 0
                        ? r.matchedSKUs.filter(m => m !== r.sku).join(', ') || '(exacto)'
                        : '-'
                      const rowClass = r.matchType === 'partial'
                        ? 'border-b border-yellow-100 bg-yellow-50/40 hover:bg-yellow-50/70 transition-colors'
                        : 'border-b border-gray-50 hover:bg-gray-50/50 transition-colors'
                      return (
                      <tr key={r.sku} id={`sku-row-${r.sku}`} className={rowClass}>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{r.sku}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{r.required}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${
                          r.status === 'ok' ? 'text-green-600' :
                          r.matchType === 'partial' ? 'text-yellow-700' :
                          r.status === 'insufficient' ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {r.stock === null ? (r.matchType === 'partial' && !r.adjusted ? 'Pendiente' : 'No encontrado') : r.stock.toLocaleString()}
                          {r.matchType === 'partial' && r.adjusted && (
                            <div className="text-[10px] font-medium text-yellow-700/80">ajustado</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.matchType === 'partial' ? (
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold text-yellow-800">
                                Empieza igual, termina diferente
                              </div>
                              {r.matchedSKUs.map(candidate => {
                                const decision = r.candidateDecisions[candidate]
                                return (
                                  <div key={candidate} className="flex items-center justify-between gap-2 rounded-md border border-yellow-200 bg-white px-2 py-1.5">
                                    <div className="min-w-0">
                                      <div className="font-mono text-[11px] text-gray-700 truncate">{candidate}</div>
                                      <div className="text-[10px] text-gray-400">
                                        Stock: {(activeInventory?.[candidate] ?? 0).toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        title="Sí sirve para este surtido"
                                        onClick={() => handleCandidateDecision(r.sku, candidate, true)}
                                        className={`h-7 w-7 rounded-full border flex items-center justify-center transition-colors ${
                                          decision === true ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-green-200 text-green-600 hover:bg-green-50'
                                        }`}
                                      >
                                        <CheckCircle2 size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        title="No sirve para este surtido"
                                        onClick={() => handleCandidateDecision(r.sku, candidate, false)}
                                        className={`h-7 w-7 rounded-full border flex items-center justify-center transition-colors ${
                                          decision === false ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                        }`}
                                      >
                                        <XCircle size={15} />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="font-mono text-[11px] text-gray-500">{matchDisplay}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.matchType === 'partial' ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              !r.adjusted ? 'bg-yellow-100 text-yellow-800' :
                              r.status === 'ok' ? 'bg-green-50 text-green-700' :
                              r.status === 'insufficient' ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-600'
                            }`}>
                              {!r.adjusted ? <AlertTriangle size={12} /> : r.status === 'ok' ? <CheckCircle2 size={12} /> : r.status === 'missing' ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                              {!r.adjusted ? 'Pendiente ajuste' : r.status === 'ok' ? 'OK ajustado' : r.status === 'missing' ? 'No aprobado' : 'Insuficiente'}
                            </span>
                          ) : r.status === 'ok' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-[11px] font-semibold">
                              <CheckCircle2 size={12} /> OK
                            </span>
                          ) : r.status === 'insufficient' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-semibold">
                              <AlertTriangle size={12} /> Insuficiente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 text-[11px] font-semibold">
                              <XCircle size={12} /> No existe
                            </span>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
