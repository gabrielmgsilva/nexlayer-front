import { lazy, Suspense, useEffect, useMemo, useRef, useState, Component, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Btn, Money, Icon, Icons, NEX, ProductThumb, Bar } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { categoriesService, domainService, productsService, salesChannelService } from '@/services/entities.service'
import type { Category, Color, CostSnapshot, Product, ProductVariation, SalesChannel } from '@/types/api.types'

type Filter = 'all' | 'kit' | 'low' | 'inactive'
type ProductPrintFile = Product['printFiles'][number]
type KitItemForm = { productId: string; quantity: string }

// Retry once antes de deixar o ErrorBoundary tratar — cobre erros de rede transitórios
const ModelPreviewModal = lazy(() =>
  import('@/components/products/model-preview-modal').catch(() =>
    import('@/components/products/model-preview-modal'),
  ),
)

// ErrorBoundary para chunk load failures (deploy Vercel invalida hashes antigos)
class ModelLoadErrorBoundary extends Component<
  { onClose: () => void; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { onClose: () => void; children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() { return { hasError: true } }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0" style={{ background: 'rgba(3, 8, 14, 0.78)' }} onClick={this.props.onClose} />
        <div className="relative rounded-xl p-6 space-y-4 max-w-sm w-full text-center" style={{ background: 'var(--nex-surface)', border: '1px solid var(--nex-border)' }}>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--nex-text)' }}>Falha ao carregar o visualizador 3D</div>
          <div className="text-[12.5px]" style={{ color: 'var(--nex-text-dim)' }}>
            O arquivo do visualizador não pôde ser carregado. Isso pode acontecer após uma atualização do sistema.
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md text-[12.5px] font-medium"
              style={{ background: 'var(--nex-cyan)', color: '#001F26' }}
            >
              Recarregar página
            </button>
            <button
              onClick={this.props.onClose}
              className="px-4 py-2 rounded-md text-[12.5px]"
              style={{ background: 'var(--nex-surface-2)', color: 'var(--nex-text-dim)', border: '1px solid var(--nex-border)' }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }
}

function isPreviewSupportedFile(file: ProductPrintFile) {
  const format = file.format?.toLowerCase()
  return (
    format === '3mf' ||
    format === 'stl' ||
    format === 'slt' ||
    file.url.toLowerCase().endsWith('.3mf') ||
    file.url.toLowerCase().endsWith('.stl') ||
    file.url.toLowerCase().endsWith('.slt')
  )
}

