import { useEffect, useState } from 'react'
import { Plus, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { useClients } from '../../hooks/useClients'
import { ClientModal } from '../../components/features/ClientModal'

export function ClientsList() {
  const navigate = useNavigate()
  const { clients, loading, error, getClients } = useClients()
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { getClients() }, [])

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Directorio de Clientes</h1>
              <p className="text-xs text-gray-400 mt-0.5">Empresas activas en el sistema</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-[#1e3a5f] hover:opacity-90 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity"
              style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.3)' }}
            >
              <Plus size={16} /> Nuevo Cliente
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando clientes...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Nombre', 'Contacto', 'Email', 'Teléfono', ''].map((col, i) => (
                      <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                        No hay clientes registrados
                      </td>
                    </tr>
                  ) : clients.map((c, i) => (
                    <tr
                      key={c.id}
                      className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 ? 'bg-gray-50/40' : ''}`}
                    >
                      <td className="px-4 py-3 font-semibold text-[#1e3a5f]">{c.name}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{c.contact_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.contact_email ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.contact_phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/clients/${c.id}`)}
                          className="flex items-center gap-1.5 text-xs text-[#1e3a5f] border border-[#1e3a5f] px-3 py-1.5 rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors"
                        >
                          <Eye size={13} /> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>

      <ClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => getClients()}
      />
    </div>
  )
}
