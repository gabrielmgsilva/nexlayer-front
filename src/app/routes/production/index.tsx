import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { Card, Btn, Pill, Icon, Icons, NEX, JOB_STATUS_TONE, EQUIPMENT_STATUS, Bar, Money, Num, nexAlpha } from '@/lib/nex'
import { JOB_STATUS_LABELS } from '@/lib/constants'
import { jobsService, type QueueJob, type QueueLane, type TimelineLane } from '@/services/jobs.service'
import type { CostSnapshot, ProductionJob } from '@/types/api.types'

type ViewMode = 'table' | 'queue' | 'timeline'
type StatusGroupFilter = 'active' | 'finished' | 'all'

export function ProductionPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const paramView = searchParams.get('view')
  const view: ViewMode = paramView === 'queue' || paramView === 'timeline' || paramView === 'table'
    ? paramView
    : 'table'
  const focusJobId = searchParams.get('job') ?? ''
  const source = searchParams.get('source') ?? ''

  const setView = (nextView: ViewMode) => {
    if (nextView === view) return
    const next = new URLSearchParams(searchParams)
    next.set('view', nextView)
    setSearchParams(next, { replace: true })
  }

  const clearFocus = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('job')
    next.delete('source')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px]" style={{ color: NEX.textDim }}>
            Recrie e acompanhe o fluxo completo da produção: tabela operacional, fila por máquina e timeline de 48h.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
            {(['table', 'queue', 'timeline'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 h-8 rounded text-[12px] font-medium"
                style={{
                  background: view === v ? NEX.cyanDim : 'transparent',
                  color: view === v ? NEX.cyan : NEX.textDim,
                }}
              >
                {v === 'table' ? 'Tabela' : v === 'queue' ? 'Fila (Kanban)' : 'Timeline 48h'}
              </button>
            ))}
          </div>
          <Btn kind="primary" size="sm" icon={Icons.plus} onClick={() => navigate('/calculator')}>
            Novo job
          </Btn>
        </div>
      </div>

      {focusJobId && (
        <Card>
          <div className="flex items-center gap-2 text-[12px]">
            <Icon d={Icons.check} size={13} style={{ color: NEX.cyan }} />
            <span>
              Job em foco: <span className="font-mono font-semibold">{focusJobId.slice(0, 8)}</span>
              {source === 'calculator' ? ' (criado a partir da Calculadora)' : ''}
            </span>
            <button className="ml-auto underline" style={{ color: NEX.textDim }} onClick={clearFocus}>
              Limpar foco
            </button>
          </div>
        </Card>
      )}

      {view === 'table' ? <TableView focusJobId={focusJobId} /> : view === 'queue' ? <QueueView focusJobId={focusJobId} /> : <TimelineView />}
    </div>
  )
}

