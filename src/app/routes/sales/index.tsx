import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Btn, Money, Icon, Icons, NEX, SALE_STATUS, ProductThumb } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { salesService, salesChannelService, customersService, productsService } from '@/services/entities.service'
import type { SaleOrder, SaleStatus } from '@/types/api.types'

function computeSaleTotal(s: Pick<SaleOrder, 'items' | 'shippingCost' | 'discount'>): number {
  const subtotal = (s.items ?? []).reduce(
    (acc, it) => acc + Number(it.quantity ?? 0) * Number(it.unitPrice ?? 0), 0,
  )
  return subtotal + Number(s.shippingCost ?? 0) - Number(s.discount ?? 0)
}

const STATUS_TABS: Array<{ id: 'all' | SaleStatus; label: string }> = [
  { id: 'all',       label: 'Todas' },
  { id: 'PENDING',   label: 'Pendentes' },
  { id: 'CONFIRMED', label: 'Confirmadas' },
  { id: 'SHIPPED',   label: 'Enviadas' },
  { id: 'DELIVERED', label: 'Entregues' },
  { id: 'CANCELLED', label: 'Canceladas' },
]

export function SalesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_TABS[number]['id']>('all')
  const [search, setSearch] = useState('')

  const { data: salesRes } = useQuery({
    queryKey: ['sales', 'list', statusFilter],
    queryFn: () => salesService.findAll({
      page: 1,
      limit: 100,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  })
  const allSales: SaleOrder[] = salesRes?.data ?? []
  const sales = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allSales
    return allSales.filter((s) =>
      s.orderNumber.toLowerCase().includes(q) ||
      (s.customer?.name ?? '').toLowerCase().includes(q) ||
      (s.channel?.name ?? '').toLowerCase().includes(q),
    )
  }, [allSales, search])

  const counts = useMemo(() => {
    const all = salesRes?.meta?.total ?? sales.length
    return { all }
  }, [salesRes, sales])

  const newOpen = searchParams.get('new') === '1'

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1 p-1 rounded-md overflow-x-auto max-w-full" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className="px-3 py-1.5 rounded text-[12px] font-medium transition-all flex items-center gap-1.5"
              style={{
                background: statusFilter === t.id ? NEX.cyanDim : 'transparent',
                color: statusFilter === t.id ? NEX.cyan : NEX.textDim,
              }}
            >
              {t.label}
              {t.id === 'all' && (
                <span className="text-[10px] font-mono opacity-60">{counts.all}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 h-8 px-3 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nº pedido, cliente..." className="bg-transparent text-[12.5px] focus:outline-none w-44" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="sm:ml-auto">
          <Btn kind="primary" size="sm" icon={Icons.plus} onClick={() => setSearchParams({ new: '1' })}>
            Nova venda
          </Btn>
        </div>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[580px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              <th className="text-left px-4 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Pedido</th>
              <th className="text-left px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Cliente</th>
              <th className="text-left px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Canal</th>
              <th className="text-left px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Itens</th>
              <th className="text-left px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Status</th>
              <th className="text-right px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px]" style={{ color: NEX.textMute }}>Nenhuma venda no filtro selecionado.</td></tr>
            )}
            {sales.map((s) => {
              const st = SALE_STATUS[s.status] ?? SALE_STATUS.PENDING
              const total = computeSaleTotal(s)
              const itemQty = (s.items ?? []).reduce((n, i) => n + Number(i.quantity ?? 0), 0)
              return (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/sales/${s.id}`)}
                  className="cursor-pointer hover:bg-[#11161E]"
                  style={{ borderTop: `1px solid ${NEX.border}` }}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-mono text-[11.5px] font-semibold">{s.orderNumber}</div>
                    <div className="text-[10.5px]" style={{ color: NEX.textMute }}>
                      {new Date(s.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                  </td>
                  <td className="px-2 font-medium">{s.customer?.name ?? '—'}</td>
                  <td className="px-2"><Pill tone="default">{s.channel?.name ?? '—'}</Pill></td>
                  <td className="px-2">
                    <span style={{ color: NEX.textDim }}>{itemQty} un</span>
                  </td>
                  <td className="px-2">
                    <Pill tone={st.tone} dot={s.status === 'PENDING' || s.status === 'CONFIRMED'}>{st.label}</Pill>
                  </td>
                  <td className="px-2 text-right"><Money value={total} className="font-semibold" /></td>
                  <td className="px-4 text-right"><Icon d={Icons.chevR} size={13} className="opacity-50" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </Card>

      {newOpen && <NewSaleDrawer onClose={() => setSearchParams({})} />}
    </div>
  )
}

/* ─── Drawer detail (used by /sales/:id route) ───────────────────── */
export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pendingCancel, setPendingCancel] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Edit state
  const [editItems, setEditItems] = useState<SaleItemRow[]>([])
  const [editDiscount, setEditDiscount] = useState(0)
  const [editShipping, setEditShipping] = useState(0)
  const [editNotes, setEditNotes] = useState('')
  // Draft product entry
  const [draftProductId, setDraftProductId] = useState('')
  const [draftVariationId, setDraftVariationId] = useState('')
  const [draftQty, setDraftQty] = useState(1)
  const [draftPrice, setDraftPrice] = useState(0)

  const { data: sale, isLoading } = useQuery<SaleOrder>({
    queryKey: ['sales', id],
    queryFn: () => salesService.findOne(id!),
    enabled: !!id,
  })

  const { data: productsRes } = useQuery({
    queryKey: ['products', 'options'],
    queryFn: () => productsService.findAll({ limit: 200, isActive: true }),
    enabled: isEditing,
  })
  const products = productsRes?.data ?? []

  const statusMutation = useMutation({
    mutationFn: (status: SaleStatus) => salesService.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status atualizado')
      setPendingCancel(false)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
    onError: () => toast.error('Falha ao atualizar status'),
  })

  const saveMutation = useMutation({
    mutationFn: () => salesService.update(id!, {
      discount: editDiscount,
      shippingCost: editShipping,
      notes: editNotes || undefined,
      items: editItems.map((it) => ({
        id: it._saleItemId,
        productId: it.productId,
        variationId: it.variationId || undefined,
        quantity: it.qty,
        unitPrice: it.unitPrice,
      })),
    }),
    onSuccess: () => {
      toast.success('Venda atualizada')
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales', id] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message ?? 'Falha ao salvar')
    },
  })

  const enterEdit = () => {
    if (!sale) return
    setEditItems(
      (sale.items ?? []).map((it) => ({
        _saleItemId: it.id,
        productId: it.productId,
        variationId: it.variationId ?? '',
        qty: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
    )
    setEditDiscount(Number(sale.discount ?? 0))
    setEditShipping(Number(sale.shippingCost ?? 0))
    setEditNotes(sale.notes ?? '')
    setDraftProductId(''); setDraftVariationId(''); setDraftQty(1); setDraftPrice(0)
    setIsEditing(true)
  }

  const draftProduct = products.find((p) => p.id === draftProductId)
  const draftVariations = draftProduct?.variations ?? []

  const handleDraftProduct = (pid: string) => {
    setDraftProductId(pid); setDraftVariationId('')
    const p = products.find((x) => x.id === pid)
    setDraftPrice(p ? Number(p.sellingPrice) || 0 : 0)
  }
  const handleDraftVariation = (vid: string) => {
    setDraftVariationId(vid)
    if (vid) {
      const v = draftVariations.find((x) => x.id === vid)
      if (v?.sellingPrice != null) setDraftPrice(Number(v.sellingPrice) || 0)
    }
  }
  const commitDraft = () => {
    if (!draftProductId || draftQty < 1) return
    setEditItems((prev) => [...prev, {
      _saleItemId: undefined,
      productId: draftProductId,
      variationId: draftVariationId,
      qty: draftQty,
      unitPrice: draftPrice,
    }])
    setDraftProductId(''); setDraftVariationId(''); setDraftQty(1); setDraftPrice(0)
  }

  if (isLoading || !sale) return null

  const st = SALE_STATUS[sale.status] ?? SALE_STATUS.PENDING
  const subtotal = (sale.items ?? []).reduce((s, i) => s + Number(i.quantity ?? 0) * Number(i.unitPrice ?? 0), 0)
  const total = computeSaleTotal(sale)

  // Edit totals
  const editSubtotal = editItems.reduce((s, it) => s + it.qty * it.unitPrice, 0)
  const editTotal = editSubtotal + editShipping - editDiscount

  return (
    <>
      <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={() => !isEditing && navigate('/sales')} />
      <aside className="fixed top-0 right-0 bottom-0 z-40 flex flex-col" style={{ width: 'min(540px, 100vw)', background: NEX.surface, borderLeft: `1px solid ${NEX.border}` }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px]" style={{ color: NEX.textMute }}>{sale.orderNumber}</div>
            <div className="text-[15px] font-semibold mt-0.5 truncate">{sale.customer?.name ?? '—'}</div>
          </div>
          <Pill tone={st.tone}>{st.label}</Pill>
          {sale.status === 'PENDING' && !isEditing && (
            <button
              onClick={enterEdit}
              className="h-8 px-3 rounded-md text-[12px] font-medium flex items-center gap-1.5"
              style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, color: NEX.textDim }}
            >
              <Icon d={Icons.edit} size={12} /> Editar
            </button>
          )}
          <button
            onClick={() => { setIsEditing(false); navigate('/sales') }}
            className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-[#11161E] flex-shrink-0"
          >
            <Icon d={Icons.x} size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[12.5px]">
          {/* Metadados */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Canal</div>
              <div className="mt-0.5 font-medium">{sale.channel?.name ?? '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Data</div>
              <div className="mt-0.5 font-medium">
                {new Date(sale.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* ── MODO VISUALIZAÇÃO ── */}
          {!isEditing && (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>
                  Itens · {sale.items?.length ?? 0}
                </div>
                <div className="space-y-2">
                  {(sale.items ?? []).map((item) => {
                    const linkedJob = item.productionJob
                    return (
                      <div key={item.id} className="rounded-lg p-3" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                        <div className="flex items-start gap-3">
                          <ProductThumb id={item.product?.id} name={item.product?.name} size={36} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-semibold">{item.product?.name ?? '—'}</div>
                            {item.variation?.name && <div className="text-[11px]" style={{ color: NEX.textDim }}>{item.variation.name}</div>}
                            <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: NEX.textMute }}>
                              <span><span className="font-mono font-semibold" style={{ color: NEX.text }}>{item.quantity}</span> un</span>
                              <span>×</span>
                              <Money value={item.unitPrice} muted />
                            </div>
                          </div>
                          <Money value={Number(item.quantity) * Number(item.unitPrice)} className="font-semibold" />
                        </div>
                        {linkedJob && (
                          <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: `1px dashed ${NEX.border}` }}>
                            <Icon d={Icons.printer} size={12} style={{ color: NEX.cyan }} />
                            <span className="text-[11.5px]" style={{ color: NEX.textDim }}>
                              Job <span className="font-mono">{linkedJob.jobNumber}</span> · {linkedJob.status}
                            </span>
                          </div>
                        )}
                        {!item.fulfilledFromStock && !linkedJob && (
                          <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px dashed rgba(255,181,71,0.3)' }}>
                            <Icon d={Icons.alert} size={12} style={{ color: NEX.amber }} />
                            <span className="text-[11.5px] font-semibold" style={{ color: NEX.amber }}>Aguardando produção</span>
                            <button
                              onClick={() => {
                                const params = new URLSearchParams({
                                  productId: item.productId,
                                  qty: String(item.quantity),
                                  order: sale.orderNumber,
                                  saleId: sale.id,
                                  saleItemId: item.id,
                                  unitPrice: String(item.unitPrice),
                                })
                                if (sale.customerId) params.set('customerId', sale.customerId)
                                navigate(`/calculator?${params.toString()}`)
                              }}
                              className="ml-auto text-[11px] font-medium px-2 py-1 rounded-md"
                              style={{ background: NEX.cyan, color: '#001F26' }}
                            >
                              Calcular custo →
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-lg p-3 space-y-1.5 text-[12px]" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Subtotal</span><Money value={subtotal} muted /></div>
                {Number(sale.discount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: NEX.textDim }}>Desconto</span>
                    <span className="font-mono" style={{ color: NEX.green }}>− R$ {Number(sale.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Frete</span><Money value={sale.shippingCost} muted /></div>
                <div className="flex justify-between pt-2 mt-2 text-[14px] font-semibold" style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <span>Total</span>
                  <Money value={total} className="text-[15px]" />
                </div>
              </div>
            </>
          )}

          {/* ── MODO EDIÇÃO ── */}
          {isEditing && (
            <>
              {/* Itens existentes */}
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>
                  Itens do pedido
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}` }}>
                  {editItems.length === 0 && (
                    <div className="px-4 py-6 text-center text-[12px]" style={{ color: NEX.textMute }}>Nenhum item.</div>
                  )}
                  {editItems.map((it, idx) => {
                    const saleItem = (sale.items ?? []).find((si) => si.id === it._saleItemId)
                    const locked = !!(saleItem?.productionJobId || saleItem?.fulfilledFromStock)
                    const productName = saleItem?.product?.name ?? products.find((p) => p.id === it.productId)?.name ?? '—'
                    return (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2.5 text-[12px]" style={{ borderTop: idx > 0 ? `1px solid ${NEX.border}` : undefined }}>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{productName}</div>
                          {saleItem?.variation?.name && <div className="text-[11px]" style={{ color: NEX.textMute }}>{saleItem.variation.name}</div>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input
                            type="number" min={1} value={it.qty} disabled={locked}
                            onChange={(e) => setEditItems((prev) => prev.map((x, i) => i === idx ? { ...x, qty: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                            className="w-14 h-7 px-2 rounded text-center text-[12px] focus:outline-none"
                            style={{ background: locked ? 'transparent' : NEX.surface2, border: `1px solid ${locked ? 'transparent' : NEX.border}`, color: NEX.text }}
                          />
                          <span style={{ color: NEX.textMute }}>×</span>
                          <DecimalRtlInput
                            value={it.unitPrice} min={0} disabled={locked}
                            onValueChange={(v) => setEditItems((prev) => prev.map((x, i) => i === idx ? { ...x, unitPrice: v } : x))}
                            className="w-20 h-7 px-2 rounded text-right text-[12px] tabular-nums focus:outline-none"
                            style={{ background: locked ? 'transparent' : NEX.surface2, border: `1px solid ${locked ? 'transparent' : NEX.border}`, color: NEX.text }}
                          />
                          <Money value={it.qty * it.unitPrice} className="w-16 text-right text-[12px] font-semibold tabular-nums" />
                          {locked
                            ? <span title="Vinculado a job"><Icon d={Icons.printer} size={12} style={{ color: NEX.textMute }} /></span>
                            : (
                              <button onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))} style={{ color: NEX.red }} className="opacity-60 hover:opacity-100">
                                <Icon d={Icons.trash} size={13} />
                              </button>
                            )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Adicionar produto */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: NEX.textMute }}>Adicionar produto</div>
                <Field label="Produto">
                  <select value={draftProductId} onChange={(e) => handleDraftProduct(e.target.value)}>
                    <option value="">Selecionar produto…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                {draftVariations.length > 0 && (
                  <Field label="Variação">
                    <select value={draftVariationId} onChange={(e) => handleDraftVariation(e.target.value)}>
                      <option value="">— sem variação —</option>
                      {draftVariations.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </Field>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantidade">
                    <input type="number" min={1} value={draftQty}
                      onChange={(e) => setDraftQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </Field>
                  <Field label="Preço unit. (R$)">
                    <DecimalRtlInput value={draftPrice} onValueChange={setDraftPrice} min={0}
                      className="h-9 px-3 text-[13px] text-right tabular-nums w-full focus:outline-none bg-transparent"
                    />
                  </Field>
                </div>
                <Btn kind="primary" size="md" icon={Icons.plus} onClick={commitDraft} disabled={!draftProductId} className="w-full justify-center">
                  Adicionar
                </Btn>
              </div>

              {/* Frete + Desconto */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Frete (R$)">
                  <DecimalRtlInput value={editShipping} onValueChange={setEditShipping} min={0}
                    className="h-9 px-3 text-[13px] text-right tabular-nums w-full focus:outline-none bg-transparent"
                  />
                </Field>
                <Field label="Desconto (R$)">
                  <DecimalRtlInput value={editDiscount} onValueChange={setEditDiscount} min={0}
                    className="h-9 px-3 text-[13px] text-right tabular-nums w-full focus:outline-none bg-transparent"
                  />
                </Field>
              </div>

              <Field label="Observações">
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="h-auto py-2" />
              </Field>

              {/* Resumo edição */}
              {editItems.length > 0 && (
                <div className="rounded-lg px-4 py-3 space-y-1.5 text-[12px]" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                  <div className="flex justify-between" style={{ color: NEX.textDim }}>
                    <span>Subtotal</span><Money value={editSubtotal} className="tabular-nums" />
                  </div>
                  {editShipping > 0 && <div className="flex justify-between" style={{ color: NEX.textDim }}><span>Frete</span><Money value={editShipping} className="tabular-nums" /></div>}
                  {editDiscount > 0 && (
                    <div className="flex justify-between" style={{ color: NEX.textDim }}>
                      <span>Desconto</span>
                      <span className="font-mono tabular-nums" style={{ color: NEX.red }}>− R$ {editDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-1.5" style={{ borderTop: `1px solid ${NEX.border}` }}>
                    <span>Total</span><Money value={editTotal} className="tabular-nums text-[13px]" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-2" style={{ borderTop: `1px solid ${NEX.border}` }}>
          {isEditing ? (
            <>
              <Btn kind="ghost" size="md" onClick={() => setIsEditing(false)} className="flex-1 justify-center">Cancelar</Btn>
              <Btn kind="primary" size="md" icon={Icons.check} className="flex-1 justify-center"
                disabled={editItems.length === 0 || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
              </Btn>
            </>
          ) : (
            <>
              {sale.status === 'PENDING' && (
                <>
                  <Btn kind="primary" size="md" icon={Icons.check} className="flex-1 justify-center" onClick={() => statusMutation.mutate('CONFIRMED')}>Confirmar</Btn>
                  <Btn kind="ghost" size="md" icon={Icons.x} onClick={() => setPendingCancel(true)}>Cancelar</Btn>
                </>
              )}
              {sale.status === 'CONFIRMED' && (
                <Btn kind="primary" size="md" icon={Icons.truck} className="flex-1 justify-center" onClick={() => statusMutation.mutate('SHIPPED')}>Marcar como enviada</Btn>
              )}
              {sale.status === 'SHIPPED' && (
                <Btn kind="primary" size="md" icon={Icons.check} className="flex-1 justify-center" onClick={() => statusMutation.mutate('DELIVERED')}>Marcar como entregue</Btn>
              )}
              {(sale.status === 'DELIVERED' || sale.status === 'CANCELLED') && (
                <Btn kind="ghost" size="md" icon={Icons.download} className="flex-1 justify-center">Baixar comprovante</Btn>
              )}
            </>
          )}
        </div>
      </aside>

      <ConfirmDialog
        open={pendingCancel}
        onOpenChange={setPendingCancel}
        title="Cancelar venda?"
        description={`Esta ação alterará o status do pedido ${sale.orderNumber} para cancelado.`}
        confirmLabel="Cancelar venda"
        variant="danger"
        loading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate('CANCELLED')}
      />
    </>
  )
}

/* ─── Quick "Nova venda" drawer ──────────────────────────────────── */
interface SaleItemRow {
  _saleItemId?: string   // undefined = novo item
  productId: string
  variationId: string
  qty: number
  unitPrice: number
}

function NewSaleDrawer({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()

  // Cabeçalho do pedido
  const [channelId, setChannelId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [shippingCost, setShippingCost] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')

  // Itens já adicionados ao pedido
  const [orderItems, setOrderItems] = useState<SaleItemRow[]>([])

  // Formulário de entrada (campo de busca/adição)
  const [draftProductId, setDraftProductId] = useState('')
  const [draftVariationId, setDraftVariationId] = useState('')
  const [draftQty, setDraftQty] = useState(1)
  const [draftPrice, setDraftPrice] = useState(0)

  const { data: channels = [] } = useQuery({ queryKey: ['sales', 'channels', 'active'], queryFn: () => salesChannelService.findAll() })
  const { data: customersRes } = useQuery({ queryKey: ['customers', 'options', 'active'], queryFn: () => customersService.findAll({ limit: 200, isActive: true }) })
  const customers = customersRes?.data ?? []
  const { data: productsRes } = useQuery({ queryKey: ['products', 'options'], queryFn: () => productsService.findAll({ limit: 200, isActive: true }) })
  const products = productsRes?.data ?? []

  useEffect(() => {
    if (!channelId && channels.length > 0) setChannelId(channels[0].id)
  }, [channelId, channels])

  const draftProduct = products.find((p) => p.id === draftProductId)
  const draftVariations = draftProduct?.variations ?? []

  // Ao trocar produto no draft, preenche preço automaticamente
  const handleDraftProduct = (id: string) => {
    setDraftProductId(id)
    setDraftVariationId('')
    const p = products.find((x) => x.id === id)
    setDraftPrice(p ? Number(p.sellingPrice) || 0 : 0)
  }

  // Ao trocar variação no draft, preenche preço da variação
  const handleDraftVariation = (id: string) => {
    setDraftVariationId(id)
    if (id) {
      const v = draftVariations.find((x) => x.id === id)
      if (v?.sellingPrice != null) setDraftPrice(Number(v.sellingPrice) || 0)
    }
  }

  const canAddDraft = !!draftProductId && draftQty > 0

  const commitDraft = () => {
    if (!canAddDraft) return
    setOrderItems((prev) => [...prev, {
      productId: draftProductId,
      variationId: draftVariationId,
      qty: draftQty,
      unitPrice: draftPrice,
    }])
    // Limpa o formulário de entrada
    setDraftProductId('')
    setDraftVariationId('')
    setDraftQty(1)
    setDraftPrice(0)
  }

  const removeOrderItem = (idx: number) =>
    setOrderItems((prev) => prev.filter((_, i) => i !== idx))

  const itemsSubtotal = orderItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0)
  const total = itemsSubtotal + Number(shippingCost) - Number(discount)

  const create = useMutation({
    mutationFn: () => salesService.create({
      channelId,
      customerId: customerId || undefined,
      shippingCost: Number(shippingCost) || 0,
      discount: Number(discount) || 0,
      notes: notes || undefined,
      items: orderItems.map((it) => ({
        productId: it.productId,
        variationId: it.variationId || undefined,
        quantity: it.qty,
        unitPrice: it.unitPrice,
      })),
    }),
    onSuccess: () => {
      toast.success('Venda criada')
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message ?? 'Falha ao criar venda')
    },
  })

  const canSubmit = channelId && orderItems.length > 0

  return (
    <>
      <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-40 flex flex-col" style={{ width: 'min(640px, 100vw)', background: NEX.surface, borderLeft: `1px solid ${NEX.border}` }}>
        <div className="px-5 py-4 flex items-center" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[15px] font-semibold">Nova venda</div>
          <button onClick={onClose} className="ml-auto h-8 w-8 rounded-md flex items-center justify-center hover:bg-[#11161E]"><Icon d={Icons.x} size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-[12.5px]">

          {/* Canal + Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Canal *">
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className={inputCls}>
                <option value="">Selecionar…</option>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Cliente">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
                <option value="">— sem cliente —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          {/* ── Formulário de entrada de produto ── */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: NEX.textMute }}>Adicionar produto</div>

            <Field label="Produto *">
              <select value={draftProductId} onChange={(e) => handleDraftProduct(e.target.value)} className={inputCls}>
                <option value="">Selecionar…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>

            {draftVariations.length > 0 && (
              <Field label="Variação">
                <select value={draftVariationId} onChange={(e) => handleDraftVariation(e.target.value)} className={inputCls}>
                  <option value="">— sem variação —</option>
                  {draftVariations.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}{v.sellingPrice != null ? ` · R$ ${Number(v.sellingPrice).toFixed(2)}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantidade *">
                <input
                  type="number" min={1} value={draftQty}
                  onChange={(e) => setDraftQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className={inputCls}
                />
              </Field>
              <Field label="Preço unit. (R$)">
                <DecimalRtlInput
                  value={draftPrice}
                  onValueChange={setDraftPrice}
                  min={0}
                  className="h-9 px-3 text-[13px] text-right tabular-nums w-full focus:outline-none bg-transparent"
                />
              </Field>
            </div>

            <Btn
              kind="primary" size="md" icon={Icons.plus}
              disabled={!canAddDraft}
              onClick={commitDraft}
              className="w-full justify-center"
            >
              Adicionar
            </Btn>
          </div>

          {/* ── Grid de itens do pedido ── */}
          {orderItems.length > 0 && (
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider mb-2" style={{ color: NEX.textMute }}>
                Itens do pedido · {orderItems.length} {orderItems.length === 1 ? 'produto' : 'produtos'}
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}` }}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${NEX.border}`, background: NEX.surface2 }}>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: NEX.textMute }}>Produto</th>
                      <th className="text-center px-2 py-2 font-semibold w-12" style={{ color: NEX.textMute }}>Qtd</th>
                      <th className="text-right px-2 py-2 font-semibold" style={{ color: NEX.textMute }}>Unit.</th>
                      <th className="text-right px-3 py-2 font-semibold" style={{ color: NEX.textMute }}>Total</th>
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((it, idx) => {
                      const p = products.find((x) => x.id === it.productId)
                      const v = p?.variations?.find((x) => x.id === it.variationId)
                      return (
                        <tr key={idx} style={{ borderTop: idx > 0 ? `1px solid ${NEX.border}` : undefined }}>
                          <td className="px-3 py-2.5">
                            <div className="font-medium truncate max-w-[160px]">{p?.name ?? '—'}</div>
                            {v && <div className="text-[10.5px]" style={{ color: NEX.textMute }}>{v.name}</div>}
                          </td>
                          <td className="px-2 py-2.5 text-center tabular-nums">{it.qty}</td>
                          <td className="px-2 py-2.5 text-right tabular-nums" style={{ color: NEX.textDim }}>
                            R$ {Number(it.unitPrice).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                            <Money value={it.qty * it.unitPrice} />
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => removeOrderItem(idx)}
                              className="h-6 w-6 rounded flex items-center justify-center mx-auto opacity-40 hover:opacity-100"
                              style={{ color: NEX.red }}
                            >
                              <Icon d={Icons.trash} size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Frete + Desconto + Obs */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frete (R$)">
              <DecimalRtlInput value={shippingCost} onValueChange={setShippingCost} min={0} className="h-9 px-3 text-[13px] text-right tabular-nums" />
            </Field>
            <Field label="Desconto (R$)">
              <DecimalRtlInput value={discount} onValueChange={setDiscount} min={0} className="h-9 px-3 text-[13px] text-right tabular-nums" />
            </Field>
          </div>
          <Field label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls + ' h-auto py-2'} />
          </Field>

          {/* Resumo */}
          {orderItems.length > 0 && (
            <div className="rounded-lg px-4 py-3 space-y-1.5 text-[12px]" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
              {orderItems.length > 1 && (
                <div className="flex justify-between" style={{ color: NEX.textDim }}>
                  <span>Subtotal</span>
                  <Money value={itemsSubtotal} className="tabular-nums" />
                </div>
              )}
              {Number(shippingCost) > 0 && (
                <div className="flex justify-between" style={{ color: NEX.textDim }}>
                  <span>Frete</span>
                  <Money value={Number(shippingCost)} className="tabular-nums" />
                </div>
              )}
              {Number(discount) > 0 && (
                <div className="flex justify-between" style={{ color: NEX.textDim }}>
                  <span>Desconto</span>
                  <span className="tabular-nums font-mono" style={{ color: NEX.red }}>− R$ {Number(discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold" style={orderItems.length > 1 || Number(shippingCost) > 0 || Number(discount) > 0 ? { borderTop: `1px solid ${NEX.border}`, paddingTop: 6 } : undefined}>
                <span>Total</span>
                <Money value={total} className="tabular-nums text-[13px]" />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex gap-2" style={{ borderTop: `1px solid ${NEX.border}` }}>
          <Btn kind="ghost" size="md" onClick={onClose} className="flex-1 justify-center">Cancelar</Btn>
          <Btn kind="primary" size="md" icon={Icons.check} className="flex-1 justify-center" onClick={() => create.mutate()} disabled={!canSubmit || create.isPending}>
            {create.isPending ? 'Salvando…' : 'Criar venda'}
          </Btn>
        </div>
      </aside>
    </>
  )
}

const inputCls =
  'w-full mt-1 h-9 px-3 rounded-md text-[13px] focus:outline-none focus:ring-1'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px]" style={{ color: NEX.textDim }}>{label}</label>
      <div className="mt-1" style={{}}>
        <div style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6 }}>
          <div className="[&>input]:bg-transparent [&>input]:w-full [&>input]:h-9 [&>input]:px-3 [&>input]:text-[13px] [&>input]:focus:outline-none [&>select]:bg-transparent [&>select]:w-full [&>select]:h-9 [&>select]:px-3 [&>select]:text-[13px] [&>select]:focus:outline-none [&>textarea]:bg-transparent [&>textarea]:w-full [&>textarea]:px-3 [&>textarea]:py-2 [&>textarea]:text-[13px] [&>textarea]:focus:outline-none" style={{ color: NEX.text }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
