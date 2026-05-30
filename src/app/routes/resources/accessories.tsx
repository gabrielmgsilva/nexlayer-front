import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Icons, Money, NEX, Btn } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { accessoriesService, domainService, suppliersService } from '@/services/entities.service'
import type { Accessory, AccessoryCategory, Unit, Supplier } from '@/types/api.types'
import { ResourceField, resourceInputCls, getApiMessage } from './_shared'

type PurchaseModeOption = 'UNIT' | 'PACK' | 'BOX' | 'ROLL' | 'CUSTOM'
const PURCHASE_MODES: Array<{ value: PurchaseModeOption; label: string }> = [
  { value: 'UNIT', label: 'Unidade' },
  { value: 'PACK', label: 'Pacote' },
  { value: 'BOX',  label: 'Caixa' },
  { value: 'ROLL', label: 'Rolo' },
  { value: 'CUSTOM', label: 'Personalizado' },
]
function isPurchaseModeOption(value: string): value is PurchaseModeOption {
  return PURCHASE_MODES.some((o) => o.value === value)
}

export function AccessoriesPage() {
  const [searchParams] = useSearchParams()
  const focusAccessoryId = searchParams.get('accessoryId') ?? undefined

  const queryClient = useQueryClient()
  const { data: res } = useQuery({ queryKey: ['accessories', 'list', 'full'], queryFn: () => accessoriesService.findAll({ limit: 200 }) })
  const list: Accessory[] = res?.data ?? []

  const { data: accessoryCategoriesRes = [] } = useQuery({ queryKey: ['domain', 'accessory-categories'], queryFn: () => domainService.getAccessoryCategories() })
  const accessoryCategories: AccessoryCategory[] = accessoryCategoriesRes

  const { data: unitsRes = [] } = useQuery({ queryKey: ['domain', 'units'], queryFn: () => domainService.getUnits() })
  const units: Unit[] = unitsRes

  const { data: suppliersRes = [] } = useQuery({ queryKey: ['suppliers', 'list', 'for-accessories'], queryFn: () => suppliersService.findAll({ limit: 200 }).then((p) => p.data) })
  const suppliers: Supplier[] = suppliersRes

  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Accessory | null>(null)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [purchaseMode, setPurchaseMode] = useState<PurchaseModeOption>('UNIT')
  const [purchaseQuantity, setPurchaseQuantity] = useState('100')
  const [purchaseCost, setPurchaseCost] = useState(80)
  const [stockQuantity, setStockQuantity] = useState('0')
  const [minStockAlert, setMinStockAlert] = useState('0')

  const resetForm = () => {
    setEditingId(null); setName(''); setCategoryId(''); setUnitId(''); setSupplierId('')
    setPurchaseMode('UNIT'); setPurchaseQuantity('100'); setPurchaseCost(80)
    setStockQuantity('0'); setMinStockAlert('0')
  }

  const startEdit = (accessory: Accessory) => {
    setEditingId(accessory.id); setName(accessory.name ?? '')
    setCategoryId(accessory.categoryId ?? ''); setUnitId(accessory.unitId ?? '')
    setSupplierId(accessory.supplierId ?? '')
    setPurchaseMode(isPurchaseModeOption(accessory.purchaseMode) ? accessory.purchaseMode : 'UNIT')
    setPurchaseQuantity(String(Number(accessory.purchaseQuantity) || 1))
    setPurchaseCost(Number(accessory.purchaseCost) || 0)
    setStockQuantity(String(Number(accessory.stockQuantity) || 0))
    setMinStockAlert(accessory.minStockAlert != null ? String(Number(accessory.minStockAlert)) : '0')
  }

  useEffect(() => {
    if (!focusAccessoryId || list.length === 0 || editingId === focusAccessoryId) return
    const target = list.find((item) => item.id === focusAccessoryId)
    if (target) startEdit(target)
  }, [focusAccessoryId, list, editingId])

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name: name.trim(),
      categoryId: categoryId || undefined,
      unitId: unitId || undefined,
      supplierId: supplierId || undefined,
      purchaseMode,
      purchaseQuantity: Math.max(0.001, Number(purchaseQuantity) || 0.001),
      purchaseCost: Math.max(0, purchaseCost || 0),
    }
    const sq = Number(stockQuantity); if (Number.isFinite(sq)) payload.stockQuantity = Math.max(0, sq)
    const ms = Number(minStockAlert); if (Number.isFinite(ms)) payload.minStockAlert = Math.max(0, ms)
    return payload
  }

  const save = useMutation({
    mutationFn: (p: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      p.id ? accessoriesService.update(p.id, p.data) : accessoriesService.create(p.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Acessório atualizado' : 'Acessório criado')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar acessório')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => accessoriesService.remove(id),
    onSuccess: () => {
      toast.success('Acessório removido')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover acessório')),
  })

  const canSubmit = !!name.trim() && Number.isFinite(Number(purchaseQuantity)) && Number(purchaseQuantity) > 0 && purchaseCost >= 0

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Acessórios</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>Cadastro e gestão de acessórios e insumos.</div>
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
              {['Acessório', 'Categoria', 'Unidade', 'Estoque', 'Custo / un', ''].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: NEX.textDim }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>Nenhum acessório cadastrado.</td></tr>}
            {list.map((accessory) => {
              const stock = Number(accessory.stockQuantity)
              const minStock = accessory.minStockAlert != null ? Number(accessory.minStockAlert) : 0
              const isLow = minStock > 0 && stock <= minStock
              return (
                <tr key={accessory.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{accessory.name}</div>
                    <div className="text-[11px]" style={{ color: NEX.textDim }}>{accessory.supplier?.name ?? 'Sem fornecedor'}</div>
                  </td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{accessory.category?.name ?? '—'}</td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{accessory.unit?.name ?? '—'}</td>
                  <td className="px-2">
                    <div className="font-mono text-[11.5px]" style={{ color: isLow ? NEX.amber : NEX.textDim }}>
                      {stock.toFixed(3)}
                      {minStock > 0 && <span className="text-[10px]"> / min {minStock.toFixed(3)}</span>}
                    </div>
                  </td>
                  <td className="px-2 text-[11.5px]"><Money value={Number(accessory.costPerUnit)} muted /></td>
                  <td className="px-4 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button onClick={() => startEdit(accessory)} className="text-[11px]" style={{ color: NEX.cyan }}>Alterar</button>
                      <button onClick={() => setPendingDelete(accessory)} className="text-[11px]" style={{ color: NEX.red }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="text-[13px] font-semibold mb-3">{editingId ? 'Alterar acessório' : 'Novo acessório'}</div>
        <div className="space-y-3">
          <ResourceField label="Nome *"><input value={name} onChange={(e) => setName(e.target.value)} className={resourceInputCls} placeholder="Ex.: Argola chaveiro 25mm" /></ResourceField>
          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Modo de compra *">
              <select value={purchaseMode} onChange={(e) => setPurchaseMode(e.target.value as PurchaseModeOption)} className={resourceInputCls}>
                {PURCHASE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </ResourceField>
            <ResourceField label="Unidade">
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </select>
            </ResourceField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Categoria">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {accessoryCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </ResourceField>
            <ResourceField label="Fornecedor">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </ResourceField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Quantidade por compra *"><input type="number" min={0.001} step="0.001" value={purchaseQuantity} onChange={(e) => setPurchaseQuantity(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            <ResourceField label="Custo da compra (R$) *"><DecimalRtlInput value={purchaseCost} onValueChange={setPurchaseCost} min={0} className={resourceInputCls + ' tabular-nums'} /></ResourceField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Estoque inicial"><input type="number" min={0} step="0.001" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            <ResourceField label="Alerta mínimo"><input type="number" min={0} step="0.001" value={minStockAlert} onChange={(e) => setMinStockAlert(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
          </div>
          <div className="flex gap-2">
            {editingId && <Btn kind="ghost" size="md" className="flex-1 justify-center" onClick={resetForm}>Cancelar alteração</Btn>}
            <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className={(editingId ? 'flex-1' : 'w-full') + ' justify-center'} disabled={!canSubmit || save.isPending} onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}>
              {editingId ? 'Salvar alterações' : 'Criar acessório'}
            </Btn>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
        title="Excluir acessório?"
        description={pendingDelete ? `Esta ação removerá permanentemente o acessório "${pendingDelete.name}".` : 'Esta ação removerá permanentemente o acessório selecionado.'}
        confirmLabel="Excluir" variant="danger" loading={remove.isPending}
        onConfirm={() => { if (!pendingDelete) return; remove.mutate(pendingDelete.id) }}
      />
    </div>
  )
}