function TableView({ focusJobId }: { focusJobId?: string }) {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusGroup, setStatusGroup] = useState<StatusGroupFilter>('active')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(focusJobId || null)

  const { data: jobs = [], isLoading } = useQuery<ProductionJob[]>({
    queryKey: ['production', 'table', statusGroup],
    queryFn: () => jobsService.findAll(statusGroup === 'all' ? undefined : { statusGroup }),
    refetchInterval: 30_000,
  })

  const { data: selectedJob, isLoading: isLoadingJobDetail } = useQuery<ProductionJob>({
    queryKey: ['production', 'job', selectedJobId],
    queryFn: () => jobsService.findOne(selectedJobId!),
    enabled: !!selectedJobId,
  })

  const { data: costHistory = [] } = useQuery<CostSnapshot[]>({
    queryKey: ['production', 'cost-history', selectedJobId],
    queryFn: () => jobsService.getCostHistory(selectedJobId!),
    enabled: !!selectedJobId,
  })

  useEffect(() => {
    if (!focusJobId) return
    setSelectedJobId(focusJobId)
  }, [focusJobId])

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => jobsService.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      toast.success('Status atualizado')
      qc.invalidateQueries({ queryKey: ['production', 'table'] })
      qc.invalidateQueries({ queryKey: ['production', 'queue'] })
      qc.invalidateQueries({ queryKey: ['production', 'timeline'] })
      qc.invalidateQueries({ queryKey: ['production', 'job', variables.id] })
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Falha ao atualizar status'),
  })

  const recalculateMutation = useMutation({
    mutationFn: (id: string) => jobsService.recalculate(id),
    onSuccess: (_data, jobId) => {
      toast.success('Cálculo atualizado')
      qc.invalidateQueries({ queryKey: ['production', 'table'] })
      qc.invalidateQueries({ queryKey: ['production', 'job', jobId] })
      qc.invalidateQueries({ queryKey: ['production', 'cost-history', jobId] })
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Falha ao recalcular custo'),
  })

  const statusOptions = useMemo(() => {
    const unique = new Set(jobs.map((j) => j.status))
    return ['all', ...Array.from(unique)]
  }, [jobs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return jobs.filter((j) => {
      const byStatus = statusFilter === 'all' || j.status === statusFilter
      if (!byStatus) return false
      if (!q) return true
      return [
        j.jobNumber,
        j.product?.name ?? '',
        j.customer?.name ?? '',
      ].join(' ').toLowerCase().includes(q)
    })
  }, [jobs, search, statusFilter])

  const latestSnapshot = selectedJob?.costSnapshots?.[0] ?? costHistory[0]
  const sortedChannelPrices = useMemo(() => {
    if (!selectedJob?.product?.channelPrices?.length) return []
    return [...selectedJob.product.channelPrices].sort((a, b) => {
      const nameA = a.channel?.name ?? ''
      const nameB = b.channel?.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [selectedJob?.product?.channelPrices])
  const nextDetailActions = selectedJob ? nextStatusFor(selectedJob.status, !!selectedJob.customerId) : []

  const openInKanban = (jobId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('view', 'queue')
    next.set('job', jobId)
    next.set('source', 'table')
    setSearchParams(next)
    setSelectedJobId(null)
  }

  if (isLoading) return <Card><div style={{ color: NEX.textDim }}>Carregando jobs...</div></Card>

  return (
    <>
      <Card padding={false}>
        <div className="p-4 flex flex-wrap items-center gap-2" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[12px] font-semibold mr-2">Fluxo de Produção</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar job, produto, cliente..."
            className="h-8 px-3 rounded text-[12px] min-w-[220px]"
            style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, color: NEX.text }}
          />
          <select
            value={statusGroup}
            onChange={(e) => {
              setStatusGroup(e.target.value as StatusGroupFilter)
              setStatusFilter('all')
            }}
            className="h-8 px-2 rounded text-[12px]"
            style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, color: NEX.text }}
          >
            <option value="active">Ativos</option>
            <option value="finished">Finalizados</option>
            <option value="all">Todos</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 rounded text-[12px]"
            style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, color: NEX.text }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'Status: todos' : s}</option>
            ))}
          </select>
          <div className="ml-auto text-[11px]" style={{ color: NEX.textDim }}>
            {filtered.length} job(s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Job</th>
                <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Cliente</th>
                <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Produto</th>
                <th className="text-right px-2 py-2 text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Qtd</th>
                <th className="text-right px-2 py-2 text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Custo/un</th>
                <th className="text-right px-2 py-2 text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Preço/un</th>
                <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Status</th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ color: NEX.textDim }}>
                    Nenhum job encontrado para os filtros atuais.
                  </td>
                </tr>
              )}
              {filtered.map((job) => {
                const snapshot = job.costSnapshots?.[0]
                const next = nextStatusFor(job.status, !!job.customer?.id)
                const highlighted = (!!focusJobId && job.id === focusJobId) || job.id === selectedJobId
                return (
                  <tr
                    key={job.id}
                    className="cursor-pointer hover:bg-[#11161E]"
                    onClick={() => setSelectedJobId(job.id)}
                    style={{
                      borderTop: `1px solid ${NEX.border}`,
                      background: highlighted ? nexAlpha('cyan', 0.09) : undefined,
                    }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-mono font-semibold text-[11.5px]">{job.jobNumber}</div>
                      {job.dueDate && (
                        <div className="text-[10.5px]" style={{ color: NEX.textMute }}>
                          Prazo: {new Date(job.dueDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-2">{job.customer?.name ?? 'Estoque'}</td>
                    <td className="px-2">{job.product?.name ?? '-'}</td>
                    <td className="px-2 text-right font-mono"><Num value={job.quantityOrdered} /></td>
                    <td className="px-2 text-right"><Money value={Number(snapshot?.unitCostWithError ?? 0)} /></td>
                    <td className="px-2 text-right"><Money value={Number(snapshot?.unitSalePrice ?? 0)} /></td>
                    <td className="px-2"><Pill tone={JOB_STATUS_TONE[job.status] ?? 'default'}>{statusLabel(job.status)}</Pill></td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end flex-wrap gap-1">
                        {next.length === 0 ? (
                          <span className="text-[10.5px]" style={{ color: NEX.textMute }}>-</span>
                        ) : (
                          next.map((s) => (
                            <Btn
                              key={s.value}
                              kind={s.kind}
                              size="sm"
                              disabled={statusMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation()
                                statusMutation.mutate({ id: job.id, status: s.value })
                              }}
                            >
                              {s.label}
                            </Btn>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedJobId && (
        <>
          <div
            className="fixed inset-0 z-30"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={() => setSelectedJobId(null)}
          />
          <aside
            className="fixed top-0 right-0 bottom-0 z-40 flex flex-col"
            style={{ width: 520, background: NEX.surface, borderLeft: `1px solid ${NEX.border}` }}
          >
            <div className="px-5 py-4 flex items-center" style={{ borderBottom: `1px solid ${NEX.border}` }}>
              <div>
                <div className="font-mono text-[11px]" style={{ color: NEX.textMute }}>{selectedJob?.jobNumber ?? selectedJobId}</div>
                <div className="text-[15px] font-semibold mt-0.5">{selectedJob?.product?.name ?? 'Detalhe do job'}</div>
              </div>
              {selectedJob?.status && (
                <Pill tone={JOB_STATUS_TONE[selectedJob.status] ?? 'default'} className="ml-3">{statusLabel(selectedJob.status)}</Pill>
              )}
              <button
                onClick={() => setSelectedJobId(null)}
                className="ml-auto h-8 w-8 rounded-md flex items-center justify-center hover:bg-[#11161E]"
              >
                <Icon d={Icons.x} size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {isLoadingJobDetail ? (
                <div className="text-[12px]" style={{ color: NEX.textDim }}>Carregando detalhes do job...</div>
              ) : !selectedJob ? (
                <div className="text-[12px]" style={{ color: NEX.textDim }}>Não foi possível carregar o job.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Cliente</div>
                      <div className="mt-0.5 font-medium">{selectedJob.customer?.name ?? 'Estoque'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Equipamento</div>
                      <div className="mt-0.5 font-medium">{selectedJob.equipment?.name ?? 'Sem máquina'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Modo</div>
                      <div className="mt-0.5 font-medium">{selectedJob.productionMode} · {selectedJob.batchStrategy}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Prioridade</div>
                      <div className="mt-0.5 font-medium">{selectedJob.priority}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Quantidade</div>
                      <div className="mt-0.5 font-mono">{selectedJob.quantityOrdered} un</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Tempo total</div>
                      <div className="mt-0.5 font-mono">{formatDuration(selectedJob.printTimeMinutes * selectedJob.printsNeeded)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Prazo</div>
                      <div className="mt-0.5 font-medium">{selectedJob.dueDate ? new Date(selectedJob.dueDate).toLocaleDateString('pt-BR') : '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Criado em</div>
                      <div className="mt-0.5 font-medium">{formatDateTime(selectedJob.createdAt)}</div>
                    </div>
                  </div>

                  {selectedJob.notes && (
                    <div className="rounded-md p-3 text-[12px]" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: NEX.textMute }}>Observações</div>
                      <div style={{ color: NEX.textDim }}>{selectedJob.notes}</div>
                    </div>
                  )}

                  <div className="rounded-md p-3" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: NEX.textMute }}>Resumo de custo atual</div>
                    {latestSnapshot ? (
                      <>
                        <div className="grid grid-cols-3 gap-2 text-[12px] mb-3">
                          <div>
                            <div style={{ color: NEX.textDim }}>Custo/un</div>
                            <div className="font-semibold"><Money value={Number(latestSnapshot.unitCostWithError)} /></div>
                          </div>
                          <div>
                            <div style={{ color: NEX.textDim }}>Preço/un</div>
                            <div className="font-semibold"><Money value={Number(latestSnapshot.unitSalePrice)} /></div>
                          </div>
                          <div>
                            <div style={{ color: NEX.textDim }}>Lucro/un</div>
                            <div className="font-semibold" style={{ color: NEX.green }}><Money value={Number(latestSnapshot.unitProfit)} /></div>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-[11.5px]">
                          <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Material</span><Money value={Number(latestSnapshot.unitMaterialCost)} /></div>
                          <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Energia</span><Money value={Number(latestSnapshot.unitElectricityCost)} /></div>
                          <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Depreciação</span><Money value={Number(latestSnapshot.unitDepreciationCost)} /></div>
                          <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Manutenção</span><Money value={Number(latestSnapshot.unitMaintenanceCost)} /></div>
                          <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Mão de obra</span><Money value={Number(latestSnapshot.unitLaborCost)} /></div>
                          <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Overhead</span><Money value={Number(latestSnapshot.unitOverheadCost)} /></div>
                          <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Acessórios</span><Money value={Number(latestSnapshot.unitAccessoriesCost)} /></div>
                          <div className="flex justify-between"><span style={{ color: NEX.textDim }}>Buffer de falha</span><Money value={Number(latestSnapshot.unitFailureBufferCost)} /></div>
                        </div>
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: NEX.border }}>
                          <div className="flex justify-between text-[12px]"><span style={{ color: NEX.textDim }}>Custo total lote</span><Money value={Number(latestSnapshot.batchTotalCost)} /></div>
                          <div className="flex justify-between text-[12px]"><span style={{ color: NEX.textDim }}>Venda total lote</span><Money value={Number(latestSnapshot.batchTotalSalePrice)} /></div>
                          <div className="flex justify-between text-[12px] font-semibold"><span style={{ color: NEX.text }}>Lucro total lote</span><span style={{ color: NEX.green }}><Money value={Number(latestSnapshot.batchTotalProfit)} /></span></div>
                        </div>
                      </>
                    ) : (
                      <div className="text-[12px]" style={{ color: NEX.textDim }}>Sem snapshot de custo para este job.</div>
                    )}
                  </div>

                  <div className="rounded-md p-3" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: NEX.textMute }}>
                      Preço por canal de venda
                    </div>
                    {sortedChannelPrices.length > 0 ? (
                      <div className="space-y-1.5 text-[11.5px]">
                        {sortedChannelPrices.map((entry) => (
                          <div key={entry.id} className="flex justify-between gap-2">
                            <span className="truncate" style={{ color: NEX.textDim }}>
                              {entry.channel?.name ?? 'Canal'}
                            </span>
                            <span className="font-semibold"><Money value={Number(entry.price)} /></span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12px]" style={{ color: NEX.textDim }}>
                        Sem preços por canal para este produto.
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: NEX.textMute }}>
                      Histórico de snapshots ({costHistory.length})
                    </div>
                    <div className="space-y-1.5">
                      {costHistory.length === 0 && (
                        <div className="text-[11.5px]" style={{ color: NEX.textDim }}>Nenhum snapshot encontrado.</div>
                      )}
                      {costHistory.map((snap) => (
                        <div
                          key={snap.id}
                          className="rounded-md p-2.5 text-[11.5px]"
                          style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono">v{snap.version}</span>
                            <span style={{ color: NEX.textMute }}>{formatDateTime(snap.createdAt)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <div style={{ color: NEX.textMute }}>Custo/un</div>
                              <Money value={Number(snap.unitCostWithError)} />
                            </div>
                            <div>
                              <div style={{ color: NEX.textMute }}>Preço/un</div>
                              <Money value={Number(snap.unitSalePrice)} />
                            </div>
                            <div>
                              <div style={{ color: NEX.textMute }}>Lucro/un</div>
                              <span style={{ color: NEX.green }}><Money value={Number(snap.unitProfit)} /></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-4" style={{ borderTop: `1px solid ${NEX.border}` }}>
              <div className="flex flex-wrap gap-2">
                {selectedJob && nextDetailActions.length > 0 && nextDetailActions.map((s) => (
                  <Btn
                    key={s.value}
                    kind={s.kind}
                    size="md"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: selectedJob.id, status: s.value })}
                  >
                    {s.label}
                  </Btn>
                ))}
                {selectedJob && (
                  <Btn
                    kind="soft"
                    size="md"
                    icon={Icons.printer}
                    onClick={() => openInKanban(selectedJob.id)}
                  >
                    Abrir no Kanban
                  </Btn>
                )}
                {selectedJob && (
                  <Btn
                    kind="ghost"
                    size="md"
                    icon={Icons.calc}
                    disabled={recalculateMutation.isPending}
                    onClick={() => recalculateMutation.mutate(selectedJob.id)}
                  >
                    {recalculateMutation.isPending ? 'Recalculando...' : 'Recalcular custo'}
                  </Btn>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  )
}

// ─────────────────────────────────────────
// QUEUE / KANBAN
// ─────────────────────────────────────────
function QueueView({ focusJobId }: { focusJobId?: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['production', 'queue'],
    queryFn: () => jobsService.getQueue(),
    refetchInterval: 30_000,
  })

  // Local optimistic state mirrors server data; mutations apply to it too.
  const [activeId, setActiveId] = useState<string | null>(null)

  const reorderMutation = useMutation({
    mutationFn: ({ jobId, equipmentId, position }: { jobId: string; equipmentId: string | null; position: number }) =>
      jobsService.updateQueuePosition(jobId, { equipmentId, position }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production', 'queue'] })
      qc.invalidateQueries({ queryKey: ['production', 'timeline'] })
    },
    onError: () => toast.error('Falha ao reordenar — tente novamente'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      jobsService.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status atualizado')
      qc.invalidateQueries({ queryKey: ['production', 'queue'] })
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Falha ao atualizar status'),
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const lanes = data?.lanes ?? []
  const unassigned = data?.unassigned ?? []

  const allJobs = useMemo(() => {
    const m = new Map<string, QueueJob>()
    lanes.forEach((l) => l.jobs.forEach((j) => m.set(j.id, j)))
    unassigned.forEach((j) => m.set(j.id, j))
    return m
  }, [lanes, unassigned])

  const findContainer = (id: string): { laneId: string | 'unassigned'; index: number } | null => {
    for (const l of lanes) {
      const idx = l.jobs.findIndex((j) => j.id === id)
      if (idx >= 0) return { laneId: l.equipment.id, index: idx }
    }
    const uIdx = unassigned.findIndex((j) => j.id === id)
    if (uIdx >= 0) return { laneId: 'unassigned', index: uIdx }
    return null
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const activeJobId = String(e.active.id)
    const overId = e.over?.id ? String(e.over.id) : null
    if (!overId) return

    const from = findContainer(activeJobId)
    if (!from) return

    // overId can be a job id (drop on a card) or a lane sentinel "lane:<id>"
    let targetLane: string | 'unassigned'
    let targetIndex: number
    if (overId.startsWith('lane:')) {
      targetLane = overId.slice(5) as string | 'unassigned'
      const lane = targetLane === 'unassigned'
        ? unassigned
        : lanes.find((l) => l.equipment.id === targetLane)?.jobs ?? []
      targetIndex = lane.length
    } else {
      const to = findContainer(overId)
      if (!to) return
      targetLane = to.laneId
      targetIndex = to.index
    }

    if (from.laneId === targetLane && from.index === targetIndex) return

    reorderMutation.mutate({
      jobId: activeJobId,
      equipmentId: targetLane === 'unassigned' ? null : targetLane,
      position: targetIndex,
    })
  }

  if (isLoading) {
    return <Card><div style={{ color: NEX.textDim }}>Carregando fila...</div></Card>
  }

  const availableEquipment = lanes.filter((l) => l.equipment.status === 'AVAILABLE')

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {lanes.map((lane) => (
            <LaneColumn
              key={lane.equipment.id}
              lane={lane}
              focusJobId={focusJobId}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
            />
          ))}
          {unassigned.length > 0 && (
            <UnassignedLane
              jobs={unassigned}
              focusJobId={focusJobId}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
            />
          )}
        </div>

        <DragOverlay>
          {activeId && allJobs.get(activeId) ? (
            <JobCardContent job={allJobs.get(activeId)!} dragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      <Card>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: NEX.textMute }}>
              Slots livres
            </div>
            <div className="text-2xl font-bold tabular-nums">{availableEquipment.length}</div>
            <div className="text-[11px]" style={{ color: NEX.textDim }}>
              de {lanes.length} impressoras disponíveis
            </div>
          </div>
          <div className="h-px" style={{ background: NEX.border }} />
          <div className="space-y-2">
            {availableEquipment.map((l) => (
              <div key={l.equipment.id} className="flex items-center justify-between text-[12px]">
                <span>{l.equipment.name}</span>
                <Pill tone="green" dot>livre</Pill>
              </div>
            ))}
            {availableEquipment.length === 0 && (
              <div className="text-[11px]" style={{ color: NEX.textMute }}>Todas as máquinas estão em uso ou offline.</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

function LaneColumn({
  lane,
  focusJobId,
  onStatusChange,
}: {
  lane: QueueLane
  focusJobId?: string
  onStatusChange: (id: string, status: string) => void
}) {
  const eq = lane.equipment
  const lifespanPct = (Number(eq.totalPrintHours) / Math.max(1, eq.estimatedLifespanHours)) * 100
  const statusInfo = EQUIPMENT_STATUS[eq.status] ?? { label: eq.status, tone: 'default' as const }
  const ids = lane.jobs.map((j) => j.id)

  return (
    <Card padding={false}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
        <Icon d={Icons.printer} size={15} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13.5px]">{eq.name}</div>
          <div className="text-[11px]" style={{ color: NEX.textMute }}>
            {eq.model} · {Math.round(lifespanPct)}% de vida útil
          </div>
        </div>
        <Pill tone={statusInfo.tone} dot={eq.status === 'PRINTING'}>{statusInfo.label}</Pill>
        <Pill>{lane.jobs.length} jobs</Pill>
      </div>
      <DroppableLane laneId={eq.id}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="p-3 space-y-2 min-h-[80px]">
            {lane.jobs.length === 0 && (
              <div className="text-[11.5px] text-center py-4" style={{ color: NEX.textMute }}>
                Sem jobs nesta máquina — arraste algum aqui para enfileirar.
              </div>
            )}
            {lane.jobs.map((job, idx) => (
              <DraggableJobCard
                key={job.id}
                job={job}
                position={idx + 1}
                highlight={job.id === focusJobId}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </SortableContext>
      </DroppableLane>
    </Card>
  )
}

function UnassignedLane({
  jobs,
  focusJobId,
  onStatusChange,
}: {
  jobs: QueueJob[]
  focusJobId?: string
  onStatusChange: (id: string, status: string) => void
}) {
  const ids = jobs.map((j) => j.id)
  return (
    <Card padding={false}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${NEX.border}` }}>
        <Icon d={Icons.alert} size={15} style={{ color: NEX.amber }} />
        <div className="font-semibold text-[13.5px]">Sem máquina atribuída</div>
        <Pill tone="amber">{jobs.length}</Pill>
      </div>
      <DroppableLane laneId="unassigned">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="p-3 space-y-2">
            {jobs.map((job, idx) => (
              <DraggableJobCard
                key={job.id}
                job={job}
                position={idx + 1}
                highlight={job.id === focusJobId}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </SortableContext>
      </DroppableLane>
    </Card>
  )
}

function DroppableLane({ laneId, children }: { laneId: string; children: React.ReactNode }) {
  // Use a sortable context wrapping plus an empty sentinel id so empty lanes are droppable.
  const { setNodeRef } = useSortable({ id: `lane:${laneId}`, data: { lane: laneId } })
  return (
    <div ref={setNodeRef}>{children}</div>
  )
}

function DraggableJobCard({
  job,
  position,
  highlight,
  onStatusChange,
}: {
  job: QueueJob
  position: number
  highlight?: boolean
  onStatusChange: (id: string, status: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <JobCardContent job={job} position={position} highlight={highlight} onStatusChange={onStatusChange} />
    </div>
  )
}

function JobCardContent({
  job,
  position,
  dragging = false,
  highlight = false,
  onStatusChange,
}: {
  job: QueueJob
  position?: number
  dragging?: boolean
  highlight?: boolean
  onStatusChange?: (id: string, status: string) => void
}) {
  const tone = JOB_STATUS_TONE[job.status] ?? 'default'
  const totalMin = job.printTimeMinutes * job.printsNeeded
  const eta = formatDuration(totalMin)
  const sale = job.costSnapshots[0]
  const next = nextStatusFor(job.status, !!job.customer?.id)

  return (
    <div
      className="rounded-md p-3 cursor-grab active:cursor-grabbing"
      style={{
        background: dragging ? NEX.surface2 : NEX.surface,
        border: highlight ? `1px solid ${NEX.cyan}` : `1px solid ${NEX.border}`,
        boxShadow: dragging
          ? `0 8px 24px ${nexAlpha('cyan', 0.15)}`
          : highlight
            ? `0 0 0 1px ${nexAlpha('cyan', 0.2)}`
            : undefined,
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        {position != null && (
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ background: NEX.surface2, color: NEX.textDim }}
          >
            #{position}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[12.5px] truncate">{job.product.name}</div>
          <div className="text-[10.5px]" style={{ color: NEX.textMute }}>
            {job.jobNumber} · {job.customer?.name ?? 'Estoque'}
          </div>
        </div>
        <Pill tone={tone}>{statusLabel(job.status)}</Pill>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
        <div>
          <div style={{ color: NEX.textMute }}>Qtd</div>
          <div className="font-mono"><Num value={job.quantityOrdered} /></div>
        </div>
        <div>
          <div style={{ color: NEX.textMute }}>Tempo</div>
          <div className="font-mono">{eta}</div>
        </div>
        <div>
          <div style={{ color: NEX.textMute }}>Total</div>
          <div className="font-mono"><Money value={Number(sale?.batchTotalSalePrice ?? 0)} /></div>
        </div>
      </div>

      {onStatusChange && next.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {next.map((s) => (
            <Btn
              key={s.value}
              kind={s.kind}
              size="sm"
              onPointerDownCapture={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, s.value) }}
            >
              {s.label}
            </Btn>
          ))}
        </div>
      )}
    </div>
  )
}

function nextStatusFor(
  status: string,
  hasCustomer: boolean,
): Array<{ value: string; label: string; kind: 'primary' | 'soft' | 'danger' | 'ghost' }> {
  switch (status) {
    case 'QUOTED':          return [{ value: 'QUEUED',          label: 'Enfileirar',  kind: 'soft' }]
    case 'QUEUED':          return [{ value: 'PRINTING',        label: 'Iniciar',     kind: 'primary' }]
    case 'PRINTING':        return [
      { value: 'POST_PROCESSING', label: 'Pós-proc.',   kind: 'soft' },
      { value: 'QUALITY_CHECK',   label: 'QC direto',   kind: 'ghost' },
    ]
    case 'POST_PROCESSING': return [
      { value: 'QUALITY_CHECK',   label: 'Ir para QC',  kind: 'ghost' },
      ...(hasCustomer ? [{ value: 'PACKING', label: 'Embalar', kind: 'soft' as const }] : []),
    ]
    case 'QUALITY_CHECK':   return [
      {
        value: 'QC_APPROVED',
        label: hasCustomer ? 'Aprovar' : 'Aprovar e concluir',
        kind: 'primary',
      },
      {
        value: 'QC_PARTIAL_APPROVED',
        label: hasCustomer ? 'Parcial' : 'Parcial e concluir',
        kind: 'soft',
      },
      { value: 'QC_REJECTED',            label: 'Reprovar',  kind: 'danger' },
    ]
    case 'QC_APPROVED':
      return hasCustomer
        ? [{ value: 'PACKING', label: 'Embalar', kind: 'soft' }]
        : [{ value: 'DELIVERED', label: 'Concluir', kind: 'primary' }]
    case 'QC_PARTIAL_APPROVED':
      return hasCustomer
        ? [{ value: 'PACKING', label: 'Embalar', kind: 'soft' }]
        : [{ value: 'DELIVERED', label: 'Concluir', kind: 'primary' }]
    case 'PACKING':
      return hasCustomer
        ? [{ value: 'READY', label: 'Pronto', kind: 'primary' }]
        : [{ value: 'DELIVERED', label: 'Concluir', kind: 'primary' }]
    case 'READY':           return [{ value: 'DELIVERED',       label: hasCustomer ? 'Entregar' : 'Concluir',    kind: 'primary' }]
    default:                return []
  }
}

function statusLabel(status: string) {
  return JOB_STATUS_LABELS[status] ?? status
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────
function TimelineView() {
  const { data, isLoading } = useQuery({
    queryKey: ['production', 'timeline'],
    queryFn: () => jobsService.getTimeline(),
    refetchInterval: 60_000,
  })

  if (isLoading) return <Card><div style={{ color: NEX.textDim }}>Carregando timeline...</div></Card>

  const lanes = data?.lanes ?? []
  const fromMs = data ? new Date(data.window.from).getTime() : Date.now()
  const toMs = data ? new Date(data.window.to).getTime() : Date.now() + 48 * 3600 * 1000
  const totalMs = Math.max(1, toMs - fromMs)
  const totalHours = Math.round(totalMs / 3600 / 1000)

  const ticks = Array.from({ length: Math.floor(totalHours / 6) + 1 }, (_, i) => i * 6)

  return (
    <Card padding={false}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${NEX.border}` }}>
        <div className="font-semibold text-[13.5px]">Timeline · próximas {totalHours}h</div>
        <div className="text-[11px]" style={{ color: NEX.textMute }}>
          Auto-atualiza a cada 60s
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* hour ruler */}
          <div className="flex border-b" style={{ borderColor: NEX.border }}>
            <div style={{ width: 180, padding: '6px 12px', color: NEX.textMute, fontSize: 11 }}>Equipamento</div>
            <div className="flex-1 relative" style={{ height: 28 }}>
              {ticks.map((h) => (
                <div key={h}
                  className="absolute top-0 bottom-0 text-[10px] font-mono pl-1"
                  style={{ left: `${(h / totalHours) * 100}%`, color: NEX.textMute, borderLeft: `1px solid ${NEX.border}` }}
                >
                  +{h}h
                </div>
              ))}
            </div>
          </div>

          {lanes.map((lane: TimelineLane) => (
            <div key={lane.equipment.id} className="flex items-center" style={{ borderBottom: `1px solid ${NEX.border}` }}>
              <div style={{ width: 180, padding: '10px 12px' }} className="text-[12px] font-medium">
                {lane.equipment.name}
              </div>
              <div className="flex-1 relative" style={{ height: 44 }}>
                {/* ruler grid */}
                {ticks.map((h) => (
                  <div key={h} className="absolute top-0 bottom-0"
                    style={{ left: `${(h / totalHours) * 100}%`, borderLeft: `1px solid ${NEX.border}` }} />
                ))}
                {lane.blocks.map((b) => {
                  const startPct = ((new Date(b.start).getTime() - fromMs) / totalMs) * 100
                  const widthPct = ((new Date(b.end).getTime() - new Date(b.start).getTime()) / totalMs) * 100
                  const tone = JOB_STATUS_TONE[b.status] ?? 'default'
                  const palette: Record<string, string> = {
                    cyan: NEX.cyan, green: NEX.green, amber: NEX.amber,
                    red: NEX.red, violet: NEX.violet, default: NEX.textDim,
                  }
                  const c = palette[tone]
                  return (
                    <div
                      key={b.jobId}
                      className="absolute top-1.5 bottom-1.5 rounded text-[10.5px] font-medium px-2 flex items-center overflow-hidden"
                      title={`${b.jobNumber} · ${b.productName} · ${b.customerName ?? 'Estoque'} · ${formatDuration(b.minutes)}`}
                      style={{
                        left: `${Math.max(0, startPct)}%`,
                        width: `${Math.max(0.5, widthPct)}%`,
                        background: nexAlpha(tone === 'default' ? 'textDim' : (tone as 'cyan' | 'green' | 'amber' | 'red' | 'violet'), 0.15),
                        border: `1px solid ${c}`,
                        color: c,
                      }}
                    >
                      <span className="truncate">{b.productName}</span>
                    </div>
                  )
                })}
                {lane.blocks.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[11px]" style={{ color: NEX.textMute }}>
                    Disponível
                  </div>
                )}
              </div>
            </div>
          ))}

          <div style={{ borderBottom: `1px solid ${NEX.border}` }}>
            <Bar value={0} />
          </div>
        </div>
      </div>
    </Card>
  )
}
