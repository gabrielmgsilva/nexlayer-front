import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Btn, Money, Icon, Icons, NEX } from '@/lib/nex'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import {
  calculatorService, costConfigService, equipmentService, materialsService,
  productsService,
} from '@/services/entities.service'
import type {
  CostConfig, Equipment, Material, MaterialStock, Product,
} from '@/types/api.types'

// Server response (cost engine result + materials labels)
interface EstimateResult {
  materials: Array<{ name: string }>
  unitCostBeforeError: number
  unitCostWithError: number
  unitSalePrice: number
  unitProfit: number
  unitElectricityCost: number
  unitDepreciationCost: number
  unitMaintenanceCost: number
  unitMaterialCost: number
  unitLaborCost: number
  unitOverheadCost: number
  unitAccessoriesCost: number
  unitFailureBufferCost: number
  batchTotalCost: number
  batchTotalSalePrice: number
  batchTotalProfit: number
  profitMargin: number
  failureRateApplied: number
}

export function CalculatorPage() {
  const [searchParams] = useSearchParams()
  const presetProductId = searchParams.get('productId') ?? ''
  const presetQty = parseInt(searchParams.get('qty') ?? '0') || 0
  const orderRef = searchParams.get('order') ?? ''

  // Lookups
  const { data: allConfigs = [] } = useQuery({ queryKey: ['cost-configs'], queryFn: () => costConfigService.findAll() })
  const configs = allConfigs.filter((c: CostConfig) => c.isActive)
  const { data: equipRes } = useQuery({ queryKey: ['equipment', 'opt'], queryFn: () => equipmentService.findAll({ limit: 100 }) })
  const equipment: Equipment[] = equipRes?.data ?? []
  const { data: matsRes } = useQuery({ queryKey: ['materials', 'opt'], queryFn: () => materialsService.findAll({ limit: 200 }) })
  const materials: Material[] = matsRes?.data ?? []
  const { data: productsRes } = useQuery({ queryKey: ['products', 'opt'], queryFn: () => productsService.findAll({ limit: 200, isActive: true }) })
  const products: Product[] = productsRes?.data ?? []

  // Form state
  const [productId, setProductId] = useState(presetProductId)
  const [equipmentId, setEquipmentId] = useState('')
  const [costConfigId, setCostConfigId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [stockId, setStockId] = useState('')
  const [printTimeMinutes, setPrintTimeMinutes] = useState(60)
  const [materialGrams, setMaterialGrams] = useState(50)
  const [piecesPerPrint, setPiecesPerPrint] = useState(1)
  const [quantityOrdered, setQuantityOrdered] = useState(presetQty || 1)
  const [profitMargin, setProfitMargin] = useState(50) // percent
  const [discountPercent, setDiscountPercent] = useState(0)

  // Load product defaults
  useEffect(() => {
    if (!productId) return
    const p = products.find((x) => x.id === productId)
    if (!p) return
    setPrintTimeMinutes(p.estimatedPrintTimeMinutes || 60)
    setMaterialGrams(p.estimatedMaterialG || 50)
    setPiecesPerPrint(p.piecesPerPrint || 1)
  }, [productId, products])

  // Default cost config
  useEffect(() => {
    if (costConfigId && !configs.find((c: CostConfig) => c.id === costConfigId)) {
      setCostConfigId('')
      return
    }

    if (!costConfigId && configs.length > 0) {
      const def = configs.find((c: CostConfig) => c.isDefault) ?? configs[0]
      setCostConfigId(def.id)
      if (def.equipmentId && !equipmentId) setEquipmentId(def.equipmentId)
    }
  }, [costConfigId, configs, equipmentId])

  // Stocks for selected material
  const { data: stocksRes } = useQuery({
    queryKey: ['materials', materialId, 'stocks-opt'],
    queryFn: () => materialsService.getStocks(materialId, { limit: 50 }),
    enabled: !!materialId,
  })
  const stocks: MaterialStock[] = stocksRes?.data ?? []
  useEffect(() => {
    if (stocks.length > 0 && !stocks.find((s) => s.id === stockId)) {
      const inUse = stocks.find((s) => s.status === 'IN_USE') ?? stocks[0]
      setStockId(inUse.id)
    }
  }, [stocks, stockId])

  // Derived
  const printsNeeded = useMemo(
    () => Math.max(1, Math.ceil(quantityOrdered / Math.max(1, piecesPerPrint))),
    [quantityOrdered, piecesPerPrint],
  )
  const totalQuantity = printsNeeded * piecesPerPrint

  const estimate = useMutation({
    mutationFn: async () => {
      const body = {
        equipmentId,
        materials: stockId ? [{ materialStockId: stockId, materialGrams: Number(materialGrams) }] : undefined,
        printTimeMinutes: Number(printTimeMinutes),
        piecesPerPrint: Number(piecesPerPrint),
        printsNeeded,
        quantityOrdered: Number(quantityOrdered),
        totalQuantity,
        accessories: [],
        costConfigId,
        profitMargin: Number(profitMargin) / 100,
        discountPercent: Number(discountPercent) || undefined,
      }
      return calculatorService.estimate(body) as Promise<EstimateResult>
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } } }
      const msg = e.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Falha ao calcular')
    },
  })

  const result = estimate.data
  const canCalculate = !!(equipmentId && stockId && costConfigId && printTimeMinutes > 0 && materialGrams > 0)

  return (
    <div className="px-8 py-6 grid grid-cols-5 gap-5">
      {/* LEFT — inputs */}
      <div className="col-span-2 space-y-4">
        {orderRef && (
          <div className="rounded-md p-3 flex items-center gap-2 text-[12px]" style={{ background: NEX.cyanDim, border: `1px solid rgba(0,217,255,0.25)` }}>
            <Icon d={Icons.cart} size={13} style={{ color: NEX.cyan }} />
            <span style={{ color: NEX.text }}>Calculando para o pedido <strong className="font-mono">{orderRef}</strong></span>
          </div>
        )}

        <Card>
          <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-3" style={{ color: NEX.textMute }}>Produto & equipamento</div>
          <div className="space-y-3">
            <Field label="Produto (opcional · preenche valores padrão)">
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
                <option value="">— manual —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Impressora *">
              <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} className={inputCls}>
                <option value="">Selecionar…</option>
                {equipment.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Perfil de custo *">
              <select value={costConfigId} onChange={(e) => setCostConfigId(e.target.value)} className={inputCls}>
                <option value="">Selecionar…</option>
                {configs.map((c: CostConfig) => (
                  <option key={c.id} value={c.id}>{c.name}{c.isDefault ? ' · padrão' : ''}</option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <Card>
          <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-3" style={{ color: NEX.textMute }}>Material</div>
          <div className="space-y-3">
            <Field label="Filamento *">
              <select value={materialId} onChange={(e) => { setMaterialId(e.target.value); setStockId('') }} className={inputCls}>
                <option value="">Selecionar…</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.filamentType?.name ?? 'Sem tipo'} · {m.brand?.name ?? '—'}
                  </option>
                ))}
              </select>
            </Field>
            {materialId && (
              <Field label="Bobina *">
                <select value={stockId} onChange={(e) => setStockId(e.target.value)} className={inputCls}>
                  <option value="">Selecionar…</option>
                  {stocks.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.spoolLabel ?? s.lotNumber ?? s.id.slice(0, 8)} · {s.currentWeightG.toFixed(0)}g · R$ {s.costPerKg}/kg
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tempo de impressão (min) *">
                <input type="number" min={1} value={printTimeMinutes} onChange={(e) => setPrintTimeMinutes(parseInt(e.target.value) || 1)} className={inputCls} />
              </Field>
              <Field label="Material por impressão (g) *">
                <input type="number" step="0.1" min={0.1} value={materialGrams} onChange={(e) => setMaterialGrams(parseFloat(e.target.value) || 0)} className={inputCls} />
              </Field>
              <Field label="Peças por impressão *">
                <input type="number" min={1} value={piecesPerPrint} onChange={(e) => setPiecesPerPrint(parseInt(e.target.value) || 1)} className={inputCls} />
              </Field>
              <Field label="Quantidade pedida *">
                <input type="number" min={1} value={quantityOrdered} onChange={(e) => setQuantityOrdered(parseInt(e.target.value) || 1)} className={inputCls} />
              </Field>
            </div>
            <div className="text-[11px]" style={{ color: NEX.textMute }}>
              Total a produzir: <span className="font-mono font-semibold" style={{ color: NEX.text }}>{totalQuantity}</span> peças
              em <span className="font-mono">{printsNeeded}</span> impressão(ões)
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-3" style={{ color: NEX.textMute }}>Margem & desconto</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Margem de lucro (%)">
              <DecimalRtlInput
                value={profitMargin}
                onValueChange={(next) => setProfitMargin(Math.min(300, Math.max(0, next)))}
                min={0}
                max={300}
                suffix="%"
                className="h-9 px-3 text-[13px] text-right tabular-nums"
              />
            </Field>
            <Field label="Desconto (%)">
              <DecimalRtlInput
                value={discountPercent}
                onValueChange={(next) => setDiscountPercent(Math.min(50, Math.max(0, next)))}
                min={0}
                max={50}
                suffix="%"
                className="h-9 px-3 text-[13px] text-right tabular-nums"
              />
            </Field>
          </div>
          <div className="mt-2 text-[11px]" style={{ color: NEX.textMute }}>
            Margem aplicada: <span className="font-mono" style={{ color: NEX.cyan }}>{profitMargin.toFixed(2)}%</span> ·
            Desconto: <span className="font-mono" style={{ color: NEX.amber }}> {discountPercent.toFixed(2)}%</span>
          </div>
        </Card>

        <Btn
          kind="primary" size="lg" icon={Icons.calc}
          className="w-full justify-center"
          disabled={!canCalculate || estimate.isPending}
          onClick={() => estimate.mutate()}
        >
          {estimate.isPending ? 'Calculando…' : 'Calcular custo'}
        </Btn>
      </div>

      {/* RIGHT — result */}
      <div className="col-span-3 space-y-4">
        {!result ? (
          <Card className="h-full">
            <div className="py-20 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full mb-3"
                   style={{ background: NEX.cyanDim, border: `1px solid rgba(0,217,255,0.25)` }}>
                <Icon d={Icons.calc} size={20} style={{ color: NEX.cyan }} />
              </div>
              <div className="text-[14px] font-semibold">Pronto para calcular</div>
              <div className="text-[12px] mt-1" style={{ color: NEX.textDim }}>
                Preencha os campos ao lado e veja o detalhamento de custo em tempo real.
              </div>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-1" style={{ color: NEX.textMute }}>Custo / un</div>
                <Money value={result.unitCostWithError} className="text-[20px] font-bold" />
              </Card>
              <Card>
                <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-1" style={{ color: NEX.textMute }}>Preço / un</div>
                <Money value={result.unitSalePrice} className="text-[20px] font-bold" />
              </Card>
              <Card>
                <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-1" style={{ color: NEX.textMute }}>Lucro / un</div>
                <span className="text-[20px] font-bold" style={{ color: NEX.green }}>
                  <Money value={result.unitProfit} />
                </span>
                <div className="text-[10.5px] mt-0.5 font-mono" style={{ color: NEX.green }}>
                  {(result.profitMargin * 100).toFixed(1)}% de margem
                </div>
              </Card>
            </div>

            <Card>
              <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-3" style={{ color: NEX.textMute }}>Composição do custo unitário</div>
              <CostBar result={result} />
              <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-6 text-[12px]">
                <BreakdownLine label="Material" value={result.unitMaterialCost} color={NEX.cyan} />
                <BreakdownLine label="Energia" value={result.unitElectricityCost} color={NEX.amber} />
                <BreakdownLine label="Depreciação" value={result.unitDepreciationCost} color={NEX.violet} />
                <BreakdownLine label="Manutenção" value={result.unitMaintenanceCost} color={NEX.red} />
                <BreakdownLine label="Mão de obra" value={result.unitLaborCost} color={NEX.green} />
                <BreakdownLine label="Overhead" value={result.unitOverheadCost} color="#7B7C8A" />
                {result.unitAccessoriesCost > 0 && (
                  <BreakdownLine label="Acessórios" value={result.unitAccessoriesCost} color="#F472B6" />
                )}
                {result.unitFailureBufferCost > 0 && (
                  <BreakdownLine label={`Falhas (${result.failureRateApplied.toFixed(1)}%)`} value={result.unitFailureBufferCost} color={NEX.red} />
                )}
              </div>
            </Card>

            <Card>
              <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-3" style={{ color: NEX.textMute }}>Total do lote ({totalQuantity} peças)</div>
              <div className="grid grid-cols-3 gap-3 text-[13px]">
                <div>
                  <div style={{ color: NEX.textDim }}>Custo total</div>
                  <Money value={result.batchTotalCost} className="text-[16px] font-bold mt-1" />
                </div>
                <div>
                  <div style={{ color: NEX.textDim }}>Receita</div>
                  <Money value={result.batchTotalSalePrice} className="text-[16px] font-bold mt-1" />
                </div>
                <div>
                  <div style={{ color: NEX.textDim }}>Lucro</div>
                  <span className="text-[16px] font-bold mt-1 block" style={{ color: NEX.green }}>
                    <Money value={result.batchTotalProfit} />
                  </span>
                </div>
              </div>
            </Card>

            {result.materials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.materials.map((m, i) => (
                  <Pill key={i} tone="cyan">{m.name}</Pill>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CostBar({ result }: { result: EstimateResult }) {
  const segments = [
    { label: 'Material', value: result.unitMaterialCost, color: NEX.cyan },
    { label: 'Energia', value: result.unitElectricityCost, color: NEX.amber },
    { label: 'Depreciação', value: result.unitDepreciationCost, color: NEX.violet },
    { label: 'Manutenção', value: result.unitMaintenanceCost, color: NEX.red },
    { label: 'Mão de obra', value: result.unitLaborCost, color: NEX.green },
    { label: 'Overhead', value: result.unitOverheadCost, color: '#7B7C8A' },
    { label: 'Acessórios', value: result.unitAccessoriesCost, color: '#F472B6' },
    { label: 'Falhas', value: result.unitFailureBufferCost, color: NEX.red },
  ].filter((s) => s.value > 0)
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: NEX.border }}>
      {segments.map((s, i) => (
        <div key={i} title={`${s.label}: R$ ${s.value.toFixed(2)}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  )
}

function BreakdownLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: color }} />
      <span className="flex-1" style={{ color: NEX.textDim }}>{label}</span>
      <Money value={value} className="font-semibold" />
    </div>
  )
}

const inputCls = 'w-full h-9 px-3 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-cyan-500'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>{label}</span>
      <div style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6, color: NEX.text }}
           className="[&>input]:bg-transparent [&>input]:w-full [&>input]:h-9 [&>input]:px-3 [&>input]:text-[13px] [&>input]:focus:outline-none [&>select]:bg-transparent [&>select]:w-full [&>select]:h-9 [&>select]:px-3 [&>select]:text-[13px] [&>select]:focus:outline-none">
        {children}
      </div>
    </label>
  )
}

// (end)
