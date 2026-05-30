import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { printFailuresService, equipmentService, materialsService, productsService } from '@/services/entities.service'
import type { PrintFailure, FailureCategory, FailureSeverity } from '@/types/api.types'

// ── Labels ────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<FailureCategory, string> = {
  ADHESION:        'Adesão',
  CLOG:            'Entupimento',
  LAYER_SHIFT:     'Deslocamento de camada',
  STRINGING:       'Stringing',
  WARPING:         'Warping',
  SPAGHETTI:       'Espaguete',
  UNDER_EXTRUSION: 'Sub-extrusão',
  OVER_EXTRUSION:  'Super-extrusão',
  FILAMENT_BREAK:  'Quebra de filamento',
  FILAMENT_TANGLE: 'Emaranhamento',
  POWER_LOSS:      'Queda de energia',
  MECHANICAL:      'Mecânico',
  THERMAL:         'Térmico',
  SUPPORT_FAIL:    'Falha de suporte',
  DIMENSIONAL:     'Dimensional',
  COSMETIC:        'Cosmético',
  OPERATOR_ERROR:  'Erro do operador',
  SOFTWARE:        'Software',
  OTHER:           'Outro',
}

const SEVERITY_TONE: Record<FailureSeverity, 'red' | 'amber' | 'default'> = {
  TOTAL:    'red',
  PARTIAL:  'amber',
  COSMETIC: 'default',
}

const SEVERITY_LABELS: Record<FailureSeverity, string> = {
  TOTAL:    'Total',
  PARTIAL:  'Parcial',
  COSMETIC: 'Cosmético',
}

const inputCls = 'w-full h-9 px-3 bg-transparent text-[13px] focus:outline-none'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>{label}</span>
      <div style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6, color: NEX.text }}>
        {children}
      </div>
    </label>
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
function getApiMessage(err: unknown, fallback: string) {
  const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  if (Array.isArray(m)) return m[0] ?? fallback
  return m ?? fallback
}

