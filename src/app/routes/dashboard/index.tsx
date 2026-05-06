import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, Pill, Bar, Spark, Icon, Icons, Money, NEX, EQUIPMENT_STATUS, ProductThumb, FilamentDot } from '@/lib/nex'
import { dashboardService, type DashboardStats } from '@/services/dashboard.service'
import { jobsService } from '@/services/jobs.service'
import { equipmentService } from '@/services/entities.service'
import type { ProductionJob, Equipment } from '@/types/api.types'

function KPICard({
  label, value, sub, delta, tone = 'cyan', spark, onClick,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  delta?: string
  tone?: 'cyan' | 'green' | 'amber' | 'red'
  spark?: number[]
  onClick?: () => void
}) {
  const toneColor = NEX[tone]
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-[#242C38]' : ''} transition-colors`}
      style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
    >
      <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: NEX.textMute }}>
        {label}
      </div>
      <div className="flex items-end gap-2 mb-1">
        {value}
        {spark && spark.length > 0 && <div className="ml-auto"><Spark data={spark} color={toneColor} /></div>}
      </div>
      {delta && <div className="text-[11px] font-medium" style={{ color: toneColor }}>{delta}</div>}
      {sub && <div className="text-[11px]" style={{ color: NEX.textDim }}>{sub}</div>}
    </div>
  )
}

function jobProgress(j: ProductionJob): number {
  if (!j.startedAt) return 0
  const total = (j.printTimeMinutes ?? 0) * (j.printsNeeded ?? 1)
  if (total <= 0) return 100
  const elapsedMin = (Date.now() - new Date(j.startedAt).getTime()) / 60000
  return Math.min(100, Math.max(0, Math.round((elapsedMin / total) * 100)))
}

