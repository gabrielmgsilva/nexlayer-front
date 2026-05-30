import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, Money, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { costConfigService } from '@/services/entities.service'
import type { CostConfig } from '@/types/api.types'
import { Field, inputCls, getApiMessage } from './_shared'

function parseOptionalNumber(value: string) {
  const n = Number(value.trim().replace(',', '.'))
  return value.trim() && Number.isFinite(n) ? n : undefined
}
function parseOptionalInt(value: string) {
  const n = parseOptionalNumber(value)
  return n !== undefined ? Math.trunc(n) : undefined
}

const FAILURE_MODE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  AUTO:   'Auto',
  HYBRID: 'Híbrido',
}

export function CostCenterPage() {
  const queryClient = useQueryClient()
  const { data: configs = [] } = useQuery({ queryKey: ['cost-configs'], queryFn: () => costConfigService.findAll() })

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingToggleConfig, setPendingToggleConfig] = useState<CostConfig | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CostConfig | null>(null)

  // Form
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [electricityCostPerKwh, setElectricityCostPerKwh] = useState(0.8)
  const [laborCostPerHour, setLaborCostPerHour] = useState(0)
  const [monthlyOverhead, setMonthlyOverhead] = useState(0)
  const [monthlyProductionHours, setMonthlyProductionHours] = useState('')
  const [failureRateMode, setFailureRateMode] = useState<CostConfig['failureRateMode']>('HYBRID')
  const [failureRatePercent, setFailureRatePercent] = useState(5)
  const [failureAutoWindowDays, setFailureAutoWindowDays] = useState('')
  const [failureAutoMinSamples, setFailureAutoMinSamples] = useState('')
  const [notes, setNotes] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return configs
    return configs.filter((c: CostConfig) =>
      c.name.toLowerCase().includes(q) || (c.equipment?.name ?? '').toLowerCase().includes(q),
    )
  }, [configs, search])

  const resetForm = () => {
    setEditingId(null); setName(''); setIsDefault(false)
    setElectricityCostPerKwh(0.8); setLaborCostPerHour(0)
    setMonthlyOverhead(0); setMonthlyProductionHours(''); setFailureRateMode('HYBRID')
    setFailureRatePercent(5); setFailureAutoWindowDays(''); setFailureAutoMinSamples(''); setNotes('')
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (config: CostConfig) => {
    setEditingId(config.id); setName(config.name); setIsDefault(config.isDefault)
    setElectricityCostPerKwh(Number(config.electricityCostPerKwh) || 0)
    setLaborCostPerHour(Number(config.laborCostPerHour) || 0)
    setMonthlyOverhead(Number(config.monthlyOverhead) || 0)
    setMonthlyProductionHours(config.monthlyProductionHours != null ? String(config.monthlyProductionHours) : '')
    setFailureRateMode(config.failureRateMode)
    setFailureRatePercent(Number(config.failureRatePercent) || 0)
    setFailureAutoWindowDays(config.failureAutoWindowDays != null ? String(config.failureAutoWindowDays) : '')
    setFailureAutoMinSamples(config.failureAutoMinSamples != null ? String(config.failureAutoMinSamples) : '')
    setNotes(config.notes ?? '')
    setDrawerOpen(true)
  }

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name: name.trim(),
      isDefault,
      electricityCostPerKwh: Math.max(0, electricityCostPerKwh || 0),
      laborCostPerHour: Math.max(0, laborCostPerHour || 0),
      monthlyOverhead: Math.max(0, monthlyOverhead || 0),
      failureRateMode,
      failureRatePercent: Number(failureRatePercent) || 0,
      notes: notes.trim() || undefined,
    }
    const nextMonthlyHours = parseOptionalInt(monthlyProductionHours)
    if (nextMonthlyHours !== undefined) payload.monthlyProductionHours = Math.max(nextMonthlyHours, 1)
    if (failureRateMode !== 'MANUAL') {
      const nextAutoWindow = parseOptionalInt(failureAutoWindowDays)
      if (nextAutoWindow !== undefined) payload.failureAutoWindowDays = Math.max(nextAutoWindow, 7)
      const nextAutoMin = parseOptionalInt(failureAutoMinSamples)
      if (nextAutoMin !== undefined) payload.failureAutoMinSamples = Math.max(nextAutoMin, 1)
    }
    return payload
  }

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      payload.id
        ? costConfigService.update(payload.id, payload.data)
        : costConfigService.create(payload.data),
    onSuccess: (_, payload) => {
      toast.success(payload.id ? 'Centro de custo atualizado' : 'Centro de custo criado')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['cost-configs'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar centro de custo')),
  })

  const setDefault = useMutation({
    mutationFn: (config: CostConfig) => costConfigService.update(config.id, { isDefault: true, isActive: true }),
    onSuccess: () => {
      toast.success('Centro de custo padrão atualizado')
      queryClient.invalidateQueries({ queryKey: ['cost-configs'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao definir padrão')),
  })

  const toggleActive = useMutation({
    mutationFn: (config: CostConfig) => costConfigService.update(config.id, { isActive: !config.isActive }),
    onSuccess: (_, config) => {
      toast.success(config.isActive ? 'Centro de custo desativado' : 'Centro de custo ativado')
      setPendingToggleConfig(null)
      queryClient.invalidateQueries({ queryKey: ['cost-configs'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => costConfigService.remove(id),
    onSuccess: () => {
      toast.success('Centro de custo removido')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['cost-configs'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover centro de custo')),
  })

  const canSubmit = !!name.trim() && failureRatePercent >= 0 && failureRatePercent <= 100

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs"
          style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
        >
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar centro de custo..."
            className="bg-transparent flex-1 text-[12.5px] focus:outline-none"
            style={{ color: NEX.text }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}>
              <Icon d={Icons.x} size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>
            {filtered.length} {filtered.length === 1 ? 'perfil' : 'perfis'}
          </span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>
            Novo centro de custo
          </Btn>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Nome', 'Energia', 'Mão de obra', 'Taxa de falha', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                    <Icon d={Icons.calc} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p className="text-[13px]">
                      {search
                        ? `Nenhum resultado para "${search}"`
                        : 'Nenhum centro de custo cadastrado.'}
                    </p>
                    {!search && (
                      <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>
                        Criar primeiro centro de custo
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((config: CostConfig) => (
              <tr
                key={config.id}
                className="group"
                style={{ borderTop: `1px solid ${NEX.border}` }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: NEX.text }}>{config.name}</span>
                    {config.isDefault && <Pill tone="cyan">Padrão</Pill>}
                  </div>
                  {config.notes && (
                    <div className="text-[11px] mt-0.5 truncate max-w-[200px]" style={{ color: NEX.textMute }}>
                      {config.notes}
                    </div>
                  )}
                </td>
                <td className="px-2 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>
                  <Money value={Number(config.electricityCostPerKwh)} />/kWh
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {config.laborCostPerHour != null && Number(config.laborCostPerHour) > 0
                    ? <><Money value={Number(config.laborCostPerHour)} />/h</>
                    : <span style={{ color: NEX.textMute }}>—</span>}
                </td>
                <td className="px-2">
                  <div className="flex items-center gap-1.5">
                    <Pill tone="default">{FAILURE_MODE_LABELS[config.failureRateMode] ?? config.failureRateMode}</Pill>
                    <span className="text-[11.5px] font-mono" style={{ color: NEX.textDim }}>
                      {Number(config.failureRatePercent).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-2">
                  <Pill tone={config.isActive ? 'green' : 'default'}>
                    {config.isActive ? 'Ativo' : 'Inativo'}
                  </Pill>
                </td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(config)}>
                      <Icon d={Icons.edit} size={12} />
                    </ActionBtn>
                    {!config.isDefault && (
                      <ActionBtn color={NEX.cyan} title="Definir como padrão" onClick={() => setDefault.mutate(config)}>
                        <Icon d={Icons.check} size={12} />
                      </ActionBtn>
                    )}
                    <ActionBtn
                      color={config.isDefault ? NEX.textMute : NEX.amber}
                      title={config.isActive ? 'Desativar' : 'Ativar'}
                      onClick={() => { if (!config.isDefault) setPendingToggleConfig(config) }}
                      disabled={config.isDefault}
                    >
                      <Icon d={config.isActive ? Icons.x : Icons.check} size={12} />
                    </ActionBtn>
                    <ActionBtn
                      color={config.isDefault ? NEX.textMute : NEX.red}
                      title="Excluir"
                      onClick={() => { if (!config.isDefault) setPendingDelete(config) }}
                      disabled={config.isDefault}
                    >
                      <Icon d={Icons.trash} size={12} />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'Editar centro de custo' : 'Novo centro de custo'}
        width={460}
      >
        <div className="space-y-4">

          {/* Identificação */}
          <Section label="Identificação">
            <Field label="Nome *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Ex.: Padrão Fábrica"
                autoFocus
              />
            </Field>
            <label
              className="flex items-center gap-3 cursor-pointer select-none"
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: isDefault ? nexAlpha('cyan', 0.10) : NEX.surface2,
                border: `1px solid ${isDefault ? nexAlpha('cyan', 0.30) : NEX.border}`,
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                style={{ accentColor: NEX.cyan, width: 15, height: 15 }}
              />
              <div>
                <div className="text-[12.5px] font-medium" style={{ color: isDefault ? NEX.cyan : NEX.text }}>
                  Centro de custo padrão
                </div>
                <div className="text-[11px]" style={{ color: NEX.textMute }}>
                  Selecionado automaticamente na calculadora
                </div>
              </div>
            </label>
          </Section>

          {/* Custos */}
          <Section label="Custos operacionais">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Energia (R$/kWh) *">
                <DecimalRtlInput value={electricityCostPerKwh} onValueChange={setElectricityCostPerKwh} className={inputCls + ' text-right tabular-nums'} />
              </Field>
              <Field label="Mão de obra (R$/h)">
                <DecimalRtlInput value={laborCostPerHour} onValueChange={setLaborCostPerHour} className={inputCls + ' text-right tabular-nums'} />
              </Field>
              <Field label="Overhead mensal (R$)">
                <DecimalRtlInput value={monthlyOverhead} onValueChange={setMonthlyOverhead} className={inputCls + ' text-right tabular-nums'} />
              </Field>
              <Field label="Horas produção/mês">
                <input type="number" min={1} step="1" value={monthlyProductionHours} onChange={(e) => setMonthlyProductionHours(e.target.value)} className={inputCls + ' text-right tabular-nums'} />
              </Field>
            </div>
          </Section>

          {/* Taxa de falha */}
          <Section label="Taxa de falha">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Modo">
                <select value={failureRateMode} onChange={(e) => setFailureRateMode(e.target.value as CostConfig['failureRateMode'])} className={inputCls}>
                  <option value="MANUAL">Manual</option>
                  <option value="AUTO">Auto</option>
                  <option value="HYBRID">Híbrido</option>
                </select>
              </Field>
              <Field label="Taxa manual (%) *">
                <DecimalRtlInput value={failureRatePercent} onValueChange={setFailureRatePercent} max={100} suffix="%" className={inputCls + ' text-right tabular-nums'} />
              </Field>
            </div>
            {failureRateMode !== 'MANUAL' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Janela AUTO (dias)">
                  <input type="number" min={7} step="1" value={failureAutoWindowDays} onChange={(e) => setFailureAutoWindowDays(e.target.value)} className={inputCls + ' text-right tabular-nums'} />
                </Field>
                <Field label="Amostras mínimas">
                  <input type="number" min={1} step="1" value={failureAutoMinSamples} onChange={(e) => setFailureAutoMinSamples(e.target.value)} className={inputCls + ' text-right tabular-nums'} />
                </Field>
              </div>
            )}
          </Section>

          <Field label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[72px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" />
          </Field>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <Btn
              kind="primary"
              size="md"
              icon={editingId ? Icons.check : Icons.plus}
              className="w-full justify-center"
              disabled={!canSubmit || save.isPending}
              onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}
            >
              {editingId ? 'Salvar alterações' : 'Criar centro de custo'}
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!pendingToggleConfig}
        onOpenChange={(open) => { if (!open) setPendingToggleConfig(null) }}
        title={pendingToggleConfig?.isActive ? 'Desativar centro de custo?' : 'Ativar centro de custo?'}
        description={pendingToggleConfig
          ? (pendingToggleConfig.isActive
            ? `"${pendingToggleConfig.name}" não aparecerá nas seleções ativas da calculadora.`
            : `"${pendingToggleConfig.name}" voltará a aparecer nas seleções ativas da calculadora.`)
          : ''}
        confirmLabel={pendingToggleConfig?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggleConfig?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => { if (!pendingToggleConfig) return; toggleActive.mutate(pendingToggleConfig) }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
        title="Excluir centro de custo?"
        description={pendingDelete
          ? `Esta ação removerá permanentemente o perfil "${pendingDelete.name}".`
          : ''}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => { if (!pendingDelete) return; remove.mutate(pendingDelete.id) }}
      />
    </div>
  )
}

/* ─── Helpers locais ─────────────────────────────────────── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: NEX.textMute }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function ActionBtn({
  children, color, title, onClick, disabled,
}: {
  children: React.ReactNode
  color: string
  title: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 w-7 rounded flex items-center justify-center transition-colors disabled:opacity-30"
      style={{ color, background: 'transparent' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = nexAlpha('surface2', 1) }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
