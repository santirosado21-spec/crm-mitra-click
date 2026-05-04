import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { EstadoBadge } from '../../components/common/EstadoBadge'
import { supabase } from '../../lib/supabase'
import { useClients } from '../../hooks/useClients'
import type { Client, Operation } from '../../types'

export function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { deleteClient } = useClients()

  const [client, setClient] = useState<Client | null>(null)
  const [ops, setOps]       = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: c, error: e1 } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single()
        if (e1) throw e1
        setClient(c as Client)

        const { data: o } = await supabase
          .from('operations')
          .select('id, referencia, fecha, estado, tipo_operacion, costo_cliente')
          .eq('cliente_nombre', (c as Client).name)
          .order('fecha', { ascending: false })
          .limit(20)
        setOps((o ?? []) as Operation[])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar cliente')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteClient(id)
      navigate('/clients')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
      setConfirmOpen(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">

          <button
            onClick={() => navigate('/clients')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] mb-5 transition-colors"
          >
            <ArrowLeft size={15} /> Volver a Clientes
          </button>

          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando cliente...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {!loading && client && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-bold text-[#1e3a5f]">{client.name}</h1>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Información general">
                  <dl className="flex flex-col gap-3 text-sm">
                    {[
                      ['Contacto', client.contact_name  ?? '—'],
                      ['Email',    client.contact_email ?? '—'],
                      ['Teléfono', client.contact_phone ?? '—'],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between border-b border-gray-50 pb-2 last:border-0">
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="font-medium text-gray-800">{val}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>

                <Card title="Resumen">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Operaciones totales</p>
                      <p className="text-2xl font-bold text-[#1e3a5f]">{ops.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Facturado (MXN)</p>
                      <p className="text-2xl font-bold text-[#1e3a5f]">
                        {ops.reduce((s, o) => s + (o.costo_cliente || 0), 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="mt-4">
                <Card title="Últimas operaciones">
                  {ops.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Este cliente aún no tiene operaciones registradas</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {['Referencia', 'Fecha', 'Estado'].map(col => (
                            <th key={col} className="text-left py-2 font-medium text-gray-500">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ops.map(op => (
                          <tr key={op.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 font-mono text-[#1e3a5f] text-xs">{op.referencia}</td>
                            <td className="py-2 text-gray-500 text-xs">{op.fecha}</td>
                            <td className="py-2"><EstadoBadge estado={op.estado} size="sm" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            </>
          )}

        </main>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
        message={`¿Eliminar "${client?.name ?? 'este cliente'}"? Las operaciones históricas del cliente no se borrarán.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  )
}
