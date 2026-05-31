import { useQuery } from '@tanstack/react-query'
import { Icon, Icons, NEX, Pill, nexAlpha, Bar } from '@/lib/nex'
import { jobsService } from '@/services/jobs.service'
import { EQUIPMENT_STATUS } from '@/lib/nex'

function progressPercent(job: { startedAt: string | null; printTimeMinutes: number; printsNeeded: number }) {
  if (!job.startedAt) return 0
  const totalMs = job.printTimeMinutes * job.printsNeeded * 60_000
  const elapsed = Date.now() - new Date(job.startedAt).getTime()
  return Math.min(100, Math.round((elapsed / totalMs) * 100))
}

function formatHours(hours: number | string) {
  const h = Number(hours)
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k h`
  return `${h.toFixed(0)} h`
}

export function FarmViewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['production', 'queue'],
    queryFn: () => jobsService.getQueue(),
    refetchInterval: 30_000,
  })

  const lanes = data?.lanes ?? []
  const unassigned = data?.unassigned ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: NEX.textDim }}>
        Carregando impressoras…
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Atualiza a cada 30s</div>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          {['AVAILABLE', 'PRINTING', 'MAINTENANCE', 'OFFLINE'].map((s) => {
            const cfg = EQUIPMENT_STATUS[s as keyof typeof EQUIPMENT_STATUS]
            return (
              <div key={s} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: NEX.textMute }} />
                <span style={{ color: NEX.textDim }}>{cfg?.label ?? s}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grid de impressoras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lanes.map(({ equipment, jobs }) => {
          const cfg = EQUIPMENT_STATUS[equipment.status as keyof typeof EQUIPMENT_STATUS]
          const printing = jobs.find((j) => j.status === 'PRINTING')
          const queued = jobs.filter((j) => j.status !== 'PRINTING')
          const lifePercent = Math.min(100, Math.round((Number(equipment.totalPrintHours) / equipment.estimatedLifespanHours) * 100))
          const progress = printing ? progressPercent(printing) : 0

          return (
            <div
              key={equipment.id}
              className="rounded-xl p-4 space-y-3"
              style={{
                background: NEX.surface,
                border: `1px solid ${equipment.status === 'PRINTING' ? 'var(--nex-cyan)' : NEX.border}`,
                boxShadow: equipment.status === 'PRINTING' ? `0 0 0 1px ${nexAlpha('cyan', 0.2)}` : undefined,
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-[13px]">{equipment.name}</div>
                  <div className="text-[11px]" style={{ color: NEX.textMute }}>{equipment.model}</div>
                </div>
                <Pill tone={cfg?.tone ?? 'default'}>{cfg?.label ?? equipment.status}</Pill>
              </div>

              {/* Job ativo */}
              {printing ? (
                <div className="rounded-lg p-3 space-y-2" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium truncate max-w-[60%]">{printing.product?.name ?? '—'}</span>
                    <span className="font-mono text-[10.5px]" style={{ color: NEX.textMute }}>{printing.jobNumber}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1" style={{ color: NEX.textMute }}>
                      <span>Progresso estimado</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: NEX.surface }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: NEX.cyan }} />
                    </div>
                  </div>
                  <div className="flex gap-3 text-[10.5px]" style={{ color: NEX.textMute }}>
                    <span>{printing.quantityOrdered} un</span>
                    <span>·</span>
                    <span>{printing.printsNeeded} impressões</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg p-3 text-center text-[12px]" style={{ background: NEX.surface2, color: NEX.textMute }}>
                  {equipment.status === 'AVAILABLE' ? 'Disponível' : equipment.status === 'MAINTENANCE' ? 'Em manutenção' : 'Offline'}
                </div>
              )}

              {/* Fila */}
              {queued.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: NEX.textMute }}>Fila ({queued.length})</div>
                  {queued.slice(0, 3).map((j) => (
                    <div key={j.id} className="flex items-center justify-between text-[11.5px] px-2 py-1 rounded" style={{ background: NEX.surface2 }}>
                      <span className="truncate max-w-[70%]" style={{ color: NEX.textDim }}>{j.product?.name ?? '—'}</span>
                      <span className="font-mono text-[10px]" style={{ color: NEX.textMute }}>{j.quantityOrdered} un</span>
                    </div>
                  ))}
                  {queued.length > 3 && (
                    <div className="text-[10.5px] text-center" style={{ color: NEX.textMute }}>+{queued.length - 3} na fila</div>
                  )}
                </div>
              )}

              {/* Vida útil */}
              <div>
                <div className="flex justify-between text-[10.5px] mb-1" style={{ color: NEX.textMute }}>
                  <span>Vida útil usada</span>
                  <span>{formatHours(equipment.totalPrintHours)} / {formatHours(equipment.estimatedLifespanHours)}</span>
                </div>
                <Bar value={lifePercent} max={100} tone={lifePercent > 80 ? 'red' : lifePercent > 60 ? 'amber' : 'cyan'} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Jobs sem máquina */}
      {unassigned.length > 0 && (
        <div>
          <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-2" style={{ color: NEX.textMute }}>
            Sem impressora atribuída ({unassigned.length})
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
            {unassigned.map((j, idx) => (
              <div key={j.id} className="flex items-center justify-between px-4 py-3 text-[12px]"
                style={{ borderTop: idx > 0 ? `1px solid ${NEX.border}` : undefined }}>
                <div>
                  <span className="font-medium">{j.product?.name ?? '—'}</span>
                  <span className="ml-2 font-mono text-[10.5px]" style={{ color: NEX.textMute }}>{j.jobNumber}</span>
                </div>
                <div className="flex items-center gap-3" style={{ color: NEX.textMute }}>
                  <span>{j.quantityOrdered} un</span>
                  {j.dueDate && <span>Prazo: {new Date(j.dueDate).toLocaleDateString('pt-BR')}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lanes.length === 0 && unassigned.length === 0 && (
        <div className="text-center py-16" style={{ color: NEX.textMute }}>
          <Icon d={Icons.printer} size={32} className="mx-auto mb-3 opacity-30" />
          <div>Nenhuma impressora cadastrada.</div>
        </div>
      )}
    </div>
  )
}
