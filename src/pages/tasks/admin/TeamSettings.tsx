import { useEffect, useState } from 'react'
import { Plus, Save, Loader2, UserCog, Trash2 } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { Sidebar } from '../../../components/layout/Sidebar'
import { Spinner } from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import type { TeamMember, UserWorkSchedule } from '../../../types/tasks'
import { DAY_OF_WEEK_LABEL } from '../../../types/tasks'
import { ROLE_LABEL } from '../../../config/permissions'

type Role = TeamMember['role']

interface TeamRow {
  email:     string
  name:      string | null
  role:      Role
  active:    boolean
  schedule:  UserWorkSchedule[]
}

export function TeamSettings() {
  const toast = useToast()
  const [rows, setRows] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingEmail, setSavingEmail] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<Role>('almacen')
  const [newNoFixedSchedule, setNewNoFixedSchedule] = useState(false)

  // Default por rol (sólo aplica al crear miembro nuevo). Operadores/maniobristas
  // → marcar "sin horario fijo" para que NO se cree ninguna fila de schedule.
  const DEFAULT_SCHEDULE: Record<Role, { dows: number[]; start: string; end: string }> = {
    admin:             { dows: [1,2,3,4,5], start: '09:00', end: '18:00' },
    servicio_cliente:  { dows: [1,2,3,4,5], start: '09:00', end: '18:00' },
    cobranza:          { dows: [1,2,3,4,5], start: '09:00', end: '18:00' },
    transporte:        { dows: [1,2,3,4,5], start: '08:30', end: '18:30' },
    almacen:           { dows: [1,2,3,4],   start: '08:30', end: '18:30' },
  }
  // Días editables por rol en el row card. Sólo almacén ve sáb/dom.
  const EDITABLE_DAYS: Record<Role, number[]> = {
    admin:             [1,2,3,4,5],
    servicio_cliente:  [1,2,3,4,5],
    cobranza:          [1,2,3,4,5],
    transporte:        [0,1,2,3,4,5,6],
    almacen:           [0,1,2,3,4,5,6],
  }

  const reload = async () => {
    setLoading(true)
    const [{ data: members }, { data: scheds }] = await Promise.all([
      supabase.from('team_members').select('*').order('user_name', { ascending: true, nullsFirst: false }),
      supabase.from('user_work_schedule').select('*'),
    ])

    const map = new Map<string, TeamRow>()
    for (const m of (members ?? []) as TeamMember[]) {
      map.set(m.user_email, {
        email: m.user_email, name: m.user_name, role: m.role, active: m.active, schedule: [],
      })
    }
    // Empleados que tienen horario pero aún no están en team_members
    for (const s of (scheds ?? []) as UserWorkSchedule[]) {
      if (!map.has(s.user_email)) {
        map.set(s.user_email, {
          email: s.user_email, name: null, role: 'almacen', active: true, schedule: [],
        })
      }
      map.get(s.user_email)!.schedule.push(s)
    }
    setRows(Array.from(map.values()).sort((a,b) => (a.name ?? a.email).localeCompare(b.name ?? b.email)))
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setSavingEmail('__new__')
    try {
      const email = newEmail.trim().toLowerCase()
      const { error: errMember } = await supabase.from('team_members').upsert({
        user_email: email,
        user_name: newName.trim() || null,
        role: newRole,
        active: true,
      })
      if (errMember) throw errMember
      // Crear horario default según rol, salvo que sea "sin horario fijo"
      // (operadores / maniobristas).
      if (!newNoFixedSchedule) {
        const { data: existing } = await supabase
          .from('user_work_schedule').select('day_of_week').eq('user_email', email)
        if ((existing ?? []).length === 0) {
          const def = DEFAULT_SCHEDULE[newRole]
          const { error: errSched } = await supabase.from('user_work_schedule').insert(
            def.dows.map(d => ({
              user_email: email,
              day_of_week: d,
              start_time: def.start,
              end_time:   def.end,
            }))
          )
          if (errSched) throw errSched
        }
      }
      setNewEmail(''); setNewName(''); setNewRole('almacen'); setNewNoFixedSchedule(false)
      setShowAddForm(false)
      toast.success('Miembro agregado', email)
      await reload()
    } catch (e) {
      toast.error('No se pudo agregar el miembro', e instanceof Error ? e.message : 'Error desconocido')
    } finally { setSavingEmail(null) }
  }

  const patchRowLocal = (email: string, patch: Partial<TeamRow>) => {
    setRows(prev => prev.map(r => r.email === email ? { ...r, ...patch } : r))
  }

  const updateName = async (row: TeamRow, name: string) => {
    const newName = name.trim() || null
    const prevName = row.name
    patchRowLocal(row.email, { name: newName })             // optimista
    setSavingEmail(row.email)
    try {
      const { data, error: err } = await supabase
        .from('team_members')
        .update({ user_name: newName, role: row.role, active: row.active })
        .eq('user_email', row.email)
        .select()
      if (err) throw err
      if (!data || data.length === 0) throw new Error('RLS_BLOCKED')
    } catch (e) {
      patchRowLocal(row.email, { name: prevName })           // revertir
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      const hint = msg === 'RLS_BLOCKED'
        ? 'Supabase RLS bloqueó la operación. Tu cuenta logueada debe tener role=\'admin\' y active=true en team_members.'
        : msg
      toast.error('No se pudo actualizar el nombre', hint)
    } finally { setSavingEmail(null) }
  }

  const updateRole = async (row: TeamRow, role: Role) => {
    if (role === row.role) return
    const prevRole = row.role
    patchRowLocal(row.email, { role })                       // optimista — el <select> queda en el nuevo valor
    setSavingEmail(row.email)
    try {
      // .select() para forzar a Supabase a devolver las filas afectadas.
      // Sin esto, RLS que filtra silenciosamente devuelve error=null + data=[]
      // y el código pensaba que había éxito.
      const { data, error: err } = await supabase
        .from('team_members')
        .update({ user_name: row.name, role, active: row.active })
        .eq('user_email', row.email)
        .select()
      if (err) throw err
      if (!data || data.length === 0) {
        throw new Error('RLS_BLOCKED')
      }
      toast.success('Rol actualizado', `${row.email} → ${ROLE_LABEL[role]}`)
    } catch (e) {
      patchRowLocal(row.email, { role: prevRole })           // revertir → el <select> vuelve solo
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      let hint = msg
      if (msg === 'RLS_BLOCKED') {
        hint = 'Supabase RLS bloqueó la operación. Tu cuenta logueada debe estar en team_members con role=\'admin\' y active=true. Verifica en Supabase: SELECT * FROM team_members WHERE user_email = \'<tu_email>\';'
      } else if (/check.*role|violates.*check/i.test(msg)) {
        hint = 'El CHECK constraint de team_members aún no acepta "transporte". Corre supabase_migration_role_transporte.sql en Supabase.'
      }
      toast.error('No se pudo cambiar el rol', hint)
    } finally { setSavingEmail(null) }
  }

  const toggleActive = async (row: TeamRow) => {
    const newActive = !row.active
    patchRowLocal(row.email, { active: newActive })          // optimista
    setSavingEmail(row.email)
    try {
      const { data, error: err } = await supabase
        .from('team_members')
        .update({ user_name: row.name, role: row.role, active: newActive })
        .eq('user_email', row.email)
        .select()
      if (err) throw err
      if (!data || data.length === 0) throw new Error('RLS_BLOCKED')
    } catch (e) {
      patchRowLocal(row.email, { active: !newActive })       // revertir
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      const hint = msg === 'RLS_BLOCKED'
        ? 'Supabase RLS bloqueó la operación. Tu cuenta logueada debe tener role=\'admin\' y active=true en team_members.'
        : msg
      toast.error('No se pudo cambiar el estado', hint)
    } finally { setSavingEmail(null) }
  }

  const updateSchedule = async (email: string, dow: number, start: string, end: string) => {
    setSavingEmail(email)
    try {
      const { error: errDel } = await supabase.from('user_work_schedule').delete().eq('user_email', email).eq('day_of_week', dow)
      if (errDel) throw errDel
      if (start && end && end > start) {
        const { error: errIns } = await supabase.from('user_work_schedule').insert({
          user_email: email, day_of_week: dow, start_time: start, end_time: end,
        })
        if (errIns) throw errIns
      }
      await reload()
    } catch (e) {
      toast.error('No se pudo guardar el horario', e instanceof Error ? e.message : 'Error desconocido')
    } finally { setSavingEmail(null) }
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <UserCog size={20} /> Equipo y horarios
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Solo administradores · Determina la disponibilidad de cada miembro</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(s => !s)}
              className="inline-flex items-center gap-2 bg-[#1e3a5f] hover:opacity-90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
            >
              <Plus size={16} /> Agregar miembro
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={addMember} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 grid grid-cols-1 sm:grid-cols-4 gap-3 sm:[&>.full]:col-span-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rol</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-base border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] focus:outline-none">
                  {(Object.entries(ROLE_LABEL) as [Role, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={savingEmail === '__new__'}
                className="inline-flex items-center justify-center gap-2 px-4 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--brand-navy)' }}>
                {savingEmail === '__new__' ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Agregar
              </button>
              <label className="full flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newNoFixedSchedule}
                  onChange={e => setNewNoFixedSchedule(e.target.checked)}
                  className="rounded"
                />
                <span><strong>Sin horario fijo</strong> — operadores / maniobristas (no se les genera horario default; siempre disponibles para asignación puntual)</span>
              </label>
            </form>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando equipo...
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
              <p className="text-sm text-gray-400">Aún no hay miembros del equipo configurados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map(row => (
                <TeamRowCard
                  key={row.email}
                  row={row}
                  editableDays={EDITABLE_DAYS[row.role]}
                  saving={savingEmail === row.email}
                  onName={(n) => updateName(row, n)}
                  onRole={(r) => updateRole(row, r)}
                  onToggleActive={() => toggleActive(row)}
                  onSchedule={(d, s, e) => updateSchedule(row.email, d, s, e)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function TeamRowCard({ row, editableDays, saving, onName, onRole, onToggleActive, onSchedule }: {
  row: TeamRow
  editableDays: number[]
  saving: boolean
  onName: (name: string) => void
  onRole: (role: Role) => void
  onToggleActive: () => void
  onSchedule: (dow: number, start: string, end: string) => void
}) {
  const [name, setName] = useState<string>(row.name ?? '')
  const scheduleByDow = new Map<number, UserWorkSchedule>()
  for (const s of row.schedule) scheduleByDow.set(s.day_of_week, s)
  const nameDirty = (name.trim() || null) !== row.name

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 ${row.active ? '' : 'opacity-60'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 mb-3">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre del empleado"
            className="w-full text-sm font-semibold text-gray-900 px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-[#1e3a5f] focus:outline-none -ml-2"
          />
          <p className="text-[11px] text-gray-500 ml-0">{row.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={row.role}
            onChange={e => onRole(e.target.value as Role)}
            disabled={saving}
            className="px-2 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] focus:outline-none"
          >
            {(Object.entries(ROLE_LABEL) as [Role, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {nameDirty && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onName(name)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--brand-navy)' }}
            >
              {saving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} Guardar
            </button>
          )}
          <button
            type="button"
            onClick={onToggleActive}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              row.active
                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Trash2 size={12} /> {row.active ? 'Desactivar' : 'Reactivar'}
          </button>
        </div>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Horario laboral</p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${
        editableDays.length === 7 ? 'lg:grid-cols-7' : 'lg:grid-cols-5'
      }`}>
        {DAY_OF_WEEK_LABEL.map((label, dow) => {
          if (!editableDays.includes(dow)) return null
          const cur = scheduleByDow.get(dow)
          return (
            <ScheduleEditor
              key={dow}
              label={label}
              start={cur?.start_time?.slice(0, 5) ?? ''}
              end={cur?.end_time?.slice(0, 5) ?? ''}
              onSave={(s, e) => onSchedule(dow, s, e)}
            />
          )
        })}
      </div>
    </div>
  )
}

function ScheduleEditor({ label, start, end, onSave }: {
  label: string
  start: string
  end:   string
  onSave: (start: string, end: string) => void
}) {
  const [s, setS] = useState(start)
  const [e, setE] = useState(end)
  const dirty = s !== start || e !== end
  return (
    <div className="border border-gray-100 rounded-lg p-2">
      <p className="text-[10px] font-bold text-gray-500 mb-1">{label}</p>
      <div className="flex flex-col gap-1">
        <input type="time" value={s} onChange={ev => setS(ev.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded" />
        <input type="time" value={e} onChange={ev => setE(ev.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded" />
        {dirty && (
          <button
            type="button"
            onClick={() => onSave(s, e)}
            className="text-[10px] font-semibold text-[#1e3a5f] hover:underline mt-1"
          >
            Guardar día
          </button>
        )}
      </div>
    </div>
  )
}
