import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { AvailabilityPicker } from '../../components/tasks/AvailabilityPicker'
import { useTasks, getTaskCategories } from '../../hooks/useTasks'
import { useClients } from '../../hooks/useClients'
import { useAuthContext } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import type { TaskCategory } from '../../types/tasks'

interface TeamMember { email: string; name: string | null }

export function TaskCreate() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const myEmail = user?.email ?? ''
  const toast = useToast()
  const { create } = useTasks()
  const { clients, getClients } = useClients()

  const [team, setTeam] = useState<TeamMember[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle]                 = useState('')
  const [description, setDescription]     = useState('')
  const [categoryId, setCategoryId]       = useState<string>('')
  const [clientId, setClientId]           = useState<string>('')
  const [assigneeEmail, setAssigneeEmail] = useState<string>('')
  const [duration, setDuration]           = useState<number>(60)
  const [scheduledStart, setScheduledStart] = useState<Date | null>(null)
  const [scheduledEnd, setScheduledEnd]     = useState<Date | null>(null)

  useEffect(() => {
    getClients()
    getTaskCategories().then(setCategories)
    // Lista de empleados activos del equipo
    Promise.all([
      supabase.from('team_members').select('user_email, user_name').eq('active', true),
      supabase.from('user_work_schedule').select('user_email').limit(500),
    ]).then(([members, sched]) => {
      const set = new Map<string, string | null>()
      for (const r of members.data ?? []) set.set(r.user_email, r.user_name)
      for (const r of sched.data ?? [])   if (!set.has(r.user_email)) set.set(r.user_email, null)
      const arr = Array.from(set.entries()).map(([email, name]) => ({ email, name }))
      arr.sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email))
      setTeam(arr)
    })
  }, [getClients])

  const canSubmit = title.trim() && assigneeEmail && scheduledStart && scheduledEnd && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !scheduledStart || !scheduledEnd) return
    setSubmitting(true)
    setError(null)
    try {
      const t = await create({
        title:           title.trim(),
        description:     description.trim(),
        category_id:     categoryId || null,
        client_id:       clientId || null,
        operation_id:    null,
        assigner_email:  myEmail,
        assignee_email:  assigneeEmail,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end:   scheduledEnd.toISOString(),
      })
      toast.success('Tarea propuesta', `Se le notificará a ${assigneeEmail}.`)
      navigate(`/tasks/${t.id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear tarea'
      setError(msg)
      toast.error('No se pudo crear la tarea', msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1e3a5f] mb-3"
          >
            <ArrowLeft size={14} /> Volver
          </button>

          <h1 className="text-xl font-bold text-[#1e3a5f] mb-1">Nueva tarea</h1>
          <p className="text-xs text-gray-400 mb-5">El destinatario verá la propuesta en su bandeja para aceptarla.</p>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* IZQUIERDA: detalles */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej. Cargar camión SCAZ0042"
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descripción</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none resize-y"
                  placeholder="Detalles, requerimientos, ubicación..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoría</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none bg-white"
                  >
                    <option value="">— sin categoría —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duración (min)</label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    inputMode="numeric"
                    value={duration}
                    onChange={e => {
                      const v = Math.max(15, Number(e.target.value) || 15)
                      setDuration(v)
                      if (scheduledStart) {
                        setScheduledEnd(new Date(scheduledStart.getTime() + v * 60_000))
                      }
                    }}
                    className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cliente (opcional)</label>
                <select
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none bg-white"
                >
                  <option value="">— interno (no facturable) —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.codigo ? `${c.codigo} · ` : ''}{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Asignar a *</label>
                <select
                  required
                  value={assigneeEmail}
                  onChange={e => { setAssigneeEmail(e.target.value); setScheduledStart(null); setScheduledEnd(null) }}
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none bg-white"
                >
                  <option value="">— elegir empleado —</option>
                  {team.filter(t => t.email !== myEmail).map(t => (
                    <option key={t.email} value={t.email}>
                      {t.name ? `${t.name} · ${t.email}` : t.email}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Solo aparecen empleados configurados en Equipo y horarios.
                </p>
              </div>
            </div>

            {/* DERECHA: AvailabilityPicker */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Horario disponible *</p>
              {assigneeEmail ? (
                <AvailabilityPicker
                  userEmail={assigneeEmail}
                  durationMinutes={duration}
                  selectedStart={scheduledStart}
                  onSelect={(s, e) => { setScheduledStart(s); setScheduledEnd(e) }}
                />
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 text-center text-xs text-gray-400">
                  Selecciona un empleado para ver su disponibilidad
                </div>
              )}

              {scheduledStart && scheduledEnd && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-[#1e3a5f]">
                  <strong>Programada:</strong>{' '}
                  {scheduledStart.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                  {' → '}
                  {scheduledEnd.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="lg:col-span-2 flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
              {error && <p className="text-xs text-rose-600 self-center mr-auto">{error}</p>}
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                style={{ background: 'var(--brand-navy)' }}
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                Enviar propuesta
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
