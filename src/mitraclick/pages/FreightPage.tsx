import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { ViewTabs } from '../components/ViewTabs'
import type { AppRole } from '../auth/roles'
import { statusLabel } from '../lib/documents'
import { formatDate, formatMoney, formatNumber } from '../lib/format'
import { localTodayKey } from '../lib/dates'
import { useView } from '../lib/useView'

type Row = Record<string, unknown>

const QUOTE_ROLES: AppRole[] = ['direccion', 'admin', 'ventas', 'logistica']
const TRIP_ROLES: AppRole[] = ['direccion', 'admin', 'almacen', 'logistica']
const VIEWS: { key: 'cotizaciones' | 'viajes'; label: string }[] = [
  { key: 'cotizaciones', label: 'Cotizaciones de flete' },
  { key: 'viajes', label: 'Viajes' },
]

const VEHICLES = [
  { value: 'moto', label: 'Moto' },
  { value: 'auto', label: 'Automóvil' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: '3_5_t', label: 'Camión 3.5 t' },
  { value: 'rabon', label: 'Rabón' },
  { value: 'torton', label: 'Torton' },
  { value: 'trailer', label: 'Tráiler' },
  { value: 'otro', label: 'Otro' },
]

const vehicleLabel = (value: unknown) => VEHICLES.find((option) => option.value === String(value))?.label ?? String(value ?? '—')
const nested = (row: Row, key: string, field: string) => String((row[key] as Record<string, unknown> | null)?.[field] ?? '—')
const optionalMoney = (value: unknown) => value === null || value === undefined || value === '' ? 'Por cotizar' : formatMoney(Number(value))
const optionalNumber = (value: unknown, suffix: string) => value === null || value === undefined || value === '' ? '—' : `${formatNumber(Number(value))} ${suffix}`

const quoteConfig: ResourceConfig = {
  table: 'freight_quotes',
  noun: 'flete',
  title: 'Cotizador de fletes',
  eyebrow: 'Logística',
  description: 'Solicita y registra opciones de transporte sin mover inventario. Cuando se acepte una, úsala como referencia al crear el viaje.',
  select: 'id,folio,status,origin,destination,distance_km,weight_kg,volume_m3,vehicle_type,carrier,amount,valid_until,notes,customer:customers(name)',
  searchColumns: ['folio', 'origin', 'destination', 'carrier'],
  searchPlaceholder: 'Buscar por folio, origen, destino o transportista…',
  orderBy: { column: 'created_at', ascending: false },
  writeRoles: QUOTE_ROLES,
  rowTitle: (row) => String(row.folio),
  defaults: { status: 'borrador' },
  filters: [{ param: 'estado', column: 'status', label: 'Estado', options: ['borrador', 'solicitada', 'cotizada', 'aceptada', 'rechazada', 'vencida'].map((value) => ({ value, label: statusLabel(value) })) }],
  fields: [
    { name: 'customer_id', label: 'Cliente', type: 'select', relation: { table: 'customers', labelColumn: 'name' } },
    { name: 'status', label: 'Estado', type: 'select', required: true, options: ['borrador', 'solicitada', 'cotizada', 'aceptada', 'rechazada', 'vencida'].map((value) => ({ value, label: statusLabel(value) })) },
    { name: 'origin', label: 'Origen', type: 'text', required: true, placeholder: 'Ciudad o dirección de recolección' },
    { name: 'destination', label: 'Destino', type: 'text', required: true, placeholder: 'Ciudad o dirección de entrega' },
    { name: 'distance_km', label: 'Distancia estimada (km)', type: 'number', min: 0 },
    { name: 'vehicle_type', label: 'Tipo de unidad', type: 'select', options: VEHICLES },
    { name: 'weight_kg', label: 'Peso (kg)', type: 'number', min: 0 },
    { name: 'volume_m3', label: 'Volumen (m³)', type: 'number', min: 0 },
    { name: 'carrier', label: 'Transportista', type: 'text' },
    { name: 'amount', label: 'Importe cotizado', type: 'money', min: 0 },
    { name: 'valid_until', label: 'Vigente hasta', type: 'date' },
    { name: 'notes', label: 'Notas y condiciones', type: 'textarea', wide: true },
  ],
  columns: [
    { key: 'folio', label: 'Cotización' },
    { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={statusLabel(row.status)} /> },
    { key: 'customer', label: 'Cliente', render: (row) => nested(row, 'customer', 'name') },
    { key: 'origin', label: 'Origen' },
    { key: 'destination', label: 'Destino' },
    { key: 'vehicle_type', label: 'Unidad', render: (row) => vehicleLabel(row.vehicle_type) },
    { key: 'weight_kg', label: 'Peso', align: 'right', render: (row) => optionalNumber(row.weight_kg, 'kg') },
    { key: 'amount', label: 'Importe', align: 'right', render: (row) => optionalMoney(row.amount) },
  ],
}

