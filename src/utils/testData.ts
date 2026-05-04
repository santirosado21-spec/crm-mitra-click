import type { Operation, OperationStatus, OperationType } from '../types'

export const mockClients = [
  { id: '1', name: 'FITNESS FOR LIFE', contact_name: 'Juan Pérez',     contact_email: 'juan@ffl.com',   contact_phone: '555-1234', rfc: 'FFL010101AAA', is_active: true },
  { id: '2', name: 'AHT',             contact_name: 'María García',    contact_email: 'maria@aht.com',  contact_phone: '555-2345', rfc: 'AHT020202BBB', is_active: true },
  { id: '3', name: 'ITWORKS',         contact_name: 'Carlos López',    contact_email: 'carlos@itw.com', contact_phone: '555-3456', rfc: 'ITW030303CCC', is_active: true },
  { id: '4', name: 'SEKO',            contact_name: 'Ana Martínez',    contact_email: 'ana@seko.com',   contact_phone: '555-4567', rfc: 'SEK040404DDD', is_active: true },
  { id: '5', name: 'TOUGHBUILT',      contact_name: 'Roberto Sánchez', contact_email: 'rob@tb.com',     contact_phone: '555-5678', rfc: 'TGB050505EEE', is_active: true },
]

export const mockProviders = [
  { id: '1', name: 'DHL Express',   contact_name: 'Pedro Ruiz',    contact_email: 'pedro@dhl.com',    contact_phone: '555-0001', rfc: 'DHL010101AAA', is_active: true },
  { id: '2', name: 'FedEx México',  contact_name: 'Laura Gómez',   contact_email: 'laura@fedex.com',  contact_phone: '555-0002', rfc: 'FED020202BBB', is_active: true },
  { id: '3', name: 'Estafeta',      contact_name: 'Miguel Torres', contact_email: 'miguel@estafeta.com', contact_phone: '555-0003', rfc: 'EST030303CCC', is_active: true },
]

export const mockUsers = [
  { id: 'u1', email: 'admin@scmx.com',    name: 'Administrador',  role: 'admin',    is_active: true },
  { id: 'u2', email: 'ops@scmx.com',      name: 'Operaciones',    role: 'operador', is_active: true },
  { id: 'u3', email: 'cobranza@scmx.com', name: 'Cobranza',       role: 'cobranza', is_active: true },
]

export const mockOperations: (Operation & { clients?: { name: string } })[] = [
  {
    id: 'op1', reference: 'SCLER00001', date: '2025-03-04',
    status: 'cerrada'    as OperationStatus, operation_type: 'entrada'  as OperationType,
    client_id: '1', warehouse_id: 'w1', created_by: 'u1',
    pieces: 120, weight_kg: 340, notes: 'Recepción confirmada',
    clients: { name: 'FITNESS FOR LIFE' },
  },
  {
    id: 'op2', reference: 'SCLER00002', date: '2025-03-03',
    status: 'en_proceso' as OperationStatus, operation_type: 'salida'   as OperationType,
    client_id: '2', warehouse_id: 'w1', created_by: 'u1',
    pieces: 45,  weight_kg: 120, notes: '',
    clients: { name: 'AHT' },
  },
  {
    id: 'op3', reference: 'SCLER00003', date: '2025-03-02',
    status: 'cerrada'    as OperationStatus, operation_type: 'recoleccion' as OperationType,
    client_id: '3', warehouse_id: 'w1', created_by: 'u2',
    pieces: 80,  weight_kg: 210, notes: '',
    clients: { name: 'ITWORKS' },
  },
  {
    id: 'op4', reference: 'SCLER00004', date: '2025-03-01',
    status: 'pendiente'  as OperationStatus, operation_type: 'cross_dock' as OperationType,
    client_id: '4', warehouse_id: 'w1', created_by: 'u2',
    pieces: 200, weight_kg: 580, notes: 'En espera de documentación',
    clients: { name: 'SEKO' },
  },
  {
    id: 'op5', reference: 'SCLER00005', date: '2025-02-28',
    status: 'cerrada'    as OperationStatus, operation_type: 'flete'    as OperationType,
    client_id: '5', warehouse_id: 'w1', created_by: 'u1',
    pieces: 60,  weight_kg: 180, notes: '',
    clients: { name: 'TOUGHBUILT' },
  },
  {
    id: 'op6', reference: 'SCLER00006', date: '2025-02-27',
    status: 'cancelada'  as OperationStatus, operation_type: 'maniobra' as OperationType,
    client_id: '1', warehouse_id: 'w1', created_by: 'u1',
    pieces: 0,   weight_kg: 0,   notes: 'Cancelada por cliente',
    clients: { name: 'FITNESS FOR LIFE' },
  },
]
