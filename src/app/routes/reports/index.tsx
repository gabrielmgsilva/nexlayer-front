import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Btn, Pill, Money, Num, Donut, NEX, nexAlpha, Icon, Icons } from '@/lib/nex'
import { reportsService, type CostVarianceRow } from '@/services/reports.service'

type Tab = 'pnl' | 'variance' | 'commissions'

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) }

const CHANNEL_PALETTE = [NEX.cyan, NEX.violet, NEX.green, NEX.amber, NEX.red]

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('pnl')
  const [monthOffset, setMonthOffset] = useState(0)

  const baseMonth = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  }, [monthOffset])
  const from = startOfMonth(baseMonth).toISOString()
  const to = endOfMonth(baseMonth).toISOString()
  const monthLabel = baseMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          {([
            { id: 'pnl' as Tab,         label: 'P&L Mensal' },
            { id: 'variance' as Tab,    label: 'Custo Real vs Snapshot' },
            { id: 'commissions' as Tab, label: 'Comissões' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 h-8 rounded text-[12px] font-medium"
              style={{
                background: tab === t.id ? NEX.cyanDim : 'transparent',
                color: tab === t.id ? NEX.cyan : NEX.textDim,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Btn size="sm" onClick={() => setMonthOffset((v) => v - 1)}>← Mês anterior</Btn>
          <div className="text-[12.5px] font-medium px-3 capitalize" style={{ color: NEX.text }}>{monthLabel}</div>
          <Btn size="sm" disabled={monthOffset >= 0} onClick={() => setMonthOffset((v) => v + 1)}>Próximo →</Btn>
        </div>
      </div>

      {tab === 'pnl' && <PnlTab from={from} to={to} />}
      {tab === 'variance' && <VarianceTab from={from} to={to} />}
      {tab === 'commissions' && <CommissionsTab from={from} to={to} />}
    </div>
  )
}

// ─────────────────────────────────────────
// P&L
// ─────────────────────────────────────────
function PnlTab({ from, to }: { from: string; to: string }) {
  const { data: pnl, isLoading: l1 } = useQuery({
    queryKey: ['reports', 'pnl', from, to],
    queryFn: () => reportsService.pnl({ from, to }),
  })
  const { data: byCh, isLoading: l2 } = useQuery({
    queryKey: ['reports', 'pnl-by-channel', from, to],
    queryFn: () => reportsService.pnlByChannel({ from, to }),
  })

  if (l1 || l2 || !pnl || !byCh) return <Card><div style={{ color: NEX.textDim }}>Carregando relatório...</div></Card>

  const exportCsv = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Receita bruta', String(pnl.revenue)],
      ['Descontos', String(pnl.discount)],
      ['Receita líquida', String(pnl.netRevenue)],
      ['CMV (custo dos itens)', String(pnl.cogs)],
      ['Frete', String(pnl.shipping)],
      ['Comissões', String(pnl.commissions)],
      ['Taxas fixas', String(pnl.fixedFees)],
      ['Taxas variáveis', String(pnl.variableFees)],
      ['Lucro bruto', String(pnl.grossProfit)],
      ['Margem (%)', pnl.margin.toFixed(2)],
    ]
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pnl_${from.slice(0, 10)}_${to.slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Receita líquida" value={<Money value={pnl.netRevenue} />} accent={NEX.cyan} />
        <Kpi label="CMV"             value={<Money value={pnl.cogs} />} />
        <Kpi label="Comissões + Taxas" value={<Money value={pnl.totalFees} />} />
        <Kpi
          label="Lucro / Margem"
          value={<><Money value={pnl.grossProfit} /> <span className="text-[12px]" style={{ color: pnl.grossProfit >= 0 ? NEX.green : NEX.red }}>· {pnl.margin.toFixed(1)}%</span></>}
          accent={pnl.grossProfit >= 0 ? NEX.green : NEX.red}
        />
      </div>

      {/* Stacked bars by channel */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-[14px]">Receita por canal</div>
          <Btn size="sm" icon={Icons.download} onClick={exportCsv}>Exportar CSV</Btn>
        </div>
        <ChannelStackedBar channels={byCh.channels} />
      </Card>

      {/* Tabela detalhada */}
      <Card padding={false}>
        <div className="px-4 py-3 font-semibold text-[13.5px]" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          Detalhes por canal
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ color: NEX.textMute, borderBottom: `1px solid ${NEX.border}` }}>
              <Th align="left">Canal</Th>
              <Th>Pedidos</Th>
              <Th>Receita</Th>
              <Th>CMV</Th>
              <Th>Comissões</Th>
              <Th>Taxas</Th>
              <Th>Lucro</Th>
              <Th>Margem</Th>
            </tr>
          </thead>
          <tbody>
            {byCh.channels.map((ch) => (
              <tr key={ch.channelId} style={{ borderBottom: `1px solid ${NEX.border}` }}>
                <Td align="left">{ch.channelName}</Td>
                <Td><Num value={ch.ordersCount} /></Td>
                <Td><Money value={ch.netRevenue} /></Td>
                <Td><Money value={ch.cogs} muted /></Td>
                <Td><Money value={ch.commissions} muted /></Td>
                <Td><Money value={ch.fixedFees + ch.variableFees} muted /></Td>
                <Td><span style={{ color: ch.grossProfit >= 0 ? NEX.green : NEX.red }}><Money value={ch.grossProfit} /></span></Td>
                <Td><span style={{ color: ch.grossProfit >= 0 ? NEX.green : NEX.red }}>{ch.margin.toFixed(1)}%</span></Td>
              </tr>
            ))}
            {byCh.channels.length === 0 && (
              <tr><td colSpan={8} className="text-center py-6" style={{ color: NEX.textMute }}>Sem dados no período.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function ChannelStackedBar({ channels }: { channels: Array<{ channelId: string; channelName: string; netRevenue: number }> }) {
  const total = channels.reduce((s, c) => s + Math.max(0, c.netRevenue), 0) || 1
  return (
    <div>
      <div className="flex h-10 rounded overflow-hidden" style={{ background: NEX.surface2 }}>
        {channels.map((c, i) => {
          const pct = (Math.max(0, c.netRevenue) / total) * 100
          if (pct === 0) return null
          const color = CHANNEL_PALETTE[i % CHANNEL_PALETTE.length]
          return (
            <div key={c.channelId} style={{ width: `${pct}%`, background: color }} title={`${c.channelName}: R$ ${c.netRevenue.toFixed(2)}`} />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {channels.map((c, i) => (
          <div key={c.channelId} className="flex items-center gap-2 text-[11.5px]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHANNEL_PALETTE[i % CHANNEL_PALETTE.length] }} />
            <span style={{ color: NEX.textDim }}>{c.channelName}</span>
            <span className="font-mono"><Money value={c.netRevenue} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Variance
// ─────────────────────────────────────────
function VarianceTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'variance', from, to],
    queryFn: () => reportsService.costVariance({ from, to }),
  })

  if (isLoading || !data) return <Card><div style={{ color: NEX.textDim }}>Carregando variance...</div></Card>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Custo snapshot total"       value={<Money value={data.totals.snapshotTotalCost} />} />
        <Kpi label="Custo real total"           value={<Money value={data.totals.realTotalCost} />} />
        <Kpi
          label="Δ absoluto"
          value={<Money value={data.totals.deltaAbs} />}
          accent={data.totals.deltaAbs <= 0 ? NEX.green : NEX.red}
        />
        <Kpi
          label="Δ relativo"
          value={`${data.totals.deltaPct.toFixed(1)}%`}
          accent={data.totals.deltaPct <= 0 ? NEX.green : NEX.red}
        />
      </div>

      <Card padding={false}>
        <div className="px-4 py-3 font-semibold text-[13.5px]" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          Jobs entregues no período
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ color: NEX.textMute, borderBottom: `1px solid ${NEX.border}` }}>
              <Th align="left">Job</Th>
              <Th align="left">Produto</Th>
              <Th>Qtd</Th>
              <Th>Material snapshot</Th>
              <Th>Material real</Th>
              <Th>Total snapshot</Th>
              <Th>Total real</Th>
              <Th>Δ%</Th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r: CostVarianceRow) => {
              const negative = r.deltaPct > 10
              return (
                <tr key={r.jobId} style={{
                  borderBottom: `1px solid ${NEX.border}`,
                  background: negative ? nexAlpha('red', 0.05) : 'transparent',
                }}>
                  <Td align="left"><span className="font-mono text-[11.5px]">{r.jobNumber}</span></Td>
                  <Td align="left">{r.productName}</Td>
                  <Td><Num value={r.quantity} /></Td>
                  <Td><Money value={r.snapshotMaterialCost} muted /></Td>
                  <Td><Money value={r.realMaterialCost} /></Td>
                  <Td><Money value={r.snapshotTotalCost} muted /></Td>
                  <Td><Money value={r.realTotalCost} /></Td>
                  <Td>
                    <Pill tone={r.deltaPct > 10 ? 'red' : r.deltaPct < -5 ? 'green' : 'default'}>
                      {r.deltaPct >= 0 ? '+' : ''}{r.deltaPct.toFixed(1)}%
                    </Pill>
                  </Td>
                </tr>
              )
            })}
            {data.rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-6" style={{ color: NEX.textMute }}>Nenhum job entregue no período.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────
// Commissions
// ─────────────────────────────────────────
function CommissionsTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'commissions', from, to],
    queryFn: () => reportsService.commissions({ from, to }),
  })

  if (isLoading || !data) return <Card><div style={{ color: NEX.textDim }}>Carregando comissões...</div></Card>

  const segments = data.channels
    .filter((c) => c.total > 0)
    .map((c, i) => ({ value: c.total, color: CHANNEL_PALETTE[i % CHANNEL_PALETTE.length] }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
      <Card>
        <div className="text-[12px] mb-3" style={{ color: NEX.textDim }}>Total de comissões + taxas</div>
        <div className="flex items-center justify-center mb-3">
          <Donut segments={segments} size={140} thickness={18}
                 centerLabel="TOTAL"
                 centerValue={`R$ ${data.total.toFixed(0)}`} />
        </div>
        <div className="space-y-1.5">
          {data.channels.map((c, i) => (
            <div key={c.channelId} className="flex items-center gap-2 text-[11.5px]">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHANNEL_PALETTE[i % CHANNEL_PALETTE.length] }} />
              <span className="flex-1" style={{ color: NEX.textDim }}>{c.channelName}</span>
              <span className="font-mono"><Money value={c.total} /></span>
            </div>
          ))}
        </div>
      </Card>

      <Card padding={false}>
        <div className="px-4 py-3 font-semibold text-[13.5px]" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          Detalhes por canal
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ color: NEX.textMute, borderBottom: `1px solid ${NEX.border}` }}>
              <Th align="left">Canal</Th>
              <Th>Receita</Th>
              <Th>Comissão (%)</Th>
              <Th>Taxa fixa</Th>
              <Th>Taxa variável</Th>
              <Th>Total</Th>
            </tr>
          </thead>
          <tbody>
            {data.channels.map((c) => (
              <tr key={c.channelId} style={{ borderBottom: `1px solid ${NEX.border}` }}>
                <Td align="left">{c.channelName}</Td>
                <Td><Money value={c.revenue} /></Td>
                <Td><Money value={c.commissions} /></Td>
                <Td><Money value={c.fixedFees} muted /></Td>
                <Td><Money value={c.variableFees} muted /></Td>
                <Td><Money value={c.total} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function Kpi({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <Card>
      <div className="text-[10.5px] uppercase tracking-wider mb-1.5" style={{ color: NEX.textMute }}>{label}</div>
      <div className="text-[22px] font-bold tabular-nums" style={{ color: accent ?? NEX.text }}>{value}</div>
    </Card>
  )
}
function Th({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide" style={{ textAlign: align }}>{children}</th>
}
function Td({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return <td className="px-3 py-2.5" style={{ textAlign: align }}>{children}</td>
}

// silence Icon import if unused
void Icon