export function PrintFailuresPage() {
  const queryClient = useQueryClient()

  const { data: failuresRes } = useQuery({
    queryKey: ['print-failures', 'list'],
    queryFn: () => printFailuresService.findAll({ limit: 200 }),
  })
  const failures: PrintFailure[] = failuresRes?.data ?? []

  const { data: analyticsData } = useQuery({
    queryKey: ['print-failures', 'analytics'],
    queryFn: () => printFailuresService.getAnalytics(),
  })

  const { data: equipmentRes } = useQuery({
    queryKey: ['equipment', 'list', 'failures'],
    queryFn: () => equipmentService.findAll({ limit: 100 }),
  })
  const equipments = equipmentRes?.data ?? []

  const { data: materialsRes } = useQuery({
    queryKey: ['materials', 'list', 'failures'],
    queryFn: () => materialsService.findAll({ limit: 200 }),
  })
  const materials = materialsRes?.data ?? []

  const { data: productsRes } = useQuery({
    queryKey: ['products', 'list', 'failures'],
    queryFn: () => productsService.findAll({ limit: 200 }),
  })
  const products = productsRes?.data ?? []

  // Filters
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterEquipment, setFilterEquipment] = useState('')

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PrintFailure | null>(null)

  // Form
  const [equipmentId, setEquipmentId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [productId, setProductId] = useState('')
  const [failureCategory, setFailureCategory] = useState<FailureCategory>('OTHER')
  const [failureSeverity, setFailureSeverity] = useState<FailureSeverity>('PARTIAL')
  const [materialWastedG, setMaterialWastedG] = useState('0')
  const [timeWastedMinutes, setTimeWastedMinutes] = useState('0')
  const [reprintRequired, setReprintRequired] = useState(false)
  const [detectedAtPercent, setDetectedAtPercent] = useState('')
  const [ambientTempC, setAmbientTempC] = useState('')
  const [humidityPercent, setHumidityPercent] = useState('')
  const [nozzleHours, setNozzleHours] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [notes, setNotes] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16))

  const filtered = useMemo(() => {
    return failures.filter((f) => {
      if (filterCategory && f.failureCategory !== filterCategory) return false
      if (filterSeverity && f.failureSeverity !== filterSeverity) return false
      if (filterEquipment && f.equipmentId !== filterEquipment) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        return (
          CATEGORY_LABELS[f.failureCategory].toLowerCase().includes(q) ||
          (f.equipment?.name ?? '').toLowerCase().includes(q) ||
          (f.product?.name ?? '').toLowerCase().includes(q) ||
          (f.rootCause ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [failures, search, filterCategory, filterSeverity, filterEquipment])

  const resetForm = () => {
    setEditingId(null); setEquipmentId(''); setMaterialId(''); setProductId('')
    setFailureCategory('OTHER'); setFailureSeverity('PARTIAL')
    setMaterialWastedG('0'); setTimeWastedMinutes('0'); setReprintRequired(false)
    setDetectedAtPercent(''); setAmbientTempC(''); setHumidityPercent('')
    setNozzleHours(''); setRootCause(''); setCorrectiveAction(''); setNotes('')
    setOccurredAt(new Date().toISOString().slice(0, 16))
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (f: PrintFailure) => {
    setEditingId(f.id); setEquipmentId(f.equipmentId); setMaterialId(f.materialId ?? '')
    setProductId(f.productId ?? ''); setFailureCategory(f.failureCategory)
    setFailureSeverity(f.failureSeverity); setMaterialWastedG(String(f.materialWastedG))
    setTimeWastedMinutes(String(f.timeWastedMinutes)); setReprintRequired(f.reprintRequired)
    setDetectedAtPercent(f.detectedAtPercent != null ? String(f.detectedAtPercent) : '')
    setAmbientTempC(f.ambientTempC != null ? String(f.ambientTempC) : '')
    setHumidityPercent(f.humidityPercent != null ? String(f.humidityPercent) : '')
    setNozzleHours(f.nozzleHours != null ? String(f.nozzleHours) : '')
    setRootCause(f.rootCause ?? ''); setCorrectiveAction(f.correctiveAction ?? '')
    setNotes(f.notes ?? ''); setOccurredAt(f.occurredAt.slice(0, 16))
    setDrawerOpen(true)
  }

  const buildPayload = () => ({
    equipmentId,
    materialId: materialId || undefined,
    productId: productId || undefined,
    failureCategory,
    failureSeverity,
    materialWastedG: Math.max(0, Number(materialWastedG) || 0),
    timeWastedMinutes: Math.max(0, Number(timeWastedMinutes) || 0),
    reprintRequired,
    detectedAtPercent: detectedAtPercent ? Math.max(0, Math.min(100, Number(detectedAtPercent))) : undefined,
    ambientTempC: ambientTempC ? Number(ambientTempC) : undefined,
    humidityPercent: humidityPercent ? Number(humidityPercent) : undefined,
    nozzleHours: nozzleHours ? Number(nozzleHours) : undefined,
    rootCause: rootCause.trim() || undefined,
    correctiveAction: correctiveAction.trim() || undefined,
    notes: notes.trim() || undefined,
    occurredAt: new Date(occurredAt).toISOString(),
  })

  const save = useMutation({
    mutationFn: (p: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      p.id ? printFailuresService.update(p.id, p.data) : printFailuresService.create(p.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Falha atualizada' : 'Falha registrada')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['print-failures'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar registro')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => printFailuresService.remove(id),
    onSuccess: () => {
      toast.success('Registro removido')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['print-failures'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover')),
  })

  const canSubmit = !!equipmentId

  const analytics = analyticsData

  return (
    <div className="px-8 py-6 space-y-5">

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total de falhas', value: String(analytics.totalCount), color: NEX.textDim },
            { label: 'Material desperdiçado', value: `${analytics.totalMaterialWastedG.toFixed(0)} g`, color: NEX.amber },
            { label: 'Tempo perdido', value: `${Math.round(analytics.totalTimeWastedMinutes / 60)} h`, color: NEX.red },
            { label: 'Categoria mais comum', value: analytics.byCategory[0] ? CATEGORY_LABELS[analytics.byCategory[0].category] : '—', color: NEX.cyan },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl px-4 py-3" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
              <div className="text-[10.5px] uppercase tracking-wider mb-1" style={{ color: NEX.textMute }}>{label}</div>
              <div className="text-[20px] font-semibold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 h-9 px-3 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
            <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar falha..." className="bg-transparent text-[12.5px] focus:outline-none w-40" style={{ color: NEX.text }} />
            {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
          </div>

          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-9 px-3 text-[12.5px] rounded-md focus:outline-none" style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, color: filterCategory ? NEX.text : NEX.textMute }}>
            <option value="">Todas as categorias</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="h-9 px-3 text-[12.5px] rounded-md focus:outline-none" style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, color: filterSeverity ? NEX.text : NEX.textMute }}>
            <option value="">Toda severidade</option>
            {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={filterEquipment} onChange={(e) => setFilterEquipment(e.target.value)} className="h-9 px-3 text-[12.5px] rounded-md focus:outline-none" style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, color: filterEquipment ? NEX.text : NEX.textMute }}>
            <option value="">Todos os equipamentos</option>
            {equipments.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Registrar falha</Btn>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Data', 'Equipamento', 'Categoria', 'Severidade', 'Material perdido', 'Tempo perdido', 'Reimpressão', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8}>
                <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                  <Icon d={Icons.alert} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p className="text-[13px]">{search || filterCategory || filterSeverity || filterEquipment ? 'Nenhum resultado para os filtros aplicados.' : 'Nenhuma falha registrada.'}</p>
                  {!search && !filterCategory && !filterSeverity && !filterEquipment && (
                    <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>Registrar primeira falha</Btn>
                  )}
                </div>
              </td></tr>
            )}
            {filtered.map((f) => (
              <tr key={f.id} className="group" style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>
                  {new Date(f.occurredAt).toLocaleDateString('pt-BR')}
                  <div style={{ color: NEX.textMute }}>{new Date(f.occurredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="px-2">
                  <div className="font-medium" style={{ color: NEX.text }}>{f.equipment?.name ?? '—'}</div>
                  {f.product && <div className="text-[11px]" style={{ color: NEX.textDim }}>{f.product.name}</div>}
                </td>
                <td className="px-2">
                  <span className="text-[12px]">{CATEGORY_LABELS[f.failureCategory]}</span>
                </td>
                <td className="px-2">
                  <Pill tone={SEVERITY_TONE[f.failureSeverity]}>{SEVERITY_LABELS[f.failureSeverity]}</Pill>
                </td>
                <td className="px-2 text-[11.5px] font-mono" style={{ color: Number(f.materialWastedG) > 0 ? NEX.amber : NEX.textMute }}>
                  {Number(f.materialWastedG).toFixed(1)} g
                </td>
                <td className="px-2 text-[11.5px] font-mono" style={{ color: Number(f.timeWastedMinutes) > 0 ? NEX.red : NEX.textMute }}>
                  {f.timeWastedMinutes} min
                </td>
                <td className="px-2">
                  <Pill tone={f.reprintRequired ? 'amber' : 'default'}>{f.reprintRequired ? 'Sim' : 'Não'}</Pill>
                </td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(f)}><Icon d={Icons.edit} size={12} /></ActionBtn>
                    <ActionBtn color={NEX.red} title="Excluir" onClick={() => setPendingDelete(f)}><Icon d={Icons.trash} size={12} /></ActionBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Editar falha' : 'Registrar falha de impressão'} width={480}>
        <div className="space-y-5">
          <Section label="Contexto">
            <Field label="Equipamento *">
              <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} className={inputCls} autoFocus>
                <option value="">Selecione…</option>
                {equipments.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Produto">
                <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
                  <option value="">Opcional</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Material">
                <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={inputCls}>
                  <option value="">Opcional</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.filamentType?.name ?? 'Sem tipo'} — {m.brand?.name ?? 'Sem marca'}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Data e hora da falha *">
              <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className={inputCls} />
            </Field>
          </Section>

          <Section label="Classificação">
            <Field label="Categoria *">
              <select value={failureCategory} onChange={(e) => setFailureCategory(e.target.value as FailureCategory)} className={inputCls}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Severidade *">
                <select value={failureSeverity} onChange={(e) => setFailureSeverity(e.target.value as FailureSeverity)} className={inputCls}>
                  <option value="TOTAL">Total</option>
                  <option value="PARTIAL">Parcial</option>
                  <option value="COSMETIC">Cosmético</option>
                </select>
              </Field>
              <Field label="Detectado em (%)">
                <input type="number" min={0} max={100} value={detectedAtPercent} onChange={(e) => setDetectedAtPercent(e.target.value)} className={inputCls + ' text-right tabular-nums'} placeholder="ex: 35" />
              </Field>
            </div>
          </Section>

          <Section label="Impacto">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Material desperdiçado (g)">
                <input type="number" min={0} step="0.1" value={materialWastedG} onChange={(e) => setMaterialWastedG(e.target.value)} className={inputCls + ' text-right tabular-nums'} />
              </Field>
              <Field label="Tempo perdido (min)">
                <input type="number" min={0} value={timeWastedMinutes} onChange={(e) => setTimeWastedMinutes(e.target.value)} className={inputCls + ' text-right tabular-nums'} />
              </Field>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none" style={{ padding: '10px 12px', borderRadius: 8, background: reprintRequired ? nexAlpha('amber', 0.08) : NEX.surface2, border: `1px solid ${reprintRequired ? nexAlpha('amber', 0.25) : NEX.border}`, transition: 'all 0.15s' }}>
              <input type="checkbox" checked={reprintRequired} onChange={(e) => setReprintRequired(e.target.checked)} style={{ accentColor: NEX.amber, width: 15, height: 15 }} />
              <div>
                <div className="text-[12.5px] font-medium" style={{ color: reprintRequired ? NEX.amber : NEX.text }}>Reimpressão necessária</div>
                <div className="text-[11px]" style={{ color: NEX.textMute }}>Job será reprocessado</div>
              </div>
            </label>
          </Section>

          <Section label="Ambiente e equipamento">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Temp. ambiente (°C)"><input type="number" step="0.1" value={ambientTempC} onChange={(e) => setAmbientTempC(e.target.value)} className={inputCls + ' text-right tabular-nums'} /></Field>
              <Field label="Umidade (%)"><input type="number" min={0} max={100} value={humidityPercent} onChange={(e) => setHumidityPercent(e.target.value)} className={inputCls + ' text-right tabular-nums'} /></Field>
              <Field label="Horas do bico"><input type="number" min={0} step="0.1" value={nozzleHours} onChange={(e) => setNozzleHours(e.target.value)} className={inputCls + ' text-right tabular-nums'} /></Field>
            </div>
          </Section>

          <Section label="Análise">
            <Field label="Causa raiz">
              <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} className="w-full min-h-[60px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" placeholder="O que causou a falha?" />
            </Field>
            <Field label="Ação corretiva">
              <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} className="w-full min-h-[60px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" placeholder="O que foi feito para corrigir?" />
            </Field>
            <Field label="Observações">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[50px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" />
            </Field>
          </Section>

          <div className="flex flex-col gap-2 pt-1">
            <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className="w-full justify-center" disabled={!canSubmit || save.isPending}
              onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}>
              {editingId ? 'Salvar alterações' : 'Registrar falha'}
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>Cancelar</Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null) }}
        title="Excluir registro de falha?"
        description={pendingDelete ? `Remove o registro de ${CATEGORY_LABELS[pendingDelete.failureCategory]} em ${pendingDelete.equipment?.name ?? 'equipamento'}.` : ''}
        confirmLabel="Excluir" variant="danger" loading={remove.isPending}
        onConfirm={() => { if (pendingDelete) remove.mutate(pendingDelete.id) }} />
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
