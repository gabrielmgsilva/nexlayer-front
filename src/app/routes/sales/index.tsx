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

  const { data: salesRes } = useQuery({
    queryKey: ['sales', 'list', statusFilter],
    queryFn: () => salesService.findAll({
      page: 1,
      limit: 100,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  })
  const sales: SaleOrder[] = salesRes?.data ?? []

  const counts = useMemo(() => {
    const all = salesRes?.meta?.total ?? sales.length
    return { all }
  }, [salesRes, sales])

  const newOpen = searchParams.get('new') === '1'

  return (
    <div className="px-8 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-md w-fit" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
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
        <div className="ml-auto">
          <Btn kind="primary" size="sm" icon={Icons.plus} onClick={() => setSearchParams({ new: '1' })}>
            Nova venda
          </Btn>
        </div>
      </div>

      <Card padding={false}>
        <table className="w-full text-[12.5px]">
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

  const { data: sale, isLoading } = useQuery<SaleOrder>({
    queryKey: ['sales', id],
    queryFn: () => salesService.findOne(id!),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: (status: SaleStatus) => salesService.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status atualizado')
      setPendingCancel(false)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
    onError: () => toast.error('Falha ao atualizar status'),
  })

  if (isLoading || !sale) return null

  const st = SALE_STATUS[sale.status] ?? SALE_STATUS.PENDING
  const subtotal = (sale.items ?? []).reduce((s, i) => s + Number(i.quantity ?? 0) * Number(i.unitPrice ?? 0), 0)
  const total = computeSaleTotal(sale)

  return (
    <>
      <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={() => navigate('/sales')} />
      <aside className="fixed top-0 right-0 bottom-0 z-40 flex flex-col" style={{ width: 480, background: NEX.surface, borderLeft: `1px solid ${NEX.border}` }}>
        <div className="px-5 py-4 flex items-center" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div>
            <div className="font-mono text-[11px]" style={{ color: NEX.textMute }}>{sale.orderNumber}</div>
            <div className="text-[15px] font-semibold mt-0.5">{sale.customer?.name ?? '—'}</div>
          </div>
          <Pill tone={st.tone} className="ml-3">{st.label}</Pill>
          <button
            onClick={() => navigate('/sales')}
            className="ml-auto h-8 w-8 rounded-md flex items-center justify-center hover:bg-[#11161E]"
          >
            <Icon d={Icons.x} size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
                      <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px dashed rgba(255, 181, 71, 0.3)' }}>
                        <Icon d={Icons.alert} size={12} style={{ color: NEX.amber }} />
                        <span className="text-[11.5px]">
                          <span className="font-semibold" style={{ color: NEX.amber }}>Aguardando produção</span>
                        </span>
                        <button
                          onClick={() => navigate(`/calculator?productId=${item.productId}&qty=${item.quantity}&order=${sale.orderNumber}`)}
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
        </div>

        <div className="px-5 py-4 flex gap-2" style={{ borderTop: `1px solid ${NEX.border}` }}>
          {sale.status === 'PENDING' && (
            <>
              <Btn kind="primary" size="md" icon={Icons.check} className="flex-1 justify-center" onClick={() => statusMutation.mutate('CONFIRMED')}>Confirmar venda</Btn>
              <Btn kind="ghost" size="md" icon={Icons.x} onClick={() => setPendingCancel(true)}>Cancelar</Btn>
            </>
          )}
          {sale.status === 'CONFIRMED' && (
            <Btn kind="primary" size="md" icon={Icons.truck} className="flex-1 justify-center" onClick={() => statusMutation.mutate('SHIPPED')}>
              Marcar como enviada
            </Btn>
          )}
          {sale.status === 'SHIPPED' && (
            <Btn kind="primary" size="md" icon={Icons.check} className="flex-1 justify-center" onClick={() => statusMutation.mutate('DELIVERED')}>
              Marcar como entregue
            </Btn>
          )}
          {(sale.status === 'DELIVERED' || sale.status === 'CANCELLED') && (
            <Btn kind="ghost" size="md" icon={Icons.download} className="flex-1 justify-center">Baixar comprovante</Btn>
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
function NewSaleDrawer({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [channelId, setChannelId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('')
  const [variationId, setVariationId] = useState('')
  const [qty, setQty] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)
  const [shippingCost, setShippingCost] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')

  const { data: channels = [] } = useQuery({ queryKey: ['sales', 'channels', 'active'], queryFn: () => salesChannelService.findAll() })
  const { data: customersRes } = useQuery({ queryKey: ['customers', 'options', 'active'], queryFn: () => customersService.findAll({ limit: 200, isActive: true }) })
  const customers = customersRes?.data ?? []
  const { data: productsRes } = useQuery({ queryKey: ['products', 'options'], queryFn: () => productsService.findAll({ limit: 200, isActive: true }) })
  const products = productsRes?.data ?? []
  const product = products.find((p) => p.id === productId)
  const variations = product?.variations ?? []

  // Default unit price from product
  useEffect(() => {
    if (product?.sellingPrice && !unitPrice) {
      setUnitPrice(Number(product.sellingPrice))
    }
  }, [product, unitPrice])

  // Default channel
  useEffect(() => {
    if (!channelId && channels.length > 0) setChannelId(channels[0].id)
  }, [channelId, channels])

  const create = useMutation({
    mutationFn: () => salesService.create({
      channelId,
      customerId: customerId || undefined,
      shippingCost: Number(shippingCost) || 0,
      discount: Number(discount) || 0,
      notes: notes || undefined,
      items: [
        {
          productId,
          variationId: variationId || undefined,
          quantity: Number(qty),
          unitPrice: Number(unitPrice),
        },
      ],
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

  const canSubmit = channelId && productId && qty > 0 && unitPrice >= 0

  return (
    <>
      <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-40 flex flex-col" style={{ width: 480, background: NEX.surface, borderLeft: `1px solid ${NEX.border}` }}>
        <div className="px-5 py-4 flex items-center" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[15px] font-semibold">Nova venda</div>
          <button onClick={onClose} className="ml-auto h-8 w-8 rounded-md flex items-center justify-center hover:bg-[#11161E]"><Icon d={Icons.x} size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[12.5px]">
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
          <Field label="Produto *">
            <select value={productId} onChange={(e) => { setProductId(e.target.value); setVariationId(''); setUnitPrice(0) }} className={inputCls}>
              <option value="">Selecionar…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          {variations.length > 0 && (
            <Field label="Variação">
              <select value={variationId} onChange={(e) => setVariationId(e.target.value)} className={inputCls}>
                <option value="">— sem variação —</option>
                {variations.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade *">
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} className={inputCls} />
            </Field>
            <Field label="Preço unit. (R$) *">
              <DecimalRtlInput value={unitPrice} onValueChange={setUnitPrice} min={0} className="h-9 px-3 text-[13px] text-right tabular-nums" />
            </Field>
            <Field label="Frete (R$)">
              <DecimalRtlInput value={shippingCost} onValueChange={setShippingCost} min={0} className="h-9 px-3 text-[13px] text-right tabular-nums" />
            </Field>
            <Field label="Desconto (R$)">
              <DecimalRtlInput value={discount} onValueChange={setDiscount} min={0} className="h-9 px-3 text-[13px] text-right tabular-nums" />
            </Field>
          </div>
          <Field label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls + ' h-auto py-2'} />
          </Field>
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
