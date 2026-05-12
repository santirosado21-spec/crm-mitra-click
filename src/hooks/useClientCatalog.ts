import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { deriveSiglas } from '../lib/siglas'

// Catálogo de clientes con código — reemplaza CLIENTES_BITACORA hardcoded
export interface ClienteCatalog {
  id: string
  codigo: string
  nombre: string
  extensiv_customer_id?: number | null
}

// Fallback local en caso de que Supabase no responda
export const FALLBACK_CLIENTES: ClienteCatalog[] = [
  { id: '', codigo: '200',  nombre: 'FITNESS FOR LIFE RIVIERA MAYA' },
  { id: '', codigo: '090',  nombre: 'FITNESS FOR LIFE MÉRIDA' },
  { id: '', codigo: 'VY8',  nombre: 'VERMONT YORK' },
  { id: '', codigo: 'WD',   nombre: 'WORLD DIAGNOSTIC' },
  { id: '', codigo: '600',  nombre: 'EPOSNOW' },
  { id: '', codigo: 'KST',  nombre: 'KST (SUPPLY CHAIN WORLDWIDE)' },
  { id: '', codigo: 'SK',   nombre: 'SEKO' },
  { id: '', codigo: '070',  nombre: 'GNR' },
  { id: '', codigo: 'BSF',  nombre: 'BASF' },
  { id: '', codigo: 'KYN',  nombre: 'KYNDRYL' },
  { id: '', codigo: '500',  nombre: 'ITWORKS' },
  { id: '', codigo: 'RED',  nombre: 'LA RED' },
  { id: '', codigo: 'LUL',  nombre: 'LULULEMON' },
  { id: '', codigo: 'BB',   nombre: 'BURBERRY' },
  { id: '', codigo: 'TB',   nombre: 'TOUGHBUILT' },
  { id: '', codigo: '800',  nombre: 'RMC' },
  { id: '', codigo: 'MC',   nombre: 'MICROCOMPUTADORAS' },
  { id: '', codigo: 'AZ',   nombre: 'ANTONIO ZAPATA' },
  { id: '', codigo: 'PG',   nombre: 'PRINCIPLE GLOBAL' },
  { id: '', codigo: '700',  nombre: 'PANTANS' },
  { id: '', codigo: '080',  nombre: 'CASIQUE RUTA NORMAL' },
  { id: '', codigo: 'AHT',  nombre: 'AHT' },
  { id: '', codigo: '400',  nombre: 'TEQUILA ENEMIGO' },
  { id: '', codigo: 'IFT',  nombre: 'IFIT' },
  { id: '', codigo: '071',  nombre: 'TARGET CONSULTING' },
  { id: '', codigo: 'WB',   nombre: 'WI-BO' },
]

export function useClientCatalog() {
  const [clientes, setClientes] = useState<ClienteCatalog[]>(FALLBACK_CLIENTES)
  const [loading, setLoading] = useState(true)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, codigo, extensiv_customer_id')
        .eq('is_active', true)
        .order('name')

      if (error || !data || data.length === 0) {
        setClientes(FALLBACK_CLIENTES)
        return
      }

      setClientes(
        data.map((c: { id: string; name: string; codigo: string | null; extensiv_customer_id?: number | null }) => ({
          id: c.id,
          codigo: c.codigo && c.codigo.trim() ? c.codigo : deriveSiglas(c.name),
          nombre: c.name,
          extensiv_customer_id: c.extensiv_customer_id ?? null,
        }))
      )
    } catch {
      setClientes(FALLBACK_CLIENTES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  // Helpers
  const findByCodigo = (codigo: string) => clientes.find(c => c.codigo === codigo)
  const findByNombre = (nombre: string) => clientes.find(c => c.nombre === nombre)

  return { clientes, loading, fetchClientes, findByCodigo, findByNombre }
}
