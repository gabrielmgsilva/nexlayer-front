import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, Money, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { pricingTemplatesService, productsService, categoriesService } from '@/services/entities.service'
import type { PricingTemplate, TemplatePricePreview, Product } from '@/types/api.types'

const inputCls = 'w-full h-9 px-3 bg-transparent text-[13px] focus:outline-none'
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>{label}</span>
      <div style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6, color: NEX.text }}>{children}</div>
      {hint && <p className="text-[10.5px] mt-1" style={{ color: NEX.textMute }}>{hint}</p>}
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
  const m = (err as any)?.response?.data?.message
  return Array.isArray(m) ? m[0] ?? fallback : m ?? fallback
}

// ── Painel de criação de template ──────────────────────
function CreateTemplateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: productsRes } = useQuery({
    queryKey: ['products', 'list', 'for-templates'],
    queryFn: () => productsService.findAll({ limit: 200 }),
  })
  const products: Product[] = productsRes?.data ?? []

  const [productId, setProductId] = useState('')
  const [name, setName] = useState('')
  const [defaultMargin, setDefaultMargin] = useState('40')
  const [notes, setNotes] = useState('')

  const reset = () => { setProductId(''); setName(''); setDefaultMargin('40'); setNotes('') }

  const create = useMutation({
    mutationFn: () => pricingTemplatesService.create({
      productId, name: name.trim(),
      defaultMargin: Math.max(0, Math.min(0.99, Number(defaultMargin) / 100)),
      notes: notes.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Template criado')
      reset(); onClose()
      queryClient.invalidateQueries({ queryKey: ['pricing-templates'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao criar template')),
  })

  const createError = create.isError ? getApiMessage(create.error, 'Falha ao criar template') : null

  return (
    <Drawer open={open} onClose={() => { reset(); onClose() }} title="Novo template de precificação" error={createError}>
      <div className="space-y-4">
        <div className="rounded-lg px-3 py-2.5 text-[11.5px]" style={{ background: nexAlpha('cyan', 0.06), border: `1px solid ${nexAlpha('cyan', 0.20)}`, color: NEX.textDim }}>
          O produto âncora deve ter pelo menos um cálculo de custo feito na Calculadora.
        </div>
        <Field label="Produto âncora *" hint="As taxas R$/g e R$/min são extraídas do snapshot mais recente deste produto.">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls} autoFocus>
            <option value="">Selecione…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
          </select>
        </Field>
        <Field label="Nome do template *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: Cortadores de biscoito" />
        </Field>
        <Field label="Margem padrão (%)" hint="Aplicada automaticamente nos produtos derivados. Pode ser ajustada por produto.">
          <div className="flex items-center">
            <input type="number" min={0} max={99} value={defaultMargin} onChange={(e) => setDefaultMargin(e.target.value)} className={inputCls + ' text-right tabular-nums'} />
            <span className="px-3 text-[13px]" style={{ color: NEX.textDim }}>%</span>
          </div>
        </Field>
        <Field label="Observações">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[60px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" />
        </Field>
        <div className="flex flex-col gap-2 pt-1">
          <Btn kind="primary" size="md" icon={Icons.plus} className="w-full justify-center"
            disabled={!productId || !name.trim() || create.isPending}
            onClick={() => create.mutate()}>
            Criar template
          </Btn>
          <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => { reset(); onClose() }}>Cancelar</Btn>
        </div>
      </div>
    </Drawer>
  )
}

// ── Painel de derivação de produto ─────────────────────
function DeriveDrawer({ template, open, onClose }: { template: PricingTemplate | null; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: categories = [] } = useQuery({ queryKey: ['categories', 'list', 'active', 'templates'], queryFn: () => categoriesService.findAll({ active: true }) })

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState(template?.product?.category ? '' : '')
  const [materialG, setMaterialG] = useState('15')
  const [timeMin, setTimeMin] = useState('30')
  const [pieces, setPieces] = useState('1')
  const [margin, setMargin] = useState('')
  const [preview, setPreview] = useState<TemplatePricePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const reset = () => { setName(''); setSku(''); setCategoryId(''); setMaterialG('15'); setTimeMin('30'); setPieces('1'); setMargin(''); setPreview(null) }

  // Auto-preview quando os campos numéricos mudam
  useEffect(() => {
    if (!template || !materialG || !timeMin) return
    const t = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const m = margin ? Number(margin) / 100 : undefined
        const res = await pricingTemplatesService.preview(template.id, {
          estimatedMaterialG: Number(materialG),
          estimatedPrintTimeMinutes: Number(timeMin),
          piecesPerPrint: Number(pieces) || 1,
          margin: m,
        })
        setPreview(res as TemplatePricePreview)
      } catch { /* silencioso */ }
      finally { setPreviewLoading(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [template, materialG, timeMin, pieces, margin])

  const derive = useMutation({
    mutationFn: () => pricingTemplatesService.derive(template!.id, {
      name: name.trim(), sku: sku.trim() || undefined, categoryId: categoryId || undefined,
      estimatedMaterialG: Number(materialG), estimatedPrintTimeMinutes: Number(timeMin),
      piecesPerPrint: Number(pieces) || 1,
      margin: margin ? Number(margin) / 100 : undefined,
    }),
    onSuccess: () => {
      toast.success('Produto derivado criado')
      reset(); onClose()
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['pricing-templates'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao criar produto derivado')),
  })

  const effectiveMargin = margin ? Number(margin) : Math.round((template?.defaultMargin ?? 0.4) * 100)
  const deriveError = derive.isError ? getApiMessage(derive.error, 'Falha ao criar produto derivado') : null

  return (
    <Drawer open={open} onClose={() => { reset(); onClose() }} title={`Derivar produto — ${template?.name ?? ''}`} width={500} error={deriveError}>
      {template && (
        <div className="space-y-5">
          {/* Taxas do template */}
          <div className="rounded-xl p-3 space-y-2" style={{ background: nexAlpha('cyan', 0.05), border: `1px solid ${nexAlpha('cyan', 0.15)}` }}>
            <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: NEX.cyan }}>Taxas do template</div>
            <div className="grid grid-cols-3 gap-3 text-[11.5px]">
              <div><div style={{ color: NEX.textMute }}>R$/g material</div><div className="font-mono font-semibold">{Number(template.rateMaterialPerG).toFixed(4)}</div></div>
              <div><div style={{ color: NEX.textMute }}>R$/min</div><div className="font-mono font-semibold">{Number(template.rateTimePerMin).toFixed(4)}</div></div>
              <div><div style={{ color: NEX.textMute }}>Acessórios base</div><div className="font-mono font-semibold"><Money value={Number(template.baseAccessoryCost)} /></div></div>
            </div>
          </div>

          <Section label="Parâmetros físicos">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Material (g) *"><input type="number" min={0.1} step="0.5" value={materialG} onChange={(e) => setMaterialG(e.target.value)} className={inputCls + ' text-right tabular-nums'} /></Field>
              <Field label="Tempo (min) *"><input type="number" min={1} step="1" value={timeMin} onChange={(e) => setTimeMin(e.target.value)} className={inputCls + ' text-right tabular-nums'} /></Field>
              <Field label="Peças/impressão"><input type="number" min={1} step="1" value={pieces} onChange={(e) => setPieces(e.target.value)} className={inputCls + ' text-right tabular-nums'} /></Field>
            </div>
            <Field label={`Margem desejada (%) — padrão: ${Math.round((template.defaultMargin) * 100)}%`}>
              <div className="flex items-center">
                <input type="number" min={0} max={99} step="1" value={margin} onChange={(e) => setMargin(e.target.value)} className={inputCls + ' text-right tabular-nums'} placeholder={String(Math.round(template.defaultMargin * 100))} />
                <span className="px-3 text-[13px]" style={{ color: NEX.textDim }}>%</span>
              </div>
            </Field>
          </Section>

          {/* Preview de preço */}
          {(preview || previewLoading) && (
            <div className="rounded-xl p-4" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: NEX.textMute }}>
                {previewLoading ? 'Calculando…' : 'Estimativa de preço'}
              </div>
              {preview && !previewLoading && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
                    {[
                      { label: 'Custo material', value: <Money value={preview.unitMaterialCost} muted /> },
                      { label: 'Custo tempo', value: <Money value={preview.unitTimeCost} muted /> },
                      { label: 'Custo acessórios', value: <Money value={preview.unitAccessoryCost} muted /> },
                      { label: 'Buffer de falha', value: <span style={{ color: NEX.textMute }}>{(Number(template.failureRateApplied)).toFixed(1)}%</span> },
                      { label: 'Custo com erro', value: <Money value={preview.unitCostWithErr} /> },
                      { label: 'Margem', value: <span style={{ color: NEX.textDim }}>{(effectiveMargin)}%</span> },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <span style={{ color: NEX.textDim }}>{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2" style={{ borderTop: `1px solid ${NEX.border}` }}>
                    <span className="text-[12px] font-semibold" style={{ color: NEX.text }}>Preço de venda</span>
                    <span className="text-[18px] font-bold" style={{ color: NEX.cyan }}><Money value={preview.sellingPrice} /></span>
                  </div>
                  <div className="flex justify-between text-[11.5px]" style={{ color: NEX.textDim }}>
                    <span>Lucro bruto estimado</span>
                    <span style={{ color: NEX.green }}><Money value={preview.grossProfit} /></span>
                  </div>
                </div>
              )}
            </div>
          )}

          <Section label="Identificação do produto">
            <Field label="Nome do produto *"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: Cortador Natalino — Árvore P" autoFocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU"><input value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls + ' font-mono'} placeholder="CORT-001" /></Field>
              <Field label="Categoria">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                  <option value="">Usar categoria do âncora</option>
                  {(categories as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          <div className="flex flex-col gap-2 pt-1">
            <Btn kind="primary" size="md" icon={Icons.plus} className="w-full justify-center"
              disabled={!name.trim() || !materialG || !timeMin || derive.isPending}
              onClick={() => derive.mutate()}>
              Criar produto derivado
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => { reset(); onClose() }}>Cancelar</Btn>
          </div>
        </div>
      )}
    </Drawer>
  )
}

// ── Página principal ───────────────────────────────────
export function PricingTemplatesPage() {
  const queryClient = useQueryClient()
  const { data: templates = [] } = useQuery({ queryKey: ['pricing-templates'], queryFn: () => pricingTemplatesService.findAll() })

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deriveTarget, setDeriveTarget] = useState<PricingTemplate | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PricingTemplate | null>(null)
  const [recalculating, setRecalculating] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return templates as PricingTemplate[]
    return (templates as PricingTemplate[]).filter((t) =>
      t.name.toLowerCase().includes(q) || (t.product?.name ?? '').toLowerCase().includes(q),
    )
  }, [templates, search])

  const remove = useMutation({
    mutationFn: (id: string) => pricingTemplatesService.remove(id),
    onSuccess: () => {
      toast.success('Template removido')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['pricing-templates'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover template')),
  })

  const handleRecalculate = async (id: string, name: string) => {
    setRecalculating(id)
    try {
      const res = await pricingTemplatesService.recalculate(id) as any
      toast.success(`${res.updated} de ${res.total} produtos de "${name}" tiveram preço atualizado`)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (err) {
      toast.error(getApiMessage(err, 'Falha ao recalcular'))
    } finally {
      setRecalculating(null) }
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar template..." className="bg-transparent flex-1 text-[12.5px] focus:outline-none" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>{filtered.length} {filtered.length === 1 ? 'template' : 'templates'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={() => setCreateOpen(true)}>Novo template</Btn>
        </div>
      </div>

      {/* Cards de templates */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ border: `1px dashed ${NEX.border}`, color: NEX.textMute }}>
          <Icon d={Icons.zap} size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p className="text-[13px]">{search ? `Nenhum resultado para "${search}"` : 'Nenhum template criado.'}</p>
          {!search && <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={() => setCreateOpen(true)}>Criar primeiro template</Btn>}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((t: PricingTemplate) => (
            <div key={t.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
              {/* Header do template */}
              <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: `1px solid ${NEX.border}` }}>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[14px] font-semibold" style={{ color: NEX.text }}>{t.name}</span>
                    <Pill tone="cyan">{t._count?.derivedProducts ?? 0} derivados</Pill>
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: NEX.textDim }}>
                    Âncora: <span className="font-medium">{t.product?.name}</span>
                    {t.product?.category && <span style={{ color: NEX.textMute }}> · {t.product.category.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Btn kind="soft" size="sm" icon={Icons.zap} onClick={() => setDeriveTarget(t)}>Derivar produto</Btn>
                  <Btn kind="ghost" size="sm" icon={Icons.history} disabled={recalculating === t.id}
                    onClick={() => handleRecalculate(t.id, t.name)}>
                    {recalculating === t.id ? 'Recalculando…' : 'Recalcular tudo'}
                  </Btn>
                  <button onClick={() => setPendingDelete(t)} style={{ color: NEX.red }} title="Remover template">
                    <Icon d={Icons.trash} size={14} />
                  </button>
                </div>
              </div>

              {/* Taxas */}
              <div className="px-5 py-3 grid grid-cols-4 gap-4 text-[12px]" style={{ borderBottom: `1px solid ${NEX.border}` }}>
                {[
                  { label: 'R$ / g material', value: Number(t.rateMaterialPerG).toFixed(5) },
                  { label: 'R$ / min', value: Number(t.rateTimePerMin).toFixed(5) },
                  { label: 'Acessórios base', value: <Money value={Number(t.baseAccessoryCost)} muted /> },
                  { label: 'Margem padrão', value: `${Math.round(Number(t.defaultMargin) * 100)}%` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: NEX.textMute }}>{label}</div>
                    <div className="font-mono font-medium">{value}</div>
                  </div>
                ))}
              </div>

              {/* Produtos derivados */}
              {t.derivedProducts && t.derivedProducts.length > 0 && (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
                      {['Produto derivado', 'Material', 'Tempo', 'Margem', 'Preço', 'Status'].map((h) => (
                        <th key={h} className="px-5 py-2 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.derivedProducts.map((p) => (
                      <tr key={p.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                        <td className="px-5 py-2">
                          <div style={{ color: NEX.text }}>{p.name}</div>
                          {p.sku && <div className="font-mono text-[10.5px]" style={{ color: NEX.textMute }}>{p.sku}</div>}
                        </td>
                        <td className="px-2 font-mono text-[11px]" style={{ color: NEX.textDim }}>{Number(p.estimatedMaterialG).toFixed(1)} g</td>
                        <td className="px-2 font-mono text-[11px]" style={{ color: NEX.textDim }}>{p.estimatedPrintTimeMinutes} min</td>
                        <td className="px-2 text-[11px]" style={{ color: NEX.textDim }}>{p.templateMargin != null ? `${Math.round(Number(p.templateMargin) * 100)}%` : '—'}</td>
                        <td className="px-2"><Money value={Number(p.sellingPrice)} /></td>
                        <td className="px-5"><Pill tone={p.isActive ? 'green' : 'default'}>{p.isActive ? 'Ativo' : 'Inativo'}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateTemplateDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      <DeriveDrawer template={deriveTarget} open={!!deriveTarget} onClose={() => setDeriveTarget(null)} />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null) }}
        title="Remover template?"
        description={pendingDelete
          ? `"${pendingDelete.name}" será removido. Os ${pendingDelete._count?.derivedProducts ?? 0} produtos derivados não serão deletados — apenas perderão o vínculo com o template.`
          : ''}
        confirmLabel="Remover"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => { if (pendingDelete) remove.mutate(pendingDelete.id) }}
      />
    </div>
  )
}
