import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icons, Icon, Money, NEX, Btn, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { accessoriesService, domainService, suppliersService } from '@/services/entities.service'
import type { Accessory, AccessoryCategory, Unit, Supplier } from '@/types/api.types'
import { ResourceField, resourceInputCls, getApiMessage } from './_shared'

type PurchaseModeOption = 'UNIT' | 'PACK' | 'BOX' | 'ROLL' | 'CUSTOM'
const PURCHASE_MODES: Array<{ value: PurchaseModeOption; label: string }> = [
  { value: 'UNIT', label: 'Unidade' }, { value: 'PACK', label: 'Pacote' },
  { value: 'BOX', label: 'Caixa' }, { value: 'ROLL', label: 'Rolo' }, { value: 'CUSTOM', label: 'Personalizado' },
]
function isPurchaseModeOption(v: string): v is PurchaseModeOption { return PURCHASE_MODES.some((o) => o.value === v) }

export function AccessoriesPage() {
  const [searchParams] = useSearchParams()
  const focusAccessoryId = searchParams.get('accessoryId') ?? undefined

  const queryClient = useQueryClient()
  const { data: res } = useQuery({ queryKey: ['accessories', 'list', 'full'], queryFn: () => accessoriesService.findAll({ limit: 200 }) })
  const list: Accessory[] = res?.data ?? []

  const { data: categoriesRes = [] } = useQuery({ queryKey: ['domain', 'accessory-categories'], queryFn: () => domainService.getAccessoryCategories() })
  const accessoryCategories: AccessoryCategory[] = categoriesRes

  const { data: unitsRes = [] } = useQuery({ queryKey: ['domain', 'units'], queryFn: () => domainService.getUnits() })
  const units: Unit[] = unitsRes

  const { data: suppliersRes = [] } = useQuery({ queryKey: ['suppliers', 'list', 'for-accessories'], queryFn: () => suppliersService.findAll({ limit: 200 }).then((p) => p.data) })
  const suppliers: Supplier[] = suppliersRes

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) => a.name.toLowerCase().includes(q) || (a.category?.name ?? '').toLowerCase().includes(q) || (a.supplier?.name ?? '').toLowerCase().includes(q))
  }, [list, search])

  const resetForm = () => {
    setEditingId(null); setName(''); setCategoryId(''); setUnitId(''); setSupplierId('')
    setPurchaseMode('UNIT'); setPurchaseQuantity('100'); setPurchaseCost(80); setStockQuantity('0'); setMinStockAlert('0')
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (a: Accessory) => {
    setEditingId(a.id); setName(a.name ?? ''); setCategoryId(a.categoryId ?? ''); setUnitId(a.unitId ?? '')
    setSupplierId(a.supplierId ?? ''); setPurchaseMode(isPurchaseModeOption(a.purchaseMode) ? a.purchaseMode : 'UNIT')
    setPurchaseQuantity(String(Number(a.purchaseQuantity) || 1)); setPurchaseCost(Number(a.purchaseCost) || 0)
    setStockQuantity(String(Number(a.stockQuantity) || 0)); setMinStockAlert(a.minStockAlert != null ? String(Number(a.minStockAlert)) : '0')
    setDrawerOpen(true)
  }

  useEffect(() => {
    if (!focusAccessoryId || list.length === 0 || editingId === focusAccessoryId) return
    const target = list.find((a) => a.id === focusAccessoryId)
    if (target) openEdit(target)
  }, [focusAccessoryId, list, editingId])

  const buildPayload = () => {
    const p: Record<string, unknown> = {
      name: name.trim(), categoryId: categoryId || undefined, unitId: unitId || undefined,
      supplierId: supplierId || undefined, purchaseMode,
      purchaseQuantity: Math.max(0.001, Number(purchaseQuantity) || 0.001),
      purchaseCost: Math.max(0, purchaseCost || 0),
    }
    const sq = Number(stockQuantity); if (Number.isFinite(sq)) p.stockQuantity = Math.max(0, sq)
    const ms = Number(minStockAlert); if (Number.isFinite(ms)) p.minStockAlert = Math.max(0, ms)
    return p
  }

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      payload.id ? accessoriesService.update(payload.id, payload.data) : accessoriesService.create(payload.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Acessório atualizado' : 'Acessório criado')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar acessório')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => accessoriesService.remove(id),
    onSuccess: () => { toast.success('Acessório removido'); setPendingDelete(null); queryClient.invalidateQueries({ queryKey: ['accessories'] }) },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover acessório')),
  })

  const canSubmit = !!name.trim() && Number.isFinite(Number(purchaseQuantity)) && Number(purchaseQuantity) > 0 && purchaseCost >= 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar acessório..." className="bg-transparent flex-1 text-[12.5px] focus:outline-none" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>{filtered.length} {filtered.length === 1 ? 'acessório' : 'acessórios'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Novo acessório</Btn>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Acessório', 'Categoria', 'Unidade', 'Estoque', 'Custo / un', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                  <Icon d={Icons.pkg} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p className="text-[13px]">{search ? `Nenhum resultado para "${search}"` : 'Nenhum acessório cadastrado.'}</p>
                  {!search && <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>Adicionar primeiro acessório</Btn>}
                </div>
              </td></tr>
            )}
            {filtered.map((a) => {
              const stock = Number(a.stockQuantity)
              const minStock = a.minStockAlert != null ? Number(a.minStockAlert) : 0
              const isLow = minStock > 0 && stock <= minStock
              return (
                <tr key={a.id} className="group" style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: NEX.text }}>{a.name}</div>
                    <div className="text-[11px]" style={{ color: NEX.textDim }}>{a.supplier?.name ?? 'Sem fornecedor'}</div>
                  </td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{a.category?.name ?? '—'}</td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{a.unit?.name ?? '—'}</td>
                  <td className="px-2">
                    <div className="font-mono text-[11.5px]" style={{ color: isLow ? NEX.amber : NEX.textDim }}>
                      {stock.toFixed(3)}{minStock > 0 && <span className="text-[10px]"> / min {minStock.toFixed(3)}</span>}
                    </div>
                  </td>
                  <td className="px-2 text-[11.5px]"><Money value={Number(a.costPerUnit)} muted /></td>
                  <td className="px-4 text-right">
                    <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(a)}><Icon d={Icons.edit} size={12} /></ActionBtn>
                      <ActionBtn color={NEX.red} title="Excluir" onClick={() => setPendingDelete(a)}><Icon d={Icons.trash} size={12} /></ActionBtn>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Editar acessório' : 'Novo acessório'}>
        <div className="space-y-4">
          <ResourceField label="Nome *"><input value={name} onChange={(e) => setName(e.target.value)} className={resourceInputCls} placeholder="Ex.: Argola chaveiro 25mm" autoFocus /></ResourceField>
          <div className="grid grid-cols-2 gap-3">
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
            <ResourceField label="Qtd. por compra *"><input type="number" min={0.001} step="0.001" value={purchaseQuantity} onChange={(e) => setPurchaseQuantity(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            <ResourceField label="Custo da compra (R$) *"><DecimalRtlInput value={purchaseCost} onValueChange={setPurchaseCost} min={0} className={resourceInputCls + ' tabular-nums'} /></ResourceField>
            <ResourceField label="Estoque inicial"><input type="number" min={0} step="0.001" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            <ResourceField label="Alerta mínimo"><input type="number" min={0} step="0.001" value={minStockAlert} onChange={(e) => setMinStockAlert(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className="w-full justify-center" disabled={!canSubmit || save.isPending}
              onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}>
              {editingId ? 'Salvar alterações' : 'Criar acessório'}
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>Cancelar</Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null) }}
        title="Excluir acessório?" description={pendingDelete ? `Esta ação removerá permanentemente "${pendingDelete.name}".` : ''}
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
