import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pill, Icon, Icons, NEX, Money, nexAlpha } from '@/lib/nex'
import { traceabilityService } from '@/services/entities.service'
import type { MaterialStock, TraceabilityResult } from '@/types/api.types'

const STATUS_LABELS: Record<string, string> = {
  SEALED: 'Lacrado', IN_USE: 'Em uso', EMPTY: 'Vazio', EXPIRED: 'Expirado',
}

const JOB_STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Orçado', QUEUED: 'Na fila', PRINTING: 'Imprimindo',
  POST_PROCESSING: 'Pós-proc.', QUALITY_CHECK: 'QC', QC_APPROVED: 'QC Aprovado',
  QC_PARTIAL_APPROVED: 'QC Parcial', QC_REJECTED: 'QC Reprovado', PACKING: 'Embalando',
  READY: 'Pronto', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
}

const TX_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE:    { label: 'Compra',    color: NEX.green },
  CONSUMPTION: { label: 'Consumo',   color: NEX.amber },
  ADJUSTMENT:  { label: 'Ajuste',    color: NEX.cyan },
  WASTE:       { label: 'Descarte',  color: NEX.red },
}

function StockCard({ stock, selected, onClick }: {
  stock: MaterialStock & { material?: any }
  selected: boolean
  onClick: () => void
}) {
  const fillPct = stock.initialWeightG > 0
    ? Math.round((Number(stock.currentWeightG) / Number(stock.initialWeightG)) * 100)
    : 0
  return (
    <button onClick={onClick} className="w-full rounded-xl text-left transition-all"
      style={{
        background: selected ? nexAlpha('cyan', 0.08) : NEX.surface,
        border: `1px solid ${selected ? nexAlpha('cyan', 0.35) : NEX.border}`,
        padding: '12px 14px',
      }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12.5px] font-medium" style={{ color: selected ? NEX.cyan : NEX.text }}>
            {stock.lotNumber ?? `Lote ${stock.id.slice(0, 8)}`}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: NEX.textDim }}>
            {stock.material?.filamentType?.name ?? 'Sem tipo'} · {stock.material?.brand?.name ?? 'Sem marca'}
          </div>
        </div>
        <Pill tone={stock.status === 'IN_USE' ? 'cyan' : stock.status === 'EMPTY' ? 'red' : 'default'}>
          {STATUS_LABELS[stock.status] ?? stock.status}
        </Pill>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-[10.5px] mb-1" style={{ color: NEX.textMute }}>
          <span>{Math.trunc(Number(stock.currentWeightG))} g restantes</span>
          <span>{fillPct}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: NEX.surface2 }}>
          <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: fillPct <= 20 ? NEX.amber : NEX.cyan }} />
        </div>
      </div>
    </button>
  )
}

