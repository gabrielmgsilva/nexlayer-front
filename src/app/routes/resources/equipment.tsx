import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Bar, Icons, Money, NEX, EQUIPMENT_STATUS, Btn } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { equipmentService } from '@/services/entities.service'
import type { Equipment } from '@/types/api.types'
import { ResourceField, resourceInputCls, getApiMessage } from './_shared'

export function EquipmentPage() {
  const [searchParams] = useSearchParams()
  const focusEquipmentId = searchParams.get('equipmentId') ?? undefined

  const queryClient = useQueryClient()
  const { data: res } = useQuery({
    queryKey: ['equipment', 'list', 'full'],
    queryFn: () => equipmentService.findAll({ limit: 100 }),
  })
  const list: Equipment[] = res?.data ?? []

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

  const parseOptionalInt = (value: string) => {
    if (!value.trim()) return undefined
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return undefined
    return Math.trunc(parsed)
  }

  const resetForm = () => {
    setEditingId(null); setName(''); setModel(''); setSerialNumber('')
    setPurchasePrice(3000); setPurchaseDate(new Date().toISOString().slice(0, 10))
    setEstimatedLifespanHours('6000'); setRatedPowerWatts('350'); setAvgPowerWatts('120')
    setAnnualMaintenanceCost(300); setAnnualUsageHours('1500')
    setBuildVolumeX(''); setBuildVolumeY(''); setBuildVolumeZ(''); setMaxSpeedMmS('')
    setStatus('AVAILABLE'); setNotes('')
  }

  const startEdit = (equipment: Equipment) => {
    setEditingId(equipment.id); setName(equipment.name ?? ''); setModel(equipment.model ?? '')
    setSerialNumber(equipment.serialNumber ?? '')
    setPurchasePrice(Number(equipment.purchasePrice) || 0)
    setPurchaseDate(equipment.purchaseDate ? equipment.purchaseDate.slice(0, 10) : new Date().toISOString().slice(0, 10))
    setEstimatedLifespanHours(String(Number(equipment.estimatedLifespanHours) || 6000))
    setRatedPowerWatts(String(Number(equipment.ratedPowerWatts) || 350))
    setAvgPowerWatts(String(Number(equipment.avgPowerWatts) || 120))
    setAnnualMaintenanceCost(Number(equipment.annualMaintenanceCost) || 0)
    setAnnualUsageHours(String(Number(equipment.annualUsageHours) || 1500))
    setBuildVolumeX(equipment.buildVolumeX != null ? String(equipment.buildVolumeX) : '')
    setBuildVolumeY(equipment.buildVolumeY != null ? String(equipment.buildVolumeY) : '')
    setBuildVolumeZ(equipment.buildVolumeZ != null ? String(equipment.buildVolumeZ) : '')
    setMaxSpeedMmS(equipment.maxSpeedMmS != null ? String(equipment.maxSpeedMmS) : '')
    setStatus(equipment.status); setNotes(equipment.notes ?? '')
  }

  useEffect(() => {
    if (!focusEquipmentId || list.length === 0 || editingId === focusEquipmentId) return
    const target = list.find((item) => item.id === focusEquipmentId)
    if (target) startEdit(target)
  }, [focusEquipmentId, list, editingId])

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name: name.trim(), model: model.trim(),
      serialNumber: serialNumber.trim() || undefined,
      purchasePrice: Math.max(0, purchasePrice || 0), purchaseDate,
      estimatedLifespanHours: Math.max(1, Number(estimatedLifespanHours) || 1),
      ratedPowerWatts: Math.max(1, Number(ratedPowerWatts) || 1),
      avgPowerWatts: Math.max(1, Number(avgPowerWatts) || 1),
      status,
      annualMaintenanceCost: Math.max(0, annualMaintenanceCost || 0),
      annualUsageHours: Math.max(1, Number(annualUsageHours) || 1),
      notes: notes.trim() || undefined,
    }
    const vx = parseOptionalInt(buildVolumeX); if (vx !== undefined) payload.buildVolumeX = Math.max(vx, 1)
    const vy = parseOptionalInt(buildVolumeY); if (vy !== undefined) payload.buildVolumeY = Math.max(vy, 1)
    const vz = parseOptionalInt(buildVolumeZ); if (vz !== undefined) payload.buildVolumeZ = Math.max(vz, 1)
    const sp = parseOptionalInt(maxSpeedMmS);  if (sp !== undefined) payload.maxSpeedMmS  = Math.max(sp, 1)
    return payload
  }

  const save = useMutation({
    mutationFn: (p: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      p.id
        ? equipmentService.update(p.id, p.data as Parameters<typeof equipmentService.update>[1])
        : equipmentService.create(p.data as Parameters<typeof equipmentService.create>[0]),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Equipamento atualizado' : 'Equipamento criado')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar equipamento')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => equipmentService.remove(id),
    onSuccess: () => {
      toast.success('Equipamento removido')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover equipamento')),
  })

  const canSubmit = !!name.trim() && !!model.trim() && !!purchaseDate

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Equipamentos</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>Cadastro e gestão operacional das impressoras.</div>
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
              {['Equipamento', 'Status', 'Vida útil', 'Potência média', 'Manutenção anual', ''].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: NEX.textDim }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>Nenhum equipamento cadastrado.</td></tr>
            )}
            {list.map((equipment) => {
              const lifePct = (equipment.estimatedLifespanHours ?? 0) > 0
                ? Math.min(100, (Number(equipment.totalPrintHours) / Number(equipment.estimatedLifespanHours)) * 100)
                : 0
              const tone = lifePct >= 95 ? 'red' : lifePct >= 85 ? 'amber' : lifePct >= 70 ? 'cyan' : 'green'
              const statusInfo = EQUIPMENT_STATUS[equipment.status] ?? EQUIPMENT_STATUS.AVAILABLE
              return (
                <tr key={equipment.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{equipment.name}</div>
                    <div className="text-[11px]" style={{ color: NEX.textDim }}>{equipment.brand?.name ?? '—'} · {equipment.model ?? 'sem modelo'}</div>
                  </td>
                  <td className="px-2"><Pill tone={statusInfo.tone} dot={equipment.status === 'PRINTING'}>{statusInfo.label}</Pill></td>
                  <td className="px-2">
                    <div className="w-28">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span style={{ color: NEX.textDim }}>{lifePct.toFixed(0)}%</span>
                      </div>
                      <Bar value={lifePct} tone={tone} height={3} />
                    </div>
                  </td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{Number(equipment.avgPowerWatts)}W</td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}><Money value={Number(equipment.annualMaintenanceCost)} /></td>
                  <td className="px-4 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button onClick={() => startEdit(equipment)} className="text-[11px]" style={{ color: NEX.cyan }}>Alterar</button>
                      <button onClick={() => setPendingDelete(equipment)} className="text-[11px]" style={{ color: NEX.red }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="text-[13px] font-semibold mb-3">{editingId ? 'Alterar equipamento' : 'Novo equipamento'}</div>
        <div className="space-y-3">
          <ResourceField label="Nome *"><input value={name} onChange={(e) => setName(e.target.value)} className={resourceInputCls} placeholder="Ex.: Creality K1" /></ResourceField>
          <ResourceField label="Modelo *"><input value={model} onChange={(e) => setModel(e.target.value)} className={resourceInputCls} placeholder="Ex.: K1 Max" /></ResourceField>
          <ResourceField label="Número de série"><input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={resourceInputCls} /></ResourceField>
          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Compra (R$) *"><DecimalRtlInput value={purchasePrice} onValueChange={setPurchasePrice} min={0} className={resourceInputCls + ' tabular-nums'} /></ResourceField>
            <ResourceField label="Data da compra *"><input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={resourceInputCls} /></ResourceField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Vida útil (h) *"><input type="number" min={1} step="1" value={estimatedLifespanHours} onChange={(e) => setEstimatedLifespanHours(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            <ResourceField label="Uso anual (h) *"><input type="number" min={1} step="1" value={annualUsageHours} onChange={(e) => setAnnualUsageHours(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Potência nominal (W) *"><input type="number" min={1} step="1" value={ratedPowerWatts} onChange={(e) => setRatedPowerWatts(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            <ResourceField label="Potência média (W) *"><input type="number" min={1} step="1" value={avgPowerWatts} onChange={(e) => setAvgPowerWatts(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Volume X (mm)"><input type="number" min={1} step="1" value={buildVolumeX} onChange={(e) => setBuildVolumeX(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            <ResourceField label="Volume Y (mm)"><input type="number" min={1} step="1" value={buildVolumeY} onChange={(e) => setBuildVolumeY(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Volume Z (mm)"><input type="number" min={1} step="1" value={buildVolumeZ} onChange={(e) => setBuildVolumeZ(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            <ResourceField label="Velocidade máx. (mm/s)"><input type="number" min={1} step="1" value={maxSpeedMmS} onChange={(e) => setMaxSpeedMmS(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
          </div>
          <ResourceField label="Observações"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[68px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" /></ResourceField>
          <div className="flex gap-2">
            {editingId && <Btn kind="ghost" size="md" className="flex-1 justify-center" onClick={resetForm}>Cancelar alteração</Btn>}
            <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className={(editingId ? 'flex-1' : 'w-full') + ' justify-center'} disabled={!canSubmit || save.isPending} onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}>
              {editingId ? 'Salvar alterações' : 'Criar equipamento'}
            </Btn>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
        title="Excluir equipamento?"
        description={pendingDelete ? `Esta ação removerá permanentemente o equipamento "${pendingDelete.name}".` : 'Esta ação removerá permanentemente o equipamento selecionado.'}
        confirmLabel="Excluir" variant="danger" loading={remove.isPending}
        onConfirm={() => { if (!pendingDelete) return; remove.mutate(pendingDelete.id) }}
      />
    </div>
  )
}
