import { useState, useMemo } from 'react'
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
import { jobsService, type QueueJob, type QueueLane, type TimelineLane } from '@/services/jobs.service'

type ViewMode = 'queue' | 'timeline'

export function ProductionPage() {
  const [view, setView] = useState<ViewMode>('queue')

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px]" style={{ color: NEX.textDim }}>
            Reordene jobs nas máquinas (drag & drop) ou veja a timeline projetada para 48h.
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-md" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          {(['queue', 'timeline'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 h-8 rounded text-[12px] font-medium"
              style={{
                background: view === v ? NEX.cyanDim : 'transparent',
                color: view === v ? NEX.cyan : NEX.textDim,
              }}
            >
              {v === 'queue' ? 'Fila (Kanban)' : 'Timeline 48h'}
            </button>
          ))}
        </div>
      </div>

      {view === 'queue' ? <QueueView /> : <TimelineView />}
    </div>
  )
}

// ─────────────────────────────────────────
// QUEUE / KANBAN
// ─────────────────────────────────────────
function QueueView() {
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
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
            />
          ))}
          {unassigned.length > 0 && (
            <UnassignedLane jobs={unassigned} onStatusChange={(id, status) => statusMutation.mutate({ id, status })} />
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
  onStatusChange,
}: {
  lane: QueueLane
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
  onStatusChange,
}: {
  jobs: QueueJob[]
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
              <DraggableJobCard key={job.id} job={job} position={idx + 1} onStatusChange={onStatusChange} />
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
  onStatusChange,
}: {
  job: QueueJob
  position: number
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
      <JobCardContent job={job} position={position} onStatusChange={onStatusChange} />
    </div>
  )
}

function JobCardContent({
  job,
  position,
  dragging = false,
  onStatusChange,
}: {
  job: QueueJob
  position?: number
  dragging?: boolean
  onStatusChange?: (id: string, status: string) => void
}) {
  const tone = JOB_STATUS_TONE[job.status] ?? 'default'
  const totalMin = job.printTimeMinutes * job.printsNeeded
  const eta = formatDuration(totalMin)
  const sale = job.costSnapshots[0]
  const next = nextStatusFor(job.status)

  return (
    <div
      className="rounded-md p-3 cursor-grab active:cursor-grabbing"
      style={{
        background: dragging ? NEX.surface2 : NEX.surface,
        border: `1px solid ${NEX.border}`,
        boxShadow: dragging ? `0 8px 24px ${nexAlpha('cyan', 0.15)}` : undefined,
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
        <Pill tone={tone}>{job.status}</Pill>
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

function nextStatusFor(status: string): Array<{ value: string; label: string; kind: 'primary' | 'soft' | 'danger' | 'ghost' }> {
  switch (status) {
    case 'QUOTED':          return [{ value: 'QUEUED',          label: 'Enfileirar',  kind: 'soft' }]
    case 'QUEUED':          return [{ value: 'PRINTING',        label: 'Iniciar',     kind: 'primary' }]
    case 'PRINTING':        return [{ value: 'POST_PROCESSING', label: 'Pós-proc.',   kind: 'soft' }]
    case 'POST_PROCESSING': return [{ value: 'PACKING',         label: 'Embalar',     kind: 'soft' }]
    case 'QUALITY_CHECK':   return [{ value: 'PACKING',         label: 'Embalar',     kind: 'soft' }]
    case 'PACKING':         return [{ value: 'READY',           label: 'Pronto',      kind: 'primary' }]
    case 'READY':           return [{ value: 'DELIVERED',       label: 'Entregar',    kind: 'primary' }]
    default:                return []
  }
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
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