export function TraceabilityPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null)
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = (v: string) => {
    setQuery(v)
    if (timer) clearTimeout(timer)
    const t = setTimeout(() => setDebouncedQuery(v), 400)
    setTimer(t)
  }

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['traceability', 'search', debouncedQuery],
    queryFn: () => traceabilityService.searchLot(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
  })

  const { data: chain, isLoading: loadingChain } = useQuery({
    queryKey: ['traceability', 'chain', selectedStockId],
    queryFn: () => traceabilityService.getByStock(selectedStockId!),
    enabled: !!selectedStockId,
  })

  const result = chain as TraceabilityResult | undefined

  return (
    <div className="px-8 py-6 space-y-5">

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 h-10 px-4 rounded-xl flex-1 max-w-md"
          style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={14} style={{ color: NEX.textMute }} />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por número de lote, ID da bobina…"
            className="bg-transparent flex-1 text-[13px] focus:outline-none"
            style={{ color: NEX.text }}
            autoFocus
          />
          {query && <button onClick={() => { setQuery(''); setDebouncedQuery(''); setSelectedStockId(null) }} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={13} /></button>}
        </div>
        {searching && <span className="text-[12px]" style={{ color: NEX.textMute }}>Buscando…</span>}
      </div>

      {debouncedQuery.length < 2 && !selectedStockId && (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: NEX.textMute }}>
          <Icon d={Icons.history} size={36} style={{ marginBottom: 12, opacity: 0.35 }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: NEX.textDim }}>Rastreabilidade de lote</p>
          <p className="text-[12.5px]">Digite o número de lote ou ID da bobina para traçar a cadeia completa</p>
          <p className="text-[11.5px] mt-1">bobina → jobs de produção → pedidos de venda</p>
        </div>
      )}

      {/* Results layout */}
      {(searchResults.length > 0 || selectedStockId) && (
        <div className="grid grid-cols-3 gap-5 items-start">

          {/* Left: stock list */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: NEX.textMute }}>
              Recipientes encontrados · {searchResults.length}
            </div>
            {(searchResults as any[]).map((s: any) => (
              <StockCard
                key={s.id}
                stock={s}
                selected={selectedStockId === s.id}
                onClick={() => setSelectedStockId(s.id)}
              />
            ))}
          </div>

          {/* Right: traceability chain */}
          <div className="col-span-2">
            {!selectedStockId && (
              <div className="flex items-center justify-center py-16 rounded-xl"
                style={{ border: `1px dashed ${NEX.border}`, color: NEX.textMute }}>
                <p className="text-[12.5px]">Selecione um lote à esquerda para ver a cadeia completa</p>
              </div>
            )}

            {selectedStockId && loadingChain && (
              <div className="flex items-center justify-center py-16" style={{ color: NEX.textMute }}>
                <p className="text-[12.5px]">Rastreando cadeia…</p>
              </div>
            )}

            {result && (
              <div className="space-y-5">

                {/* Stock info + summary */}
                <div className="rounded-xl p-4 space-y-3" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
                  <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: NEX.textMute }}>Recipiente</div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Lote', value: result.stock.lotNumber ?? `ID: ${result.stock.id.slice(0, 8)}` },
                      { label: 'Material', value: `${result.stock.material.filamentType?.name ?? '—'} · ${result.stock.material.brand?.name ?? '—'}` },
                      { label: 'Fornecedor', value: result.stock.material.supplier?.name ?? '—' },
                      { label: 'Peso inicial', value: `${result.stock.initialWeightG} g` },
                      { label: 'Peso atual', value: `${Math.trunc(Number(result.stock.currentWeightG))} g` },
                      { label: 'Custo/kg', value: <Money value={Number(result.stock.costPerKg)} /> },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-[10.5px] uppercase tracking-wider mb-0.5" style={{ color: NEX.textMute }}>{label}</div>
                        <div className="text-[12.5px] font-medium" style={{ color: NEX.text }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-6 pt-2" style={{ borderTop: `1px solid ${NEX.border}` }}>
                    {[
                      { label: 'Jobs produzidos', value: String(result.summary.totalJobs) },
                      { label: 'Pedidos atendidos', value: String(result.summary.totalSaleOrders) },
                      { label: 'Material consumido', value: `${result.summary.consumedG.toFixed(1)} g` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>{label}</div>
                        <div className="text-[16px] font-semibold" style={{ color: NEX.cyan }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transactions */}
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
                  <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
                    <div className="text-[13px] font-semibold">Movimentações · {result.transactions.length}</div>
                  </div>
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
                        {['Data', 'Tipo', 'Quantidade', 'Referência'].map((h) => (
                          <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.transactions.map((tx) => {
                        const txInfo = TX_LABELS[tx.type] ?? { label: tx.type, color: NEX.textDim }
                        return (
                          <tr key={tx.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                            <td className="px-4 py-2 font-mono text-[11px]" style={{ color: NEX.textDim }}>
                              {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-2 py-2">
                              <span className="font-medium" style={{ color: txInfo.color }}>{txInfo.label}</span>
                            </td>
                            <td className="px-2 py-2 font-mono" style={{ color: NEX.textDim }}>
                              {Number(tx.quantityG) > 0 ? '+' : ''}{Number(tx.quantityG).toFixed(1)} g
                            </td>
                            <td className="px-4 py-2 text-[11px]" style={{ color: NEX.textMute }}>
                              {tx.referenceType ? `${tx.referenceType}: ${tx.referenceId?.slice(0, 8)}…` : tx.notes ?? '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Jobs chain */}
                {result.jobs.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
                    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
                      <div className="text-[13px] font-semibold">Jobs de produção · {result.jobs.length}</div>
                    </div>
                    <div className="divide-y" style={{ borderColor: NEX.border }}>
                      {result.jobs.map((job) => (
                        <div key={job.jobId} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-[12.5px]" style={{ color: NEX.text }}>{job.jobNumber}</span>
                                <Pill tone={job.status === 'DELIVERED' ? 'green' : job.status === 'CANCELLED' ? 'red' : 'default'}>
                                  {JOB_STATUS_LABELS[job.status] ?? job.status}
                                </Pill>
                              </div>
                              <div className="text-[11.5px] mt-0.5" style={{ color: NEX.textDim }}>
                                {job.product.name} {job.product.sku ? `(${job.product.sku})` : ''}
                              </div>
                              {job.customer && (
                                <div className="text-[11px] mt-0.5" style={{ color: NEX.textMute }}>
                                  Cliente: {job.customer.name}
                                </div>
                              )}
                            </div>
                            {job.completedAt && (
                              <div className="text-[11px] font-mono" style={{ color: NEX.textMute }}>
                                {new Date(job.completedAt).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>

                          {/* Sale orders from this job */}
                          {job.saleOrders.length > 0 && (
                            <div className="mt-2 pl-3 space-y-1" style={{ borderLeft: `2px solid ${nexAlpha('cyan', 0.3)}` }}>
                              {job.saleOrders.map((o: any) => (
                                <div key={o.id} className="flex items-center gap-2">
                                  <Icon d={Icons.cart} size={11} style={{ color: NEX.cyan }} />
                                  <span className="font-mono text-[11.5px]" style={{ color: NEX.text }}>{o.orderNumber}</span>
                                  <Pill tone={o.status === 'DELIVERED' ? 'green' : o.status === 'CANCELLED' ? 'red' : 'default'}>
                                    {o.status}
                                  </Pill>
                                  {o.customer && (
                                    <span className="text-[11px]" style={{ color: NEX.textDim }}>→ {o.customer.name}</span>
                                  )}
                                  <span className="text-[10.5px] font-mono ml-auto" style={{ color: NEX.textMute }}>
                                    {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
