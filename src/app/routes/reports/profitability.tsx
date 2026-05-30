import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pill, Icon, Icons, NEX, Money, nexAlpha } from '@/lib/nex'
import { profitabilityService } from '@/services/entities.service'
import type { ProfitabilityByProductRow, ProfitabilityByCustomerRow } from '@/types/api.types'

type Dimension = 'product' | 'customer' | 'channel'
type SortKey = 'grossProfit' | 'revenue' | 'margin' | 'units' | 'ordersCount'

function marginTone(margin: number): 'green' | 'amber' | 'red' | 'default' {
  if (margin >= 30) return 'green'
  if (margin >= 10) return 'amber'
  if (margin > 0)   return 'default'
  return 'red'
}

function DateRangePicker({ from, to, onChange }: {
  from: string; to: string
  onChange: (from: string, to: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 h-9 px-3 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
        <span className="text-[11px]" style={{ color: NEX.textMute }}>De</span>
        <input type="date" value={from} onChange={(e) => onChange(e.target.value, to)}
          className="bg-transparent text-[12.5px] focus:outline-none" style={{ color: NEX.text }} />
      </div>
      <div className="flex items-center gap-1.5 h-9 px-3 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
        <span className="text-[11px]" style={{ color: NEX.textMute }}>Até</span>
        <input type="date" value={to} onChange={(e) => onChange(from, e.target.value)}
          className="bg-transparent text-[12.5px] focus:outline-none" style={{ color: NEX.text }} />
      </div>
    </div>
  )
}

function SortableHeader({ label, sortKey, current, direction, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; direction: 'asc' | 'desc'
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" style={{ color: active ? NEX.cyan : NEX.textMute }}
      onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        <Icon d={active ? (direction === 'desc' ? Icons.arrowDown : Icons.arrowUp) : Icons.arrowDown}
          size={10} style={{ opacity: active ? 1 : 0.3 }} />
      </div>
    </th>
  )
}

export function ProfitabilityPage() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end   = now.toISOString().slice(0, 10)

  const [dimension, setDimension] = useState<Dimension>('product')
  const [from, setFrom] = useState(start)
  const [to, setTo]     = useState(end)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('grossProfit')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const params = { from, to }

  const { data: byProduct, isLoading: loadingProduct } = useQuery({
    queryKey: ['profitability', 'by-product', from, to],
    queryFn: () => profitabilityService.byProduct(params),
    enabled: dimension === 'product',
  })

  const { data: byCustomer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['profitability', 'by-customer', from, to],
    queryFn: () => profitabilityService.byCustomer(params),
    enabled: dimension === 'customer',
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const productRows = useMemo(() => {
    const rows = (byProduct?.rows ?? []) as ProfitabilityByProductRow[]
    const q = search.trim().toLowerCase()
    const filtered = q ? rows.filter((r) => r.productName.toLowerCase().includes(q) || (r.sku ?? '').toLowerCase().includes(q)) : rows
    return [...filtered].sort((a, b) => {
      const v = (r: ProfitabilityByProductRow) => r[sortKey as keyof ProfitabilityByProductRow] as number ?? 0
      return sortDir === 'desc' ? v(b) - v(a) : v(a) - v(b)
    })
  }, [byProduct, search, sortKey, sortDir])

  const customerRows = useMemo(() => {
    const rows = (byCustomer?.rows ?? []) as ProfitabilityByCustomerRow[]
    const q = search.trim().toLowerCase()
    const filtered = q ? rows.filter((r) => r.customerName.toLowerCase().includes(q)) : rows
    return [...filtered].sort((a, b) => {
      const v = (r: ProfitabilityByCustomerRow) => r[sortKey as keyof ProfitabilityByCustomerRow] as number ?? 0
      return sortDir === 'desc' ? v(b) - v(a) : v(a) - v(b)
    })
  }, [byCustomer, search, sortKey, sortDir])

  const isLoading = (dimension === 'product' && loadingProduct) || (dimension === 'customer' && loadingCustomer)
  const totals = dimension === 'product' ? byProduct?.totals : byCustomer?.totals

  return (
    <div className="px-8 py-6 space-y-5">

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Dimension tabs */}
        <div className="flex items-center gap-1 p-1 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          {([
            { id: 'product',  label: 'Por produto', icon: Icons.pkg },
            { id: 'customer', label: 'Por cliente', icon: Icons.user },
          ] as const).map((d) => (
            <button key={d.id} onClick={() => { setDimension(d.id); setSearch('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium"
              style={{ background: dimension === d.id ? NEX.cyanDim : 'transparent', color: dimension === d.id ? NEX.cyan : NEX.textDim }}>
              <Icon d={d.icon} size={12} />{d.label}
            </button>
          ))}
        </div>

        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={dimension === 'product' ? 'Buscar produto ou SKU...' : 'Buscar cliente...'}
            className="bg-transparent text-[12.5px] focus:outline-none w-52" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>

        {/* Totals KPIs */}
        {totals && (
          <div className="flex items-center gap-4 ml-2">
            {[
              { label: 'Receita', value: <Money value={totals.revenue} /> },
              { label: 'COGS', value: <Money value={totals.cogs} /> },
              { label: 'Lucro bruto', value: <Money value={totals.grossProfit} />, highlight: totals.grossProfit >= 0 },
              { label: 'Margem', value: `${totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100).toFixed(1) : 0}%` },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="text-center">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>{label}</div>
                <div className="text-[13px] font-semibold" style={{ color: highlight !== undefined ? (highlight ? NEX.green : NEX.red) : NEX.text }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16" style={{ color: NEX.textMute }}>
            <div className="text-[13px]">Calculando...</div>
          </div>
        ) : dimension === 'product' ? (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>Produto</th>
                <SortableHeader label="Unid." sortKey="units" current={sortKey} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Pedidos" sortKey="ordersCount" current={sortKey} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Receita" sortKey="revenue" current={sortKey} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="COGS" sortKey="revenue" current={sortKey} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Lucro bruto" sortKey="grossProfit" current={sortKey} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Margem" sortKey="margin" current={sortKey} direction={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {productRows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px]" style={{ color: NEX.textMute }}>
                  Nenhum dado no período selecionado.
                </td></tr>
              )}
              {productRows.map((r) => (
                <tr key={r.productId} style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: NEX.text }}>{r.productName}</div>
                    {r.sku && <div className="text-[11px] font-mono" style={{ color: NEX.textMute }}>{r.sku}</div>}
                  </td>
                  <td className="px-4 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>{r.units}</td>
                  <td className="px-4 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>{r.ordersCount}</td>
                  <td className="px-4 text-[11.5px]"><Money value={r.revenue} muted /></td>
                  <td className="px-4 text-[11.5px]"><Money value={r.cogs} muted /></td>
                  <td className="px-4">
                    <span className="font-semibold text-[12.5px]" style={{ color: r.grossProfit >= 0 ? NEX.green : NEX.red }}>
                      <Money value={r.grossProfit} />
                    </span>
                  </td>
                  <td className="px-4">
                    <Pill tone={marginTone(r.margin)}>{r.margin.toFixed(1)}%</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>Cliente</th>
                <SortableHeader label="Pedidos" sortKey="ordersCount" current={sortKey} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Ticket médio" sortKey="revenue" current={sortKey} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Receita" sortKey="revenue" current={sortKey} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Lucro bruto" sortKey="grossProfit" current={sortKey} direction={sortDir} onSort={handleSort} />
                <SortableHeader label="Margem" sortKey="margin" current={sortKey} direction={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {customerRows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px]" style={{ color: NEX.textMute }}>
                  Nenhum dado no período selecionado.
                </td></tr>
              )}
              {customerRows.map((r) => (
                <tr key={r.customerId} style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: NEX.text }}>{r.customerName}</div>
                    <div><Pill tone="default">{r.customerType}</Pill></div>
                  </td>
                  <td className="px-4 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>{r.ordersCount}</td>
                  <td className="px-4 text-[11.5px]"><Money value={r.avgOrderValue} muted /></td>
                  <td className="px-4 text-[11.5px]"><Money value={r.revenue} muted /></td>
                  <td className="px-4">
                    <span className="font-semibold text-[12.5px]" style={{ color: r.grossProfit >= 0 ? NEX.green : NEX.red }}>
                      <Money value={r.grossProfit} />
                    </span>
                  </td>
                  <td className="px-4">
                    <Pill tone={marginTone(r.margin)}>{r.margin.toFixed(1)}%</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px]" style={{ color: NEX.textMute }}>
        {[
          { tone: 'green', label: '≥ 30% margem' },
          { tone: 'amber', label: '10–30% margem' },
          { tone: 'default', label: '0–10% margem' },
          { tone: 'red', label: 'Margem negativa' },
        ].map(({ tone, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: tone === 'green' ? NEX.green : tone === 'amber' ? NEX.amber : tone === 'red' ? NEX.red : nexAlpha('textDim', 0.5) }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