const tripConfig: ResourceConfig = {
  table: 'delivery_trips',
  noun: 'viaje',
  title: 'Viajes',
  eyebrow: 'Logística',
  description: 'Programa unidades y operadores. Crear o editar un viaje no descuenta mercancía; el inventario sólo cambia cuando bodega genera un envío.',
  select: 'id,folio,status,scheduled_on,origin,destination,vehicle_type,carrier,driver,vehicle_plate,tracking_number,quoted_amount,notes,freight_quote:freight_quotes(folio)',
  searchColumns: ['folio', 'origin', 'destination', 'carrier', 'driver', 'vehicle_plate', 'tracking_number'],
  searchPlaceholder: 'Buscar por folio, ruta, operador o placas…',
  orderBy: { column: 'scheduled_on', ascending: false },
  writeRoles: TRIP_ROLES,
  rowTitle: (row) => String(row.folio),
  defaults: { status: 'programado', scheduled_on: localTodayKey() },
  filters: [{ param: 'estado', column: 'status', label: 'Estado', options: ['programado', 'en_ruta', 'completado', 'incidencia', 'cancelado'].map((value) => ({ value, label: statusLabel(value) })) }],
  fields: [
    { name: 'freight_quote_id', label: 'Cotización relacionada', type: 'select', relation: { table: 'freight_quotes', labelColumn: 'folio', onlyActive: false } },
    { name: 'status', label: 'Estado', type: 'select', required: true, options: ['programado', 'en_ruta', 'completado', 'incidencia', 'cancelado'].map((value) => ({ value, label: statusLabel(value) })) },
    { name: 'scheduled_on', label: 'Fecha programada', type: 'date', required: true },
    { name: 'vehicle_type', label: 'Tipo de unidad', type: 'select', options: VEHICLES },
    { name: 'origin', label: 'Origen', type: 'text', required: true },
    { name: 'destination', label: 'Destino', type: 'text', required: true },
    { name: 'carrier', label: 'Transportista', type: 'text' },
    { name: 'driver', label: 'Operador', type: 'text' },
    { name: 'vehicle_plate', label: 'Placas', type: 'text', transform: 'upper' },
    { name: 'tracking_number', label: 'Referencia o guía', type: 'text' },
    { name: 'quoted_amount', label: 'Costo acordado', type: 'money', min: 0 },
    { name: 'notes', label: 'Notas', type: 'textarea', wide: true },
  ],
  columns: [
    { key: 'folio', label: 'Viaje' },
    { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={statusLabel(row.status)} /> },
    { key: 'scheduled_on', label: 'Programado', render: (row) => formatDate(String(row.scheduled_on)) },
    { key: 'origin', label: 'Origen' },
    { key: 'destination', label: 'Destino' },
    { key: 'driver', label: 'Operador' },
    { key: 'vehicle_plate', label: 'Placas' },
    { key: 'quoted_amount', label: 'Costo', align: 'right', render: (row) => optionalMoney(row.quoted_amount) },
  ],
}

export function FreightPage() {
  const view = useView(VIEWS)
  const tabs = <ViewTabs options={VIEWS} current={view} label="Cotizaciones y viajes" />
  return <ResourcePage key={view} config={view === 'viajes' ? tripConfig : quoteConfig} toolbar={tabs} />
}
