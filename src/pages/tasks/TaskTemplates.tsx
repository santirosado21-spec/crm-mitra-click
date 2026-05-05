import { useEffect, useState } from 'react'
import { Plus, Trash2, Power, RefreshCw, Loader2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { RecurringTaskBuilder } from '../../components/tasks/RecurringTaskBuilder'
import { useClients } from '../../hooks/useClients'
import { getTaskCategories } from '../../hooks/useTasks'
import { useAuthContext } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import type { TaskCategory, TaskTemplate } from '../../types/tasks'

interface TeamMember { email: string; name: string | null }

export function TaskTemplates() {
  const { user } = useAuthContext()
  const myEmail = user?.email ?? ''
  const { clients, getClients } = useClients()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [materializing, setMaterializing] = useState(false)
  const [materializeMsg, setMaterializeMsg] = useState<string | null>(null)

  // Form state
  const [title, setTitle]                   = useState('')
  const [description, setDescription]       = useState('')
  const [categoryId, setCategoryId]         = useState('')
  const [clientId, setClientId]             = useState('')
  const [assigneeEmail, setAssigneeEmail]   = useState('')
  const [duration, setDuration]             = useState(60)
  const [startTime, setStartTime]           = useState('08:00')
  const [rrule, setRrule]                   = useState('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    const { data } = await supabase.from('task_templates').select('*').order('created_at', { ascending: false })
    setTemplates((data ?? []) as TaskTemplate[])
    setLoading(false)
  }

  useEffect(() => {
    getClients()
    getTaskCategories().then(setCategories)
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
    reload()
  }, [getClients])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !assigneeEmail) return
    setSubmitting(true); setError(null)
    try {
      const { error } = await supabase.from('task_templates').insert({
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId || null,
        client_id: clientId || null,
        default_assignee_email: assigneeEmail,
        duration_minutes: duration,
        recurrence_rule: rrule,
        start_time: startTime,
        active: true,
        created_by: myEmail,
      })
      if (error) throw error
      setTitle(''); setDescription(''); setCategoryId(''); setClientId(''); setAssigneeEmail('')
      setShowForm(false)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (t: TaskTemplate) => {
    await supabase.from('task_templates').update({ active: !t.active }).eq('id', t.id)
    await reload()
  }

  const remove = async (t: TaskTemplate) => {
    if (!window.confirm(`¿Eliminar plantilla "${t.title}"?`)) return
    await supabase.from('task_templates').delete().eq('id', t.id)
    await reload()
  }

  const materializeNow = async () => {
    setMaterializing(true); setMaterializeMsg(null)
    try {
      const until = new Date(); until.setDate(until.getDate() + 7)
      const { data, error } = await supabase.rpc('materialize_task_templates', { p_until: until.toISOString().slice(0, 10) })
      if (error) throw error
      setMaterializeMsg(`Se generaron ${data ?? 0} tareas hasta ${until.toLocaleDateString('es-MX')}`)
    } catch (e: unknown) {
      setMaterializeMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setMaterializing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Plantillas recurrentes</h1>
              <p className="text-xs text-gray-400 mt-0.5">Tareas que se generan automáticamente con un calendario</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={materializeNow}
                disabled={materializing}
                className="inline-flex items-center justify-center gap-2 bg-white text-[#1e3a5f] border border-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                {materializing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                Generar próximos 7 días
              </button>
              <button
                type="button"
                onClick={() => setShowForm(s => !s)}
                className="inline-flex items-center justify-center gap-2 bg-[#1e3a5f] hover:opacity-90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity"
              >
                <Plus size={16} /> Nueva plantilla
              </button>
            </div>
          </div>

          {materializeMsg && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-lg">
              {materializeMsg}
            </div>
          )}

          {showForm && (
            <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título *</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descripción</label>
                <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none resize-y" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoría</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg bg-white">
                  <option value="">— sin categoría —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cliente</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg bg-white">
                  <option value="">— sin cliente —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.codigo ? `${c.codigo} · ` : ''}{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Asignar a *</label>
                <select required value={assigneeEmail} onChange={e => setAssigneeEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg bg-white">
                  <option value="">— elegir —</option>
                  {team.map(t => <option key={t.email} value={t.email}>{t.name ? `${t.name} · ${t.email}` : t.email}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hora inicio</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duración (min)</label>
                  <input type="number" min={15} step={15} value={duration} onChange={e => setDuration(Math.max(15, +e.target.value || 15))}
                    className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Recurrencia</label>
                <RecurringTaskBuilder value={rrule} onChange={setRrule} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-gray-100">
                {error && <p className="text-xs text-rose-600 mr-auto self-center">{error}</p>}
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'var(--brand-navy)' }}>
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  Crear plantilla
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando...
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
              <p className="text-sm text-gray-400">Aún no hay plantillas recurrentes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{t.title}</h3>
                      <p className="text-[11px] text-gray-500 truncate">{t.default_assignee_email}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      t.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {t.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  {t.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{t.description}</p>}
                  <p className="text-[11px] font-mono text-gray-400 mb-2">
                    {t.recurrence_rule} · {t.start_time?.slice(0,5)} · {t.duration_minutes} min
                  </p>
                  <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-100">
                    <button type="button" onClick={() => toggleActive(t)}
                      className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#1e3a5f] px-2 py-1 rounded">
                      <Power size={12} /> {t.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button type="button" onClick={() => remove(t)}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:bg-rose-50 px-2 py-1 rounded">
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