function formatUploadedAt(iso?: string) {
  if (!iso) return 'sem data'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function getApiMessage(err: unknown, fallback: string) {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  if (Array.isArray(message)) return message[0] ?? fallback
  return message ?? fallback
}

function parseOptionalInt(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  return Math.trunc(parsed)
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [isKit, setIsKit] = useState(false)
  const [estimatedPrintTimeMinutes, setEstimatedPrintTimeMinutes] = useState('60')
  const [estimatedMaterialG, setEstimatedMaterialG] = useState('50')
  const [piecesPerPrint, setPiecesPerPrint] = useState('1')
  const [recommendedFilamentTypeId, setRecommendedFilamentTypeId] = useState('')
  const [recommendedLayerHeightMm, setRecommendedLayerHeightMm] = useState('')
  const [recommendedInfillPercent, setRecommendedInfillPercent] = useState('')
  const [supportsRequired, setSupportsRequired] = useState(false)
  const [stockQuantity, setStockQuantity] = useState('0')
  const [minStockAlert, setMinStockAlert] = useState('')
  const [sellingPrice, setSellingPrice] = useState(0)
  const [channelPrices, setChannelPrices] = useState<Record<string, number>>({})
  const [isActive, setIsActive] = useState(true)
  const [kitItems, setKitItems] = useState<KitItemForm[]>([])

  const { data: res } = useQuery({
    queryKey: ['products', 'list', 'full'],
    queryFn: () => productsService.findAll({ limit: 200 }),
  })
  const all: Product[] = res?.data ?? []
  const focusEditId = searchParams.get('edit') ?? ''

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'list', 'active', 'products'],
    queryFn: () => categoriesService.findAll({ active: true }),
  })

  const { data: filamentTypes = [] } = useQuery({
    queryKey: ['domain', 'filament-types', 'products'],
    queryFn: () => domainService.getFilamentTypes(),
  })

  const { data: colors = [] } = useQuery({
    queryKey: ['domain', 'colors', 'products'],
    queryFn: () => domainService.getColors(),
  })

  const { data: salesChannels = [] } = useQuery({
    queryKey: ['sales', 'channels', 'products-pricing'],
    queryFn: () => salesChannelService.findAll({ includeInactive: true }),
  })

  const selectableKitProducts = useMemo(
    () => all.filter((p) => p.id !== editingId),
    [all, editingId],
  )

  const list = all.filter((p) => {
    if (filter === 'kit') { if (!p.isKit) return false }
    else if (filter === 'low') { if (!(p.minStockAlert !== undefined && p.stockQuantity <= p.minStockAlert)) return false }
    else if (filter === 'inactive') { if (p.isActive) return false }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setSku('')
    setCategoryId('')
    setDescription('')
    setIsKit(false)
    setEstimatedPrintTimeMinutes('60')
    setEstimatedMaterialG('50')
    setPiecesPerPrint('1')
    setRecommendedFilamentTypeId('')
    setRecommendedLayerHeightMm('')
    setRecommendedInfillPercent('')
    setSupportsRequired(false)
    setStockQuantity('0')
    setMinStockAlert('')
    setSellingPrice(0)
    setChannelPrices({})
    setIsActive(true)
    setKitItems([])
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setName(product.name)
    setSku(product.sku ?? '')
    setCategoryId(product.categoryId)
    setDescription(product.description ?? '')
    setIsKit(product.isKit)
    setEstimatedPrintTimeMinutes(String(product.estimatedPrintTimeMinutes ?? 0))
    setEstimatedMaterialG(String(Number(product.estimatedMaterialG ?? 0)))
    setPiecesPerPrint(String(product.piecesPerPrint ?? 1))
    setRecommendedFilamentTypeId(product.recommendedFilamentTypeId ?? '')
    setRecommendedLayerHeightMm(product.recommendedLayerHeightMm != null ? String(Number(product.recommendedLayerHeightMm)) : '')
    setRecommendedInfillPercent(product.recommendedInfillPercent != null ? String(product.recommendedInfillPercent) : '')
    setSupportsRequired(Boolean(product.supportsRequired))
    setStockQuantity(String(product.stockQuantity ?? 0))
    setMinStockAlert(product.minStockAlert != null ? String(product.minStockAlert) : '')
    setSellingPrice(Number(product.sellingPrice) || 0)
    const nextChannelPrices: Record<string, number> = {}
    for (const entry of product.channelPrices ?? []) {
      nextChannelPrices[entry.channelId] = Number(entry.price) || 0
    }
    setChannelPrices(nextChannelPrices)
    setIsActive(product.isActive)
    setKitItems((product.kitItems ?? []).map((item) => ({
      productId: item.productId,
      quantity: String(item.quantity),
    })))
    setDrawerOpen(true)
  }

  useEffect(() => {
    if (!focusEditId || all.length === 0) return
    const target = all.find((item) => item.id === focusEditId)
    if (!target) return
    startEdit(target)

    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    setSearchParams(next, { replace: true })
  }, [focusEditId, all, searchParams, setSearchParams])

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: Record<string, unknown> }) =>
      payload.id
        ? productsService.update(payload.id, payload.data)
        : productsService.create(payload.data),
    onSuccess: (_data, payload) => {
      toast.success(payload.id ? 'Produto alterado' : 'Produto criado')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      resetForm()
      setDrawerOpen(false)
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar produto')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => {
      toast.success('Produto excluído')
      setPendingDelete(null)
      if (editingId === pendingDelete?.id) resetForm()
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao excluir produto')),
  })

  const canSubmit = useMemo(() => {
    if (!name.trim() || !categoryId) return false

    if (isKit) {
      const validKitItems = kitItems.filter((item) => item.productId && Number(item.quantity) > 0)
      return validKitItems.length > 0
    }

    return (
      Number(estimatedPrintTimeMinutes) > 0 &&
      Number(estimatedMaterialG) > 0 &&
      Number(piecesPerPrint) > 0
    )
  }, [
    name,
    categoryId,
    isKit,
    kitItems,
    estimatedPrintTimeMinutes,
    estimatedMaterialG,
    piecesPerPrint,
  ])

  const submit = () => {
    if (!canSubmit) {
      toast.error(isKit
        ? 'Adicione pelo menos um componente para o kit.'
        : 'Preencha os campos obrigatórios do produto.')
      return
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      categoryId,
      isKit,
      isActive,
      stockQuantity: Math.max(0, parseOptionalInt(stockQuantity) ?? 0),
      sellingPrice: Math.max(0, sellingPrice || 0),
    }

    if (salesChannels.length > 0) {
      payload.channelPrices = salesChannels.map((channel) => ({
        channelId: channel.id,
        price: Math.max(0, Number(channelPrices[channel.id] ?? sellingPrice ?? 0) || 0),
      }))
    }

    if (sku.trim()) payload.sku = sku.trim()
    if (description.trim()) payload.description = description.trim()
    if (recommendedFilamentTypeId) payload.recommendedFilamentTypeId = recommendedFilamentTypeId

    const nextLayer = parseOptionalNumber(recommendedLayerHeightMm)
    if (nextLayer !== undefined) payload.recommendedLayerHeightMm = Math.max(nextLayer, 0)

    const nextInfill = parseOptionalInt(recommendedInfillPercent)
    if (nextInfill !== undefined) payload.recommendedInfillPercent = Math.max(nextInfill, 0)

    payload.supportsRequired = supportsRequired

    const nextMinStock = parseOptionalInt(minStockAlert)
    if (nextMinStock !== undefined) payload.minStockAlert = Math.max(nextMinStock, 0)

    if (isKit) {
      const normalizedKitItems = kitItems
        .filter((item) => item.productId && Number(item.quantity) > 0)
        .map((item, index) => ({
          productId: item.productId,
          quantity: Math.max(1, parseOptionalInt(item.quantity) ?? 1),
          sortOrder: index,
        }))

      payload.kitItems = normalizedKitItems
    } else {
      payload.estimatedPrintTimeMinutes = Math.max(1, parseOptionalInt(estimatedPrintTimeMinutes) ?? 1)
      payload.estimatedMaterialG = Math.max(0.1, parseOptionalNumber(estimatedMaterialG) ?? 0.1)
      payload.piecesPerPrint = Math.max(1, parseOptionalInt(piecesPerPrint) ?? 1)
      if (editingId) payload.kitItems = []
    }

    save.mutate({ id: editingId ?? undefined, data: payload })
  }

  const addKitItem = () => {
    setKitItems((prev) => [...prev, { productId: '', quantity: '1' }])
  }

  const updateKitItem = (index: number, patch: Partial<KitItemForm>) => {
    setKitItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeKitItem = (index: number) => {
    setKitItems((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-md w-fit" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          {(['all', 'kit', 'low', 'inactive'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded text-[12px] font-medium"
              style={{
                background: filter === f ? NEX.cyanDim : 'transparent',
                color: filter === f ? NEX.cyan : NEX.textDim,
              }}
            >
              {f === 'all' && 'Todos'}
              {f === 'kit' && 'Kits'}
              {f === 'low' && 'Estoque baixo'}
              {f === 'inactive' && 'Inativos'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 h-8 px-3 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..." className="bg-transparent text-[12.5px] focus:outline-none w-44" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <span className="text-[11px]" style={{ color: NEX.textMute }}>{list.length} produtos</span>
        <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Novo produto</Btn>
      </div>

      <div>
        <Card padding={false}>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
                <th className="text-left px-4 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Produto</th>
                <th className="text-left px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Categoria</th>
                <th className="text-left px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Tipo</th>
                <th className="text-right px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Estoque</th>
                <th className="text-right px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Preço</th>
                <th className="text-right px-4 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[12px]" style={{ color: NEX.textMute }}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
              {list.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  colors={colors}
                  onEdit={startEdit}
                  onDelete={setPendingDelete}
                />
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Alterar produto' : 'Novo produto'} width={520}>
        <div className="space-y-2.5">
            <FormField label="Nome" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nome do produto" />
            </FormField>

            <div className="grid grid-cols-2 gap-2">
              <FormField label="SKU">
                <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls + ' font-mono'} placeholder="PROD-001" />
              </FormField>
              <FormField label="Categoria" required>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                  <option value="">Selecionar...</option>
                  {categories.map((cat: Category) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Descrição">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls + ' h-auto py-2'}
                placeholder="Descrição opcional"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-2">
              <FormField label="Estoque inicial">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className={inputCls + ' text-right tabular-nums'}
                />
              </FormField>
              <FormField label="Alerta mínimo">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                  className={inputCls + ' text-right tabular-nums'}
                />
              </FormField>
            </div>

            <FormField label="Preço de venda (R$)">
              <DecimalRtlInput value={sellingPrice} onValueChange={setSellingPrice} min={0} className={inputCls + ' text-right tabular-nums'} />
            </FormField>

            <div className="rounded-md p-2.5" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
              <div className="text-[11px] font-medium mb-2" style={{ color: NEX.textDim }}>
                Preço por canal de venda
              </div>

              {salesChannels.length === 0 ? (
                <div className="text-[11px]" style={{ color: NEX.textMute }}>
                  Cadastre canais em Configurações para definir preços específicos.
                </div>
              ) : (
                <div className="space-y-2">
                  {salesChannels.map((channel: SalesChannel) => (
                    <div key={channel.id} className="grid grid-cols-[1fr_140px] gap-2 items-center">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-[11.5px] font-medium truncate">{channel.name}</span>
                        <Pill tone={channel.isActive ? 'green' : 'default'}>
                          {channel.isActive ? 'Ativo' : 'Inativo'}
                        </Pill>
                      </div>
                      <DecimalRtlInput
                        value={Number(channelPrices[channel.id] ?? sellingPrice ?? 0)}
                        onValueChange={(next) => {
                          setChannelPrices((prev) => ({
                            ...prev,
                            [channel.id]: Math.max(0, Number(next) || 0),
                          }))
                        }}
                        min={0}
                        className={inputCls + ' text-right tabular-nums'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md px-3 py-2" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
              <label className="inline-flex items-center gap-2 text-[12px]">
                <input type="checkbox" checked={isKit} onChange={(e) => setIsKit(e.target.checked)} />
                <span>Produto é kit</span>
              </label>
            </div>

            {isKit ? (
              <div className="space-y-2 rounded-md p-2.5" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                <div className="text-[11px] font-medium" style={{ color: NEX.textDim }}>Componentes do kit *</div>

                {kitItems.length === 0 && (
                  <div className="text-[11px]" style={{ color: NEX.textMute }}>Nenhum componente adicionado.</div>
                )}

                {kitItems.map((item, index) => (
                  <div key={`${index}-${item.productId}`} className="grid grid-cols-[1fr_88px_32px] gap-1.5 items-center">
                    <div style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, borderRadius: 6 }}>
                      <select
                        value={item.productId}
                        onChange={(e) => updateKitItem(index, { productId: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Selecionar produto...</option>
                        {selectableKitProducts.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, borderRadius: 6 }}>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(e) => updateKitItem(index, { quantity: e.target.value })}
                        className={inputCls + ' text-right tabular-nums'}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeKitItem(index)}
                      className="h-8 w-8 rounded-md flex items-center justify-center"
                      style={{ color: NEX.red, border: `1px solid ${NEX.border}` }}
                    >
                      <Icon d={Icons.x} size={12} />
                    </button>
                  </div>
                ))}

                <Btn kind="soft" size="sm" icon={Icons.plus} onClick={addKitItem}>Adicionar componente</Btn>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Tempo de impressão (min)" required>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={estimatedPrintTimeMinutes}
                      onChange={(e) => setEstimatedPrintTimeMinutes(e.target.value)}
                      className={inputCls + ' text-right tabular-nums'}
                    />
                  </FormField>
                  <FormField label="Material por impressão (g)" required>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={estimatedMaterialG}
                      onChange={(e) => setEstimatedMaterialG(e.target.value)}
                      className={inputCls + ' text-right tabular-nums'}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Peças por impressão" required>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={piecesPerPrint}
                      onChange={(e) => setPiecesPerPrint(e.target.value)}
                      className={inputCls + ' text-right tabular-nums'}
                    />
                  </FormField>
                  <FormField label="Filamento recomendado">
                    <select value={recommendedFilamentTypeId} onChange={(e) => setRecommendedFilamentTypeId(e.target.value)} className={inputCls}>
                      <option value="">Opcional...</option>
                      {filamentTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Altura de camada (mm)">
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={recommendedLayerHeightMm}
                      onChange={(e) => setRecommendedLayerHeightMm(e.target.value)}
                      className={inputCls + ' text-right tabular-nums'}
                    />
                  </FormField>
                  <FormField label="Infill recomendado (%)">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={recommendedInfillPercent}
                      onChange={(e) => setRecommendedInfillPercent(e.target.value)}
                      className={inputCls + ' text-right tabular-nums'}
                    />
                  </FormField>
                </div>

                <div className="rounded-md px-3 py-2" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                  <label className="inline-flex items-center gap-2 text-[12px]">
                    <input type="checkbox" checked={supportsRequired} onChange={(e) => setSupportsRequired(e.target.checked)} />
                    <span>Requer suporte na impressão</span>
                  </label>
                </div>
              </>
            )}

            <div className="rounded-md px-3 py-2" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
              <label className="inline-flex items-center gap-2 text-[12px]">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <span>Produto ativo</span>
              </label>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Btn
                kind="primary"
                size="md"
                icon={editingId ? Icons.check : Icons.plus}
                className="w-full justify-center"
                disabled={!canSubmit || save.isPending}
                onClick={submit}
              >
                {editingId ? 'Salvar alterações' : 'Criar produto'}
              </Btn>
              <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>
                Cancelar
              </Btn>
            </div>
          </div>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Excluir produto?"
        description={pendingDelete
          ? `Esta ação remove o produto "${pendingDelete.name}".`
          : 'Esta ação remove o produto selecionado.'}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate(pendingDelete.id)
        }}
      />
    </div>
  )
}

function ProductRow({
  product,
  colors,
  onEdit,
  onDelete,
}: {
  product: Product
  colors: Color[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}) {
  const [open, setOpen] = useState(false)
  const isLow = product.minStockAlert !== undefined && product.stockQuantity <= product.minStockAlert
  const primaryPhoto = product.photos?.find((ph) => ph.is_primary)?.url ?? product.photos?.[0]?.url

  return (
    <>
      <tr
        style={{ borderTop: `1px solid ${NEX.border}` }}
        className="cursor-pointer hover:bg-[#11161E]"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <ProductThumb id={product.id} name={product.name} photoUrl={primaryPhoto} size={36} />
            <div>
              <div className="font-semibold flex items-center gap-2 flex-wrap">
                {product.name}
                {!product.isActive && <Pill tone="default">Inativo</Pill>}
                {product.pricingTemplateId && <Pill tone="violet">Template: {product.pricingTemplate?.name ?? '—'}</Pill>}
              </div>
              {product.sku && <div className="text-[10.5px] font-mono" style={{ color: NEX.textMute }}>{product.sku}</div>}
            </div>
          </div>
        </td>
        <td className="px-2"><Pill tone="default">{product.category?.name ?? '—'}</Pill></td>
        <td className="px-2">
          {product.isKit
            ? <Pill tone="violet">Kit · {product.kitItems?.length ?? 0}</Pill>
            : <span style={{ color: NEX.textMute }}>Padrão</span>}
        </td>
        <td className="px-2 text-right">
          <span className="font-mono font-semibold" style={{ color: isLow ? NEX.amber : NEX.text }}>{product.stockQuantity}</span>
          {product.minStockAlert !== undefined && (
            <span className="text-[10.5px]" style={{ color: NEX.textMute }}> / {product.minStockAlert}</span>
          )}
        </td>
        <td className="px-2 text-right">
          {product.sellingPrice
            ? <Money value={product.sellingPrice} className="font-semibold" />
            : <span style={{ color: NEX.textMute }}>—</span>}
        </td>
        <td className="px-4 text-right">
          <div className="inline-flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(product)
              }}
              className="text-[11px]"
              style={{ color: NEX.cyan }}
            >
              Alterar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(product)
              }}
              className="text-[11px]"
              style={{ color: NEX.red }}
            >
              Excluir
            </button>
            <Icon d={Icons.chevD} size={13} style={{ color: NEX.textMute, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </div>
        </td>
      </tr>

      {open && (
        <tr style={{ borderTop: `1px solid ${NEX.border}`, background: NEX.bg }}>
          <td colSpan={6} className="px-4 py-4">
            <ProductDetails productId={product.id} fallbackProduct={product} colors={colors} />
          </td>
        </tr>
      )}
    </>
  )
}

function ProductDetails({
  productId,
  fallbackProduct,
  colors,
}: {
  productId: string
  fallbackProduct: Product
  colors: Color[]
}) {
  const queryClient = useQueryClient()

  const { data: product = fallbackProduct } = useQuery<Product>({
    queryKey: ['products', productId, 'detail'],
    queryFn: () => productsService.findOne(productId),
    initialData: fallbackProduct,
  })

  const { data: snapshot } = useQuery<CostSnapshot | null>({
    queryKey: ['products', productId, 'snapshot'],
    queryFn: () => productsService.getLatestCostSnapshot(productId),
  })

  const [previewFile, setPreviewFile] = useState<ProductPrintFile | null>(null)
  const [uploadAsPrimary, setUploadAsPrimary] = useState(false)
  const [isUploadingModels, setIsUploadingModels] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const modelInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingRemovePhoto, setPendingRemovePhoto] = useState<string | null>(null)
  const [pendingRemovePrintFile, setPendingRemovePrintFile] = useState<string | null>(null)

  const [variationEditingId, setVariationEditingId] = useState<string | null>(null)
  const [variationName, setVariationName] = useState('')
  const [variationSku, setVariationSku] = useState('')
  const [variationColorId, setVariationColorId] = useState('')
  const [variationHasSellingPrice, setVariationHasSellingPrice] = useState(false)
  const [variationSellingPrice, setVariationSellingPrice] = useState(0)
  const [variationStockQuantity, setVariationStockQuantity] = useState('0')
  const [variationMinStockAlert, setVariationMinStockAlert] = useState('')
  const [variationSortOrder, setVariationSortOrder] = useState('0')
  const [variationNotes, setVariationNotes] = useState('')
  const [variationIsActive, setVariationIsActive] = useState(true)
  const [pendingDeleteVariation, setPendingDeleteVariation] = useState<ProductVariation | null>(null)

  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const uploadPhoto = useMutation({
    mutationFn: (payload: { file: File; isPrimary: boolean }) => productsService.uploadPhoto(productId, payload.file, payload.isPrimary),
    onSuccess: () => {
      toast.success('Foto enviada')
      refreshProducts()
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha no upload da foto')),
  })

  const uploadModel = useMutation({
    mutationFn: (file: File) => productsService.uploadModel(productId, file),
  })

  const removePhoto = useMutation({
    mutationFn: (url: string) => productsService.removePhoto(productId, url),
    onSuccess: () => {
      toast.success('Foto removida')
      setPendingRemovePhoto(null)
      refreshProducts()
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover foto')),
  })

  const removePrintFile = useMutation({
    mutationFn: (url: string) => productsService.removePrintFile(productId, url),
    onSuccess: () => {
      toast.success('Arquivo removido')
      setPendingRemovePrintFile(null)
      refreshProducts()
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover arquivo')),
  })

  const saveVariation = useMutation({
    mutationFn: (payload: { varId?: string; data: Record<string, unknown> }) =>
      payload.varId
        ? productsService.updateVariation(productId, payload.varId, payload.data)
        : productsService.createVariation(productId, payload.data),
    onSuccess: (_data, payload) => {
      toast.success(payload.varId ? 'Variação alterada' : 'Variação criada')
      resetVariationForm()
      refreshProducts()
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar variação')),
  })

  const removeVariation = useMutation({
    mutationFn: (varId: string) => productsService.removeVariation(productId, varId),
    onSuccess: () => {
      toast.success('Variação removida')
      setPendingDeleteVariation(null)
      resetVariationForm()
      refreshProducts()
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover variação')),
  })

  const resetVariationForm = () => {
    setVariationEditingId(null)
    setVariationName('')
    setVariationSku('')
    setVariationColorId('')
    setVariationHasSellingPrice(false)
    setVariationSellingPrice(0)
    setVariationStockQuantity('0')
    setVariationMinStockAlert('')
    setVariationSortOrder('0')
    setVariationNotes('')
    setVariationIsActive(true)
  }

  const startEditVariation = (variation: ProductVariation) => {
    setVariationEditingId(variation.id)
    setVariationName(variation.name)
    setVariationSku(variation.sku ?? '')
    setVariationColorId(variation.colorId ?? '')
    setVariationHasSellingPrice(variation.sellingPrice != null)
    setVariationSellingPrice(variation.sellingPrice != null ? Number(variation.sellingPrice) : 0)
    setVariationStockQuantity(String(variation.stockQuantity ?? 0))
    setVariationMinStockAlert(variation.minStockAlert != null ? String(variation.minStockAlert) : '')
    setVariationSortOrder(String(variation.sortOrder ?? 0))
    setVariationNotes(variation.notes ?? '')
    setVariationIsActive(variation.isActive)
  }

  const submitVariation = () => {
    if (!variationName.trim()) {
      toast.error('Informe o nome da variação')
      return
    }

    const payload: Record<string, unknown> = {
      name: variationName.trim(),
      stockQuantity: Math.max(0, parseOptionalInt(variationStockQuantity) ?? 0),
      sortOrder: Math.max(0, parseOptionalInt(variationSortOrder) ?? 0),
      isActive: variationIsActive,
    }

    if (variationSku.trim()) payload.sku = variationSku.trim()
    if (variationColorId) payload.colorId = variationColorId

    if (variationHasSellingPrice) {
      payload.sellingPrice = Math.max(0, Number(variationSellingPrice) || 0)
    } else if (variationEditingId) {
      payload.sellingPrice = null
    }

    const nextVariationMinAlert = parseOptionalInt(variationMinStockAlert)
    if (nextVariationMinAlert !== undefined) payload.minStockAlert = Math.max(0, nextVariationMinAlert)

    if (variationNotes.trim()) payload.notes = variationNotes.trim()

    saveVariation.mutate({ varId: variationEditingId ?? undefined, data: payload })
  }

  const onPhotoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    uploadPhoto.mutate({ file, isPrimary: uploadAsPrimary })
    event.target.value = ''
  }

  const onModelSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0) return

    let successCount = 0
    let failCount = 0
    let firstErrorMessage: string | null = null

    setIsUploadingModels(true)

    try {
      const results = await Promise.allSettled(files.map((file) => uploadModel.mutateAsync(file)))

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successCount += 1
          continue
        }

        failCount += 1
        if (!firstErrorMessage) {
          firstErrorMessage = getApiMessage(result.reason, 'Falha no upload de um arquivo 3D')
        }
      }

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? '1 arquivo 3D enviado'
            : `${successCount} arquivos 3D enviados`,
        )
      }

      if (failCount > 0) {
        toast.error(
          firstErrorMessage
            ? `${firstErrorMessage} (${failCount} falha${failCount > 1 ? 's' : ''})`
            : `${failCount} arquivo${failCount > 1 ? 's' : ''} falhou(aram) no upload`,
        )
      }

      if (successCount > 0) {
        refreshProducts()
      }
    } finally {
      setIsUploadingModels(false)
    }
  }

  const variations = product.variations ?? []
  const sortedChannelPrices = [...(product.channelPrices ?? [])].sort((a, b) => {
    const nameA = a.channel?.name ?? ''
    const nameB = b.channel?.name ?? ''
    return nameA.localeCompare(nameB)
  })
  const photos = product.photos ?? []
  const printFiles = product.printFiles ?? []

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>Especificações</div>
        <div className="space-y-1.5 text-[12px]">
          <Row label="Tipo" value={product.isKit ? 'Kit' : 'Padrão'} />
          <Row label="Tempo de impressão" value={`${product.estimatedPrintTimeMinutes} min`} />
          <Row label="Material por impressão" value={`${product.estimatedMaterialG} g`} />
          <Row label="Peças por impressão" value={String(product.piecesPerPrint)} />
          {product.recommendedFilamentType?.name && (
            <Row label="Filamento recomendado" value={product.recommendedFilamentType.name} />
          )}
          {product.recommendedLayerHeightMm !== undefined && (
            <Row label="Camada" value={`${product.recommendedLayerHeightMm} mm`} />
          )}
          {product.recommendedInfillPercent !== undefined && (
            <Row label="Infill" value={`${product.recommendedInfillPercent}%`} />
          )}
          <Row label="Suporte" value={product.supportsRequired ? 'Requer' : 'Opcional'} />
          {product.description && (
            <div className="pt-2 text-[11px]" style={{ color: NEX.textDim }}>{product.description}</div>
          )}
        </div>
      </Card>

      <Card>
        <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>Último custo calculado</div>
        {snapshot ? (
          <div className="space-y-1.5 text-[12px]">
            <Row label="Custo / un" value={<Money value={snapshot.unitCostWithError} />} />
            <Row label="Preço / un" value={<Money value={snapshot.unitSalePrice} />} />
            <Row label="Lucro / un" value={<span style={{ color: NEX.green }}><Money value={snapshot.unitProfit} /></span>} />
            <Row label="Margem" value={`${(snapshot.profitMargin * 100).toFixed(1)}%`} />
            <Row label="Material" value={snapshot.materialName} />
            <div className="text-[10.5px] mt-2" style={{ color: NEX.textMute }}>
              {new Date(snapshot.createdAt).toLocaleDateString('pt-BR')} · v{snapshot.version}
            </div>
          </div>
        ) : (
          <div className="py-2 text-[12px]" style={{ color: NEX.textMute }}>Sem snapshot — calcule este produto na calculadora.</div>
        )}

        {sortedChannelPrices.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${NEX.border}` }}>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>
              Preços por canal
            </div>
            <div className="space-y-1.5 text-[12px]">
              {sortedChannelPrices.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2">
                  <span className="truncate" style={{ color: NEX.textDim }}>
                    {entry.channel?.name ?? 'Canal'}
                  </span>
                  <span className="font-semibold"><Money value={Number(entry.price)} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>
          {product.isKit ? `Componentes do kit · ${product.kitItems?.length ?? 0}` : `Variações · ${variations.length}`}
        </div>

        {product.isKit ? (
          <div className="space-y-1.5 text-[12px]">
            {(product.kitItems ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <ProductThumb id={item.product.id} name={item.product.name} size={20} />
                <span className="flex-1 truncate">{item.product.name}</span>
                <span className="font-mono font-semibold">{item.quantity}x</span>
              </div>
            ))}
            {(product.kitItems ?? []).length === 0 && <div style={{ color: NEX.textMute }}>Nenhum componente.</div>}
          </div>
        ) : (
          <div className="space-y-2">
            {variations.length === 0 ? (
              <div className="text-[12px]" style={{ color: NEX.textMute }}>Nenhuma variação cadastrada.</div>
            ) : (
              <div className="space-y-1.5">
                {variations.map((variation) => {
                  const variationLow = variation.minStockAlert !== undefined && variation.stockQuantity <= variation.minStockAlert
                  return (
                    <div key={variation.id} className="rounded-md px-2.5 py-2" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                      <div className="flex items-center gap-2">
                        {variation.color?.hexCode && <span className="h-2.5 w-2.5 rounded-full" style={{ background: variation.color.hexCode }} />}
                        <span className="flex-1 truncate text-[12px] font-medium">{variation.name}</span>
                        {!variation.isActive && <Pill tone="default">Inativa</Pill>}
                        <span className="font-mono font-semibold text-[12px]" style={{ color: variationLow ? NEX.amber : NEX.text }}>
                          {variation.stockQuantity}
                        </span>
                        <div className="w-12">
                          <Bar value={Math.min(100, variation.stockQuantity * 5)} tone={variationLow ? 'amber' : 'green'} height={3} />
                        </div>
                      </div>
                      <div className="mt-1 text-[10.5px]" style={{ color: NEX.textMute }}>
                        Preço:{' '}
                        {variation.sellingPrice != null
                          ? <span className="font-semibold" style={{ color: NEX.text }}><Money value={variation.sellingPrice} /></span>
                          : 'usa preço base do produto'}
                      </div>
                      <div className="mt-2 flex justify-end gap-3 text-[11px]">
                        <button onClick={() => startEditVariation(variation)} style={{ color: NEX.cyan }}>Alterar</button>
                        <button onClick={() => setPendingDeleteVariation(variation)} style={{ color: NEX.red }}>Excluir</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-2" style={{ borderTop: `1px solid ${NEX.border}` }}>
              <div className="text-[11px] font-medium mb-1.5" style={{ color: NEX.textDim }}>
                {variationEditingId ? 'Alterar variação' : 'Nova variação'}
              </div>

              <div className="space-y-1.5">
                <div className="text-[10.5px]" style={{ color: NEX.textMute }}>
                  Campos com * são obrigatórios.
                </div>

                <FormField label="Nome da variação" required>
                  <input
                    value={variationName}
                    onChange={(e) => setVariationName(e.target.value)}
                    className={inputCls}
                    placeholder="Ex.: Azul Fosco"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-1.5">
                  <FormField label="SKU (opcional)">
                    <input
                      value={variationSku}
                      onChange={(e) => setVariationSku(e.target.value)}
                      className={inputCls + ' font-mono'}
                      placeholder="Ex.: PROD-001-AZ"
                    />
                  </FormField>
                  <FormField label="Cor (opcional)">
                    <select value={variationColorId} onChange={(e) => setVariationColorId(e.target.value)} className={inputCls}>
                      <option value="">Selecionar cor...</option>
                      {colors.map((color) => (
                        <option key={color.id} value={color.id}>{color.name}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="rounded-md px-3 py-2" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                  <label className="inline-flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={variationHasSellingPrice}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setVariationHasSellingPrice(checked)
                        if (checked && variationSellingPrice <= 0 && product.sellingPrice != null) {
                          setVariationSellingPrice(Number(product.sellingPrice) || 0)
                        }
                      }}
                    />
                    <span>Usar preço próprio para esta variação</span>
                  </label>

                  {variationHasSellingPrice ? (
                    <div className="mt-2">
                      <FormField label="Preço da variação (R$)">
                        <DecimalRtlInput
                          value={variationSellingPrice}
                          onValueChange={(next) => setVariationSellingPrice(Math.max(0, next))}
                          min={0}
                          className={inputCls + ' text-right tabular-nums'}
                        />
                      </FormField>
                    </div>
                  ) : (
                    <div className="text-[10.5px] mt-1" style={{ color: NEX.textMute }}>
                      Sem preço próprio: a variação usa o preço base do produto.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <FormField label="Estoque inicial">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={variationStockQuantity}
                      onChange={(e) => setVariationStockQuantity(e.target.value)}
                      className={inputCls + ' text-right tabular-nums'}
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Alerta mínimo">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={variationMinStockAlert}
                      onChange={(e) => setVariationMinStockAlert(e.target.value)}
                      className={inputCls + ' text-right tabular-nums'}
                      placeholder="Opcional"
                    />
                  </FormField>
                  <FormField label="Ordem de exibição">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={variationSortOrder}
                      onChange={(e) => setVariationSortOrder(e.target.value)}
                      className={inputCls + ' text-right tabular-nums'}
                      placeholder="0"
                    />
                  </FormField>
                </div>

                <FormField label="Observações (opcional)">
                  <textarea
                    rows={2}
                    value={variationNotes}
                    onChange={(e) => setVariationNotes(e.target.value)}
                    className={inputCls + ' h-auto py-2'}
                    placeholder="Detalhes internos desta variação"
                  />
                </FormField>

                <label className="inline-flex items-center gap-2 text-[11px]">
                  <input type="checkbox" checked={variationIsActive} onChange={(e) => setVariationIsActive(e.target.checked)} />
                  <span>Variação ativa</span>
                </label>

                <div className="flex gap-1.5 pt-1">
                  {variationEditingId && (
                    <Btn kind="ghost" size="sm" className="flex-1 justify-center" onClick={resetVariationForm}>
                      Cancelar
                    </Btn>
                  )}
                  <Btn
                    kind="primary"
                    size="sm"
                    icon={variationEditingId ? Icons.check : Icons.plus}
                    className={(variationEditingId ? 'flex-1' : 'w-full') + ' justify-center'}
                    disabled={saveVariation.isPending || !variationName.trim()}
                    onClick={submitVariation}
                  >
                    {variationEditingId ? 'Salvar' : 'Criar variação'}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="col-span-3">
        <div className="flex flex-wrap items-center gap-2 justify-between mb-2">
          <div className="text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>
            Upload de arquivos
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: NEX.textDim }}>
              <input
                type="checkbox"
                checked={uploadAsPrimary}
                onChange={(e) => setUploadAsPrimary(e.target.checked)}
              />
              Foto principal
            </label>

            <Btn
              kind="soft"
              size="sm"
              icon={Icons.plus}
              disabled={uploadPhoto.isPending}
              onClick={() => photoInputRef.current?.click()}
            >
              {uploadPhoto.isPending ? 'Enviando foto...' : 'Enviar foto'}
            </Btn>

            <Btn
              kind="soft"
              size="sm"
              icon={Icons.plus}
              disabled={isUploadingModels}
              onClick={() => modelInputRef.current?.click()}
            >
              {isUploadingModels ? 'Enviando 3D...' : 'Enviar 3D'}
            </Btn>
          </div>
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onPhotoSelected}
        />
        <input
          ref={modelInputRef}
          type="file"
          accept=".stl,.3mf"
          multiple
          className="hidden"
          onChange={onModelSelected}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>
              Fotos · {photos.length}
            </div>

            {photos.length === 0 ? (
              <div className="text-[12px] py-2" style={{ color: NEX.textMute }}>Nenhuma foto anexada.</div>
            ) : (
              <div className="space-y-1.5">
                {photos.map((photo) => (
                  <div
                    key={photo.url}
                    className="rounded-md px-2.5 py-2 flex items-center gap-2"
                    style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}
                  >
                    <img src={photo.url} alt="Foto" className="h-10 w-10 rounded object-cover" />
                    <div className="flex-1 min-w-0 text-[11px] truncate" style={{ color: NEX.textDim }}>{photo.url}</div>
                    {photo.is_primary && <Pill tone="cyan">Principal</Pill>}
                    <button onClick={() => window.open(photo.url, '_blank', 'noopener,noreferrer')} className="text-[11px]" style={{ color: NEX.cyan }}>
                      Abrir
                    </button>
                    <button onClick={() => setPendingRemovePhoto(photo.url)} className="text-[11px]" style={{ color: NEX.red }}>
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>
              Arquivos 3D · {printFiles.length}
            </div>

            {printFiles.length === 0 ? (
              <div className="text-[12px] py-2" style={{ color: NEX.textMute }}>Nenhum arquivo anexado.</div>
            ) : (
              <div className="space-y-1.5">
                {printFiles.map((file) => {
                  const previewable = isPreviewSupportedFile(file)
                  return (
                    <div
                      key={`${file.url}-${file.filename}`}
                      className="rounded-md px-2.5 py-2.5 flex items-center gap-2"
                      style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}
                    >
                      <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
                        <Icon d={previewable ? Icons.cube : Icons.pkg} size={14} style={{ color: previewable ? NEX.cyan : NEX.textDim }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold truncate">{file.filename}</div>
                        <div className="text-[10.5px]" style={{ color: NEX.textMute }}>
                          {file.format.toUpperCase()} · enviado em {formatUploadedAt(file.uploaded_at)}
                        </div>
                      </div>

                      {previewable && (
                        <button onClick={() => setPreviewFile(file)} className="text-[11px]" style={{ color: NEX.cyan }}>
                          Visualizar
                        </button>
                      )}

                      <button onClick={() => window.open(file.url, '_blank', 'noopener,noreferrer')} className="text-[11px]" style={{ color: NEX.textDim }}>
                        Abrir
                      </button>
                      <button onClick={() => setPendingRemovePrintFile(file.url)} className="text-[11px]" style={{ color: NEX.red }}>
                        Excluir
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="col-span-3 flex justify-end gap-2">
        <Btn
          kind="primary"
          size="sm"
          icon={Icons.calc}
          onClick={() => { window.location.href = `/calculator?productId=${product.id}` }}
        >
          Calcular custo
        </Btn>
      </div>

      {previewFile && (
        <ModelLoadErrorBoundary onClose={() => setPreviewFile(null)}>
          <Suspense
            fallback={
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0" style={{ background: 'rgba(3, 8, 14, 0.78)' }} />
                <div
                  className="relative px-4 py-3 rounded-md text-[12px]"
                  style={{ background: NEX.surface, border: `1px solid ${NEX.border}`, color: NEX.textDim }}
                >
                  Carregando visualizador 3D...
                </div>
              </div>
            }
          >
            <ModelPreviewModal
              productId={product.id}
              file={previewFile}
              onClose={() => setPreviewFile(null)}
            />
          </Suspense>
        </ModelLoadErrorBoundary>
      )}

      <ConfirmDialog
        open={!!pendingRemovePhoto}
        onOpenChange={(open) => {
          if (!open) setPendingRemovePhoto(null)
        }}
        title="Excluir foto?"
        description="Esta ação remove a foto do produto."
        confirmLabel="Excluir"
        variant="danger"
        loading={removePhoto.isPending}
        onConfirm={() => {
          if (!pendingRemovePhoto) return
          removePhoto.mutate(pendingRemovePhoto)
        }}
      />

      <ConfirmDialog
        open={!!pendingRemovePrintFile}
        onOpenChange={(open) => {
          if (!open) setPendingRemovePrintFile(null)
        }}
        title="Excluir arquivo 3D?"
        description="Esta ação remove o arquivo de impressão do produto."
        confirmLabel="Excluir"
        variant="danger"
        loading={removePrintFile.isPending}
        onConfirm={() => {
          if (!pendingRemovePrintFile) return
          removePrintFile.mutate(pendingRemovePrintFile)
        }}
      />

      <ConfirmDialog
        open={!!pendingDeleteVariation}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteVariation(null)
        }}
        title="Excluir variação?"
        description={pendingDeleteVariation
          ? `Esta ação remove a variação "${pendingDeleteVariation.name}".`
          : 'Esta ação remove a variação selecionada.'}
        confirmLabel="Excluir"
        variant="danger"
        loading={removeVariation.isPending}
        onConfirm={() => {
          if (!pendingDeleteVariation) return
          removeVariation.mutate(pendingDeleteVariation.id)
        }}
      />
    </div>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>
        {label}{required ? ' *' : ''}
      </span>
      <div
        style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6, color: NEX.text }}
        className="[&>input]:bg-transparent [&>input]:w-full [&>input]:h-9 [&>input]:px-3 [&>input]:text-[13px] [&>input]:focus:outline-none [&>select]:bg-transparent [&>select]:w-full [&>select]:h-9 [&>select]:px-3 [&>select]:text-[13px] [&>select]:focus:outline-none [&>textarea]:bg-transparent [&>textarea]:w-full [&>textarea]:px-3 [&>textarea]:py-2 [&>textarea]:text-[13px] [&>textarea]:focus:outline-none"
      >
        {children}
      </div>
    </label>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span style={{ color: NEX.textDim }}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

const inputCls = 'w-full h-9 px-3 bg-transparent text-[13px] focus:outline-none'