function etaLabel(j: ProductionJob): string {
  if (!j.startedAt) return 'Aguardando'
  const total = (j.printTimeMinutes ?? 0) * (j.printsNeeded ?? 1)
  const elapsedMin = (Date.now() - new Date(j.startedAt).getTime()) / 60000
  const remaining = Math.max(0, total - elapsedMin)
  if (remaining <= 0) return 'Concluindo…'
  const h = Math.floor(remaining / 60)
  const m = Math.round(remaining % 60)
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}m` : `${m}min`
}

export function DashboardPage() {
  const navigate = useNavigate()

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardService.getStats(),
  })
  const { data: activeJobs = [] } = useQuery<ProductionJob[]>({
    queryKey: ['jobs', 'active'],
    queryFn: () => jobsService.findAll({ statusGroup: 'active' }),
    refetchInterval: 60_000,
  })
  const { data: equipmentRes } = useQuery({
    queryKey: ['equipment', 'list'],
    queryFn: () => equipmentService.findAll({ limit: 50 }),
  })
  const equipmentList: Equipment[] = equipmentRes?.data ?? []

  const filamentLow = (stats?.lowStock ?? []).filter((s) => s.type === 'MATERIAL')
  const accessoryLow = (stats?.lowStock ?? []).filter((s) => s.type === 'ACCESSORY')
  const productLow = (stats?.lowStock ?? []).filter((s) => s.type === 'PRODUCT')

  const sparkRevenue = (stats?.dailyRevenue ?? []).map((d) => Number(d.value))
  const monthRevenue = stats?.revenue ?? 0
  const margin = stats?.profitMargin ?? 0
  const pendingCount = (stats?.salesByStatus ?? []).find((s) => s.status === 'PENDING')?.count ?? 0
  const confirmedCount = (stats?.salesByStatus ?? []).find((s) => s.status === 'CONFIRMED')?.count ?? 0
  const printingCount = equipmentList.filter((e) => e.status === 'PRINTING').length
  const totalAlerts = filamentLow.length + accessoryLow.length + productLow.length

  const openResource = (
    tab: 'equipment' | 'materials' | 'accessories',
    idKey: 'equipmentId' | 'materialId' | 'accessoryId',
    id: string,
  ) => {
    const params = new URLSearchParams({ tab })
    params.set(idKey, id)
    navigate(`/resources?${params.toString()}`)
  }

  return (
    <div className="px-8 py-6 space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="Receita do mês"
          value={<Money value={monthRevenue} className="text-[24px] font-bold" />}
          spark={sparkRevenue}
          tone="green"
          delta={`${stats?.salesCount ?? 0} vendas no período`}
        />
        <KPICard
          label="Pedidos pendentes"
          value={<span className="text-[24px] font-bold tabular-nums">{pendingCount}</span>}
          sub={`${confirmedCount} confirmados`}
          tone="amber"
          onClick={() => navigate('/sales')}
        />
        <KPICard
          label="Jobs ativos"
          value={<span className="text-[24px] font-bold tabular-nums">{activeJobs.length}</span>}
          sub={`${printingCount} impressoras em uso`}
          tone="cyan"
          onClick={() => navigate('/resources')}
        />
        <KPICard
          label="Margem média"
          value={
            <span className="text-[24px] font-bold tabular-nums" style={{ color: NEX.green }}>
              {margin.toFixed(1)}%
            </span>
          }
          tone="green"
          delta={stats?.failureRate !== undefined ? `Falhas: ${stats.failureRate.toFixed(1)}%` : undefined}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <Card padding={false}>
            <div className="px-4 py-3 flex items-center" style={{ borderBottom: `1px solid ${NEX.border}` }}>
              <div className="text-[13px] font-semibold">Produção em curso</div>
              <span className="ml-2 text-[11px]" style={{ color: NEX.textDim }}>· {activeJobs.length} jobs</span>
              <button onClick={() => navigate('/resources')} className="ml-auto text-[11.5px]" style={{ color: NEX.cyan }}>
                Ver impressoras →
              </button>
            </div>
            {activeJobs.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px]" style={{ color: NEX.textMute }}>
                Nenhum job em produção no momento.
              </div>
            ) : (
              <div>
                {activeJobs.slice(0, 6).map((j) => {
                  const progress = jobProgress(j)
                  const isDone = progress >= 100
                  return (
                    <div
                      key={j.id}
                      className="px-4 py-3 flex items-center gap-4 hover:bg-[#11161E] transition-colors cursor-pointer"
                      style={{ borderTop: `1px solid ${NEX.border}` }}
                      onClick={() => navigate(`/production?view=table&job=${j.id}&source=dashboard`)}
                    >
                      <div
                        className="h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}
                      >
                        <Icon d={Icons.printer} size={15} style={{ color: isDone ? NEX.green : NEX.cyan }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px]" style={{ color: NEX.textMute }}>{j.jobNumber}</span>
                          <Pill tone="default">{j.status}</Pill>
                        </div>
                        <div className="text-[12.5px] font-medium mt-0.5">
                          {j.product?.name ?? '—'} · {j.quantityOrdered} un
                        </div>
                        <div className="text-[10.5px] mt-0.5" style={{ color: NEX.textDim }}>
                          {j.equipment?.name ?? 'Sem equipamento'}
                        </div>
                      </div>
                      <div className="w-44">
                        <div className="flex items-center justify-between mb-1 text-[11px]">
                          <span style={{ color: NEX.textDim }}>{isDone ? 'Concluído' : `ETA ${etaLabel(j)}`}</span>
                          <span className="font-mono font-semibold" style={{ color: isDone ? NEX.green : NEX.cyan }}>
                            {progress}%
                          </span>
                        </div>
                        <Bar value={progress} tone={isDone ? 'green' : 'cyan'} height={5} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card padding={false}>
            <div className="px-4 py-3 flex items-center" style={{ borderBottom: `1px solid ${NEX.border}` }}>
              <div className="text-[13px] font-semibold">Pedidos recentes</div>
              <button onClick={() => navigate('/sales')} className="ml-auto text-[11.5px]" style={{ color: NEX.cyan }}>
                Ver todos →
              </button>
            </div>
            {(stats?.recentSales ?? []).length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px]" style={{ color: NEX.textMute }}>
                Nenhuma venda recente.
              </div>
            ) : (
              <table className="w-full text-[12.5px]">
                <tbody>
                  {(stats?.recentSales ?? []).slice(0, 5).map((s) => {
                    const subtotal = (s.items ?? []).reduce(
                      (acc, it) => acc + Number(it.quantity ?? 0) * Number(it.unitPrice ?? 0), 0,
                    )
                    const total = subtotal + Number(s.shippingCost ?? 0) - Number(s.discount ?? 0)
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-[#11161E] cursor-pointer"
                        style={{ borderTop: `1px solid ${NEX.border}` }}
                        onClick={() => navigate(`/sales/${s.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-[11px]" style={{ color: NEX.textDim }}>{s.orderNumber}</td>
                        <td className="px-2 font-medium">{s.customer?.name ?? '—'}</td>
                        <td className="px-2"><Pill tone="default">{s.channel?.name ?? '—'}</Pill></td>
                        <td className="px-2"><Pill tone={s.status === 'PENDING' ? 'amber' : 'cyan'}>{s.status}</Pill></td>
                        <td className="px-4 text-right"><Money value={total} className="font-semibold" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card padding={false}>
            <div className="px-4 py-3 flex items-center" style={{ borderBottom: `1px solid ${NEX.border}` }}>
              <Icon d={Icons.alert} size={13} className="mr-2" style={{ color: NEX.amber }} />
              <div className="text-[13px] font-semibold">Alertas de estoque</div>
              <span className="ml-auto text-[11px] font-mono" style={{ color: NEX.amber }}>{totalAlerts}</span>
            </div>

            {productLow.length > 0 && (
              <div className="px-4 py-3" style={{ borderTop: `1px solid ${NEX.border}` }}>
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>
                  Produtos abaixo do mínimo
                </div>
                <div className="space-y-1.5">
                  {productLow.slice(0, 6).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="w-full flex items-center gap-2 text-[11.5px] text-left hover:opacity-90"
                      onClick={() => navigate(`/products?edit=${v.id}`)}
                    >
                      <ProductThumb id={v.id} name={v.name} size={18} />
                      <span className="flex-1 truncate font-medium">{v.name}</span>
                      <span className="font-mono font-semibold" style={{ color: v.current === 0 ? NEX.red : NEX.amber }}>
                        {v.current}/{v.minimum}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filamentLow.length > 0 && (
              <div className="px-4 py-3" style={{ borderTop: `1px solid ${NEX.border}` }}>
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>Materiais</div>
                <div className="space-y-1.5">
                  {filamentLow.slice(0, 6).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="w-full flex items-center gap-2 text-[11.5px] text-left hover:opacity-90"
                      onClick={() => openResource('materials', 'materialId', f.id)}
                    >
                      <FilamentDot color={NEX.cyan} />
                      <span className="flex-1 truncate font-medium">{f.name}</span>
                      <span className="font-mono font-semibold" style={{ color: NEX.amber }}>
                        {f.current.toFixed(1)}/{f.minimum.toFixed(1)} kg
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {accessoryLow.length > 0 && (
              <div className="px-4 py-3" style={{ borderTop: `1px solid ${NEX.border}` }}>
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>Acessórios</div>
                <div className="space-y-1.5">
                  {accessoryLow.slice(0, 6).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="w-full flex items-center gap-2 text-[11.5px] text-left hover:opacity-90"
                      onClick={() => openResource('accessories', 'accessoryId', a.id)}
                    >
                      <Icon d={Icons.pkg} size={11} className="opacity-60" />
                      <span className="flex-1 truncate font-medium">{a.name}</span>
                      <span className="font-mono font-semibold" style={{ color: NEX.amber }}>
                        {a.current}/{a.minimum}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {totalAlerts === 0 && (
              <div className="px-4 py-6 text-center text-[12px]" style={{ color: NEX.textMute }}>Sem alertas ativos.</div>
            )}
          </Card>

          <Card padding={false}>
            <div className="px-4 py-3 flex items-center" style={{ borderBottom: `1px solid ${NEX.border}` }}>
              <div className="text-[13px] font-semibold">Frota de impressoras</div>
              <button onClick={() => navigate('/resources')} className="ml-auto text-[11.5px]" style={{ color: NEX.cyan }}>
                Detalhes →
              </button>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {equipmentList.map((e) => {
                const lifePct = (e.estimatedLifespanHours ?? 0) > 0
                  ? Math.min(100, (e.totalPrintHours / e.estimatedLifespanHours) * 100) : 0
                const tone = lifePct >= 95 ? 'red' : lifePct >= 85 ? 'amber' : lifePct >= 70 ? 'cyan' : 'green'
                const st = EQUIPMENT_STATUS[e.status] ?? EQUIPMENT_STATUS.AVAILABLE
                return (
                  <button
                    key={e.id}
                    type="button"
                    className="w-full flex items-center gap-2.5 text-left hover:opacity-90"
                    onClick={() => openResource('equipment', 'equipmentId', e.id)}
                  >
                    <div
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${e.status === 'PRINTING' ? 'nex-pulse' : ''}`}
                      style={{ background: st.tone === 'default' ? NEX.textMute : NEX[st.tone] }}
                    />
                    <span className="text-[11.5px] font-medium flex-1 truncate">{e.name}</span>
                    <span className="text-[10.5px] font-mono w-10 text-right" style={{ color: NEX[tone] }}>
                      {lifePct.toFixed(0)}%
                    </span>
                    <div className="w-14"><Bar value={lifePct} tone={tone} height={3} /></div>
                  </button>
                )
              })}
              {equipmentList.length === 0 && (
                <div className="py-2 text-[12px]" style={{ color: NEX.textMute }}>Nenhum equipamento cadastrado.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
