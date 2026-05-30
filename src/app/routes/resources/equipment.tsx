import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Bar, Icons, Icon, Money, NEX, EQUIPMENT_STATUS, Btn, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { equipmentService } from '@/services/entities.service'
import type { Equipment } from '@/types/api.types'
import { ResourceField, resourceInputCls, getApiMessage } from './_shared'

export function EquipmentPage() {
  const [searchParams] = useSearchParams()
  const focusEquipmentId = searchParams.get('equipmentId') ?? undefined

  const queryClient = useQueryClient()
  const { data: res } = useQuery({ queryKey: ['equipment', 'list', 'full'], queryFn: () => equipmentService.findAll({ limit: 100 }) })
  const list: Equipment[] = res?.data ?? []

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Equipment | null>(null)

  const [name, setName] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [purchasePrice, setPurchasePrice] = useState(3000)
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [estimatedLifespanHours, setEstimatedLifespanHours] = useState('6000')
  const [ratedPowerWatts, setRatedPowerWatts] = useState('350')
  const [avgPowerWatts, setAvgPowerWatts] = useState('120')
  const [annualMaintenanceCost, setAnnualMaintenanceCost] = useState(300)
  const [annualUsageHours, setAnnualUsageHours] = useState('1500')
  const [buildVolumeX, setBuildVolumeX] = useState('')
  const [buildVolumeY, setBuildVolumeY] = useState('')
  const [buildVolumeZ, setBuildVolumeZ] = useState('')
  const [maxSpeedMmS, setMaxSpeedMmS] = useState('')
  const [status, setStatus] = useState<Equipment['status']>('AVAILABLE')
  const [notes, setNotes] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((e) => e.name.toLowerCase().includes(q) || (e.model ?? '').toLowerCase().includes(q) || (e.brand?.name ?? '').toLowerCase().includes(q))
  }, [list, search])

  const parseOptionalInt = (v: string) => { if (!v.trim()) return undefined; const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : undefined }

  const resetForm = () => {
    setEditingId(null); setName(''); setModel(''); setSerialNumber('')
    setPurchasePrice(3000); setPurchaseDate(new Date().toISOString().slice(0, 10))
    setEstimatedLifespanHours('6000'); setRatedPowerWatts('350'); setAvgPowerWatts('120')
    setAnnualMaintenanceCost(300); setAnnualUsageHours('1500')
    setBuildVolumeX(''); setBuildVolumeY(''); setBuildVolumeZ(''); setMaxSpeedMmS('')
    setStatus('AVAILABLE'); setNotes('')
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (eq: Equipment) => {
    setEditingId(eq.id); setName(eq.name ?? ''); setModel(eq.model ?? '')
    setSerialNumber(eq.serialNumber ?? ''); setPurchasePrice(Number(eq.purchasePrice) || 0)
    setPurchaseDate(eq.purchaseDate ? eq.purchaseDate.slice(0, 10) : new Date().toISOString().slice(0, 10))
    setEstimatedLifespanHours(String(Number(eq.estimatedLifespanHours) || 6000))
    setRatedPowerWatts(String(Number(eq.ratedPowerWatts) || 350))
    setAvgPowerWatts(String(Number(eq.avgPowerWatts) || 120))
    setAnnualMaintenanceCost(Number(eq.annualMaintenanceCost) || 0)
    setAnnualUsageHours(String(Number(eq.annualUsageHours) || 1500))
    setBuildVolumeX(eq.buildVolumeX != null ? String(eq.buildVolumeX) : '')
    setBuildVolumeY(eq.buildVolumeY != null ? String(eq.buildVolumeY) : '')
    setBuildVolumeZ(eq.buildVolumeZ != null ? String(eq.buildVolumeZ) : '')
    setMaxSpeedMmS(eq.maxSpeedMmS != null ? String(eq.maxSpeedMmS) : '')
    setStatus(eq.status); setNotes(eq.notes ?? '')
    setDrawerOpen(true)
  }

  useEffect(() => {
    if (!focusEquipmentId || list.length === 0 || editingId === focusEquipmentId) return
    const target = list.find((e) => e.id === focusEquipmentId)
    if (target) openEdit(target)
  }, [focusEquipmentId, list, editingId])

  const buildPayload = () => {
    const p: Record<string, unknown> = {
      name: name.trim(), model: model.trim(), serialNumber: serialNumber.trim() || undefined,
      purchasePrice: Math.max(0, purchasePrice || 0), purchaseDate,
      estimatedLifespanHours: Math.max(1, Number(estimatedLifespanHours) || 1),
      ratedPowerWatts: Math.max(1, Number(ratedPowerWatts) || 1),
      avgPowerWatts: Math.max(1, Number(avgPowerWatts) || 1),
      status, annualMaintenanceCost: Math.max(0, annualMaintenanceCost || 0),
      annualUsageHours: Math.max(1, Number(annualUsageHours) || 1),
      notes: notes.trim() || undefined,
    }
    const vx = parseOptionalInt(buildVolumeX); if (vx !== undefined) p.buildVolumeX = Math.max(vx, 1)
    const vy = parseOptionalInt(buildVolumeY); if (vy !== undefined) p.buildVolumeY = Math.max(vy, 1)
    const vz = parseOptionalInt(buildVolumeZ); if (vz !== undefined) p.buildVolumeZ = Math.max(vz, 1)
    const sp = parseOptionalInt(maxSpeedMmS); if (sp !== undefined) p.maxSpeedMmS = Math.max(sp, 1)
    return p
  }

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      payload.id
        ? equipmentService.update(payload.id, payload.data as Parameters<typeof equipmentService.update>[1])
        : equipmentService.create(payload.data as Parameters<typeof equipmentService.create>[0]),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Equipamento atualizado' : 'Equipamento criado')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar equipamento')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => equipmentService.remove(id),
    onSuccess: () => { toast.success('Equipamento removido'); setPendingDelete(null); queryClient.invalidateQueries({ queryKey: ['equipment'] }) },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover equipamento')),
  })

  const canSubmit = !!name.trim() && !!model.trim() && !!purchaseDate

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar equipamento..." className="bg-transparent flex-1 text-[12.5px] focus:outline-none" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>{filtered.length} {filtered.length === 1 ? 'equipamento' : 'equipamentos'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Novo equipamento</Btn>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Equipamento', 'Status', 'Vida útil', 'Potência média', 'Manutenção anual', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                  <Icon d={Icons.printer} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p className="text-[13px]">{search ? `Nenhum resultado para "${search}"` : 'Nenhum equipamento cadastrado.'}</p>
                  {!search && <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>Adicionar primeiro equipamento</Btn>}
                </div>
              </td></tr>
            )}
            {filtered.map((eq) => {
              const lifePct = (eq.estimatedLifespanHours ?? 0) > 0 ? Math.min(100, (Number(eq.totalPrintHours) / Number(eq.estimatedLifespanHours)) * 100) : 0
              const tone = lifePct >= 95 ? 'red' : lifePct >= 85 ? 'amber' : lifePct >= 70 ? 'cyan' : 'green'
              const statusInfo = EQUIPMENT_STATUS[eq.status] ?? EQUIPMENT_STATUS.AVAILABLE
              return (
                <tr key={eq.id} className="group" style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: NEX.text }}>{eq.name}</div>
                    <div className="text-[11px]" style={{ color: NEX.textDim }}>{eq.brand?.name ?? '—'} · {eq.model ?? 'sem modelo'}</div>
                  </td>
                  <td className="px-2"><Pill tone={statusInfo.tone} dot={eq.status === 'PRINTING'}>{statusInfo.label}</Pill></td>
                  <td className="px-2">
                    <div className="w-28">
                      <div className="flex justify-between text-[11px] mb-1"><span style={{ color: NEX.textDim }}>{lifePct.toFixed(0)}%</span></div>
                      <Bar value={lifePct} tone={tone} height={3} />
                    </div>
                  </td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{Number(eq.avgPowerWatts)}W</td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}><Money value={Number(eq.annualMaintenanceCost)} /></td>
                  <td className="px-4 text-right">
                    <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(eq)}><Icon d={Icons.edit} size={12} /></ActionBtn>
                      <ActionBtn color={NEX.red} title="Excluir" onClick={() => setPendingDelete(eq)}><Icon d={Icons.trash} size={12} /></ActionBtn>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Editar equipamento' : 'Novo equipamento'} width={460}>
        <div className="space-y-4">
          <Section label="Identificação">
            <ResourceField label="Nome *"><input value={name} onChange={(e) => setName(e.target.value)} className={resourceInputCls} placeholder="Ex.: Creality K1" autoFocus /></ResourceField>
            <ResourceField label="Modelo *"><input value={model} onChange={(e) => setModel(e.target.value)} className={resourceInputCls} placeholder="Ex.: K1 Max" /></ResourceField>
            <ResourceField label="Número de série"><input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={resourceInputCls} /></ResourceField>
          </Section>
          <Section label="Aquisição">
            <div className="grid grid-cols-2 gap-3">
              <ResourceField label="Compra (R$) *"><DecimalRtlInput value={purchasePrice} onValueChange={setPurchasePrice} min={0} className={resourceInputCls + ' tabular-nums'} /></ResourceField>
              <ResourceField label="Data da compra *"><input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={resourceInputCls} /></ResourceField>
            </div>
          </Section>
          <Section label="Operação">
            <div className="grid grid-cols-2 gap-3">
              <ResourceField label="Vida útil (h) *"><input type="number" min={1} value={estimatedLifespanHours} onChange={(e) => setEstimatedLifespanHours(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
              <ResourceField label="Uso anual (h) *"><input type="number" min={1} value={annualUsageHours} onChange={(e) => setAnnualUsageHours(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
              <ResourceField label="Potência nominal (W) *"><input type="number" min={1} value={ratedPowerWatts} onChange={(e) => setRatedPowerWatts(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
              <ResourceField label="Potência média (W) *"><input type="number" min={1} value={avgPowerWatts} onChange={(e) => setAvgPowerWatts(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
              <ResourceField label="Manutenção anual (R$) *"><DecimalRtlInput value={annualMaintenanceCost} onValueChange={setAnnualMaintenanceCost} min={0} className={resourceInputCls + ' tabular-nums'} /></ResourceField>
              <ResourceField label="Status *">
                <select value={status} onChange={(e) => setStatus(e.target.value as Equipment['status'])} className={resourceInputCls}>
                  <option value="AVAILABLE">Disponível</option>
                  <option value="PRINTING">Imprimindo</option>
                  <option value="MAINTENANCE">Manutenção</option>
                  <option value="OFFLINE">Offline</option>
                </select>
              </ResourceField>
            </div>
          </Section>
          <Section label="Volume de impressão (mm)">
            <div className="grid grid-cols-3 gap-3">
              <ResourceField label="X"><input type="number" min={1} value={buildVolumeX} onChange={(e) => setBuildVolumeX(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
              <ResourceField label="Y"><input type="number" min={1} value={buildVolumeY} onChange={(e) => setBuildVolumeY(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
              <ResourceField label="Z"><input type="number" min={1} value={buildVolumeZ} onChange={(e) => setBuildVolumeZ(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            </div>
            <ResourceField label="Velocidade máx. (mm/s)"><input type="number" min={1} value={maxSpeedMmS} onChange={(e) => setMaxSpeedMmS(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
          </Section>
          <ResourceField label="Observações"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[68px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" /></ResourceField>
          <div className="flex flex-col gap-2 pt-1">
            <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className="w-full justify-center" disabled={!canSubmit || save.isPending}
              onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}>
              {editingId ? 'Salvar alterações' : 'Criar equipamento'}
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>Cancelar</Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null) }}
        title="Excluir equipamento?" description={pendingDelete ? `Esta ação removerá permanentemente "${pendingDelete.name}".` : ''}
        confirmLabel="Excluir" variant="danger" loading={remove.isPending}
        onConfirm={() => { if (pendingDelete) remove.mutate(pendingDelete.id) }} />
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: NEX.textMute }}>{label}</div>
      {children}
    </div>
  )
}

function ActionBtn({ children, color, title, onClick, disabled }: { children: React.ReactNode; color: string; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="h-7 w-7 rounded flex items-center justify-center transition-colors disabled:opacity-30"
      style={{ color, background: 'transparent' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = nexAlpha('surface2', 1) }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
      {children}
    </button>
  )
}
