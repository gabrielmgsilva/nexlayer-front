import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, Money, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { maintenanceService, equipmentService } from '@/services/entities.service'
import type { MaintenanceLog } from '@/types/api.types'

const inputCls = 'w-full h-9 px-3 bg-transparent text-[13px] focus:outline-none'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>{label}</span>
      <div style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6, color: NEX.text }}>{children}</div>
    </label>
  )
}
function getApiMessage(err: unknown, fallback: string) {
  const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  if (Array.isArray(m)) return m[0] ?? fallback
  return m ?? fallback
}

function dueTone(nextDueAt?: string): 'red' | 'amber' | 'green' | null {
  if (!nextDueAt) return null
  const due = new Date(nextDueAt)
  const now = new Date()
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0)  return 'red'
  if (diffDays <= 14) return 'amber'
  return 'green'
}

function dueLabel(nextDueAt?: string): string | null {
  if (!nextDueAt) return null
  const due = new Date(nextDueAt)
  const now = new Date()
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0)  return `Vencida há ${Math.abs(diffDays)}d`
  if (diffDays === 0) return 'Vence hoje'
  if (diffDays <= 14) return `Vence em ${diffDays}d`
  return `Próxima em ${diffDays}d`
}

export function MaintenancePage() {
  const queryClient = useQueryClient()

  const { data: logsRes } = useQuery({
    queryKey: ['maintenance', 'all'],
    queryFn: () => maintenanceService.findAll({ limit: 200 }),
  })
  const logs: MaintenanceLog[] = logsRes?.data ?? []

  const { data: equipmentRes } = useQuery({
    queryKey: ['equipment', 'list', 'maintenance'],
    queryFn: () => equipmentService.findAll({ limit: 100 }),
  })
  const equipments = equipmentRes?.data ?? []

  const [search, setSearch] = useState('')
  const [filterEquipment, setFilterEquipment] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'upcoming'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingDelete] = useState<MaintenanceLog | null>(null)

  // Form
  const [equipmentId, setEquipmentId] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [performedAt, setPerformedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [nextDueAt, setNextDueAt] = useState('')
  const [notes, setNotes] = useState('')

  // Stats
  const overdueCount = useMemo(() =>
    logs.filter((l) => l.nextDueAt && new Date(l.nextDueAt) < new Date()).length,
  [logs])

  const upcomingCount = useMemo(() => {
    const in14 = new Date(); in14.setDate(in14.getDate() + 14)
    return logs.filter((l) => l.nextDueAt && new Date(l.nextDueAt) >= new Date() && new Date(l.nextDueAt) <= in14).length
  }, [logs])

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterEquipment && l.equipmentId !== filterEquipment) return false
      if (filterStatus === 'overdue'  && !(l.nextDueAt && new Date(l.nextDueAt) < new Date())) return false
      if (filterStatus === 'upcoming') {
        const in14 = new Date(); in14.setDate(in14.getDate() + 14)
        if (!(l.nextDueAt && new Date(l.nextDueAt) >= new Date() && new Date(l.nextDueAt) <= in14)) return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        return (
          l.description.toLowerCase().includes(q) ||
          (l.equipment?.name ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [logs, search, filterEquipment, filterStatus])

  const resetForm = () => {
    setEquipmentId(''); setDescription(''); setCost('')
    setPerformedAt(new Date().toISOString().slice(0, 10)); setNextDueAt(''); setNotes('')
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const save = useMutation({
    mutationFn: () => maintenanceService.create(equipmentId, {
      description: description.trim(),
      cost: cost ? Number(cost) : undefined,
      performedAt,
      nextDueAt: nextDueAt || undefined,
      notes: notes.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Manutenção registrada')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao registrar manutenção')),
  })

  const canSubmit = !!equipmentId && !!description.trim() && !!performedAt

  return (
    <div className="px-8 py-6 space-y-5">

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de registros', value: String(logs.length), color: NEX.textDim, action: () => setFilterStatus('all') },
          { label: 'Manutenções vencidas', value: String(overdueCount), color: overdueCount > 0 ? NEX.red : NEX.textDim, action: () => setFilterStatus('overdue') },
          { label: 'Vencem em 14 dias', value: String(upcomingCount), color: upcomingCount > 0 ? NEX.amber : NEX.textDim, action: () => setFilterStatus('upcoming') },
        ].map(({ label, value, color, action }) => (
          <button key={label} onClick={action} className="rounded-xl px-4 py-3 text-left transition-opacity hover:opacity-80"
            style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
            <div className="text-[10.5px] uppercase tracking-wider mb-1" style={{ color: NEX.textMute }}>{label}</div>
            <div className="text-[24px] font-semibold" style={{ color }}>{value}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 h-9 px-3 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
            <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar manutenção..." className="bg-transparent text-[12.5px] focus:outline-none w-44" style={{ color: NEX.text }} />
            {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
          </div>

          <select value={filterEquipment} onChange={(e) => setFilterEquipment(e.target.value)} className="h-9 px-3 text-[12.5px] rounded-md focus:outline-none" style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, color: filterEquipment ? NEX.text : NEX.textMute }}>
            <option value="">Todos os equipamentos</option>
            {equipments.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
          </select>

          <div className="flex items-center gap-1 p-1 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'overdue', label: 'Vencidos' },
              { id: 'upcoming', label: 'Próximos' },
            ].map((t) => (
              <button key={t.id} onClick={() => setFilterStatus(t.id as typeof filterStatus)}
                className="px-3 py-1 rounded text-[12px] font-medium"
                style={{ background: filterStatus === t.id ? NEX.cyanDim : 'transparent', color: filterStatus === t.id ? NEX.cyan : NEX.textDim }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Registrar manutenção</Btn>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Equipamento', 'Descrição', 'Realizada em', 'Custo', 'Próxima', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                  <Icon d={Icons.clock} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p className="text-[13px]">
                    {search || filterEquipment || filterStatus !== 'all'
                      ? 'Nenhum resultado para os filtros aplicados.'
                      : 'Nenhuma manutenção registrada.'}
                  </p>
                  {filterStatus === 'all' && !search && !filterEquipment && (
                    <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>Registrar primeira manutenção</Btn>
                  )}
                </div>
              </td></tr>
            )}
            {filtered.map((log) => {
              const tone = dueTone(log.nextDueAt)
              const label = dueLabel(log.nextDueAt)
              return (
                <tr key={log.id} className="group" style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: NEX.text }}>{log.equipment?.name ?? '—'}</div>
                    {log.equipment?.model && <div className="text-[11px]" style={{ color: NEX.textDim }}>{log.equipment.model}</div>}
                  </td>
                  <td className="px-2 max-w-[240px]">
                    <div className="text-[12.5px] truncate">{log.description}</div>
                    {log.notes && <div className="text-[11px] truncate" style={{ color: NEX.textDim }}>{log.notes}</div>}
                  </td>
                  <td className="px-2 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>
                    {new Date(log.performedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-2 text-[11.5px]" style={{ color: log.cost ? NEX.text : NEX.textMute }}>
                    {log.cost ? <Money value={Number(log.cost)} /> : '—'}
                  </td>
                  <td className="px-2">
                    {label && tone ? (
                      <Pill tone={tone}>{label}</Pill>
                    ) : (
                      <span style={{ color: NEX.textMute }} className="text-[11.5px]">—</span>
                    )}
                  </td>
                  <td className="px-4 text-right">
                    {/* Logs são imutáveis por design — só leitura */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[11px]" style={{ color: NEX.textMute }}>registrado</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Registrar manutenção">
        <div className="space-y-4">
          <Field label="Equipamento *">
            <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} className={inputCls} autoFocus>
              <option value="">Selecione…</option>
              {equipments.map((eq) => <option key={eq.id} value={eq.id}>{eq.name} — {eq.model}</option>)}
            </select>
          </Field>

          <Field label="Descrição *">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-[72px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" placeholder="Ex.: Troca de bico + limpeza do extrusor" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Realizada em *">
              <input type="date" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Custo (R$)">
              <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputCls + ' text-right tabular-nums'} placeholder="0,00" />
            </Field>
          </div>

          <Field label="Próxima manutenção prevista">
            <input type="date" value={nextDueAt} onChange={(e) => setNextDueAt(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[60px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" />
          </Field>

          <div className="rounded-lg px-3 py-2.5 text-[11.5px]" style={{ background: nexAlpha('cyan', 0.06), border: `1px solid ${nexAlpha('cyan', 0.20)}`, color: NEX.textDim }}>
            Registros de manutenção são imutáveis após criação para garantir rastreabilidade histórica.
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Btn kind="primary" size="md" icon={Icons.plus} className="w-full justify-center" disabled={!canSubmit || save.isPending} onClick={() => { if (canSubmit) save.mutate() }}>
              Registrar manutenção
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>Cancelar</Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!pendingDelete} onOpenChange={() => {}} title="" description="" onConfirm={() => {}} />
    </div>
  )
}
