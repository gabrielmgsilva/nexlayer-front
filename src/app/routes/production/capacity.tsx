import { useQuery } from '@tanstack/react-query'
import { Icon, Icons, NEX, Pill, nexAlpha } from '@/lib/nex'
import { jobsService, type CapacityLane } from '@/services/jobs.service'

function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function CapacityPage() {
  const { data = [], isLoading } = useQuery<CapacityLane[]>({
    queryKey: ['production', 'capacity'],
    queryFn: () => jobsService.getCapacity(),
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: NEX.textDim }}>
        Calculando projeção…
      </div>
    )
  }

  const totalJobs = data.reduce((s, l) => s + l.jobs.length, 0)
  const overdueCount = data.reduce((s, l) => s + l.jobs.filter((j) => j.isOverdue).length, 0)

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[12px]">
        {[
          { label: 'Impressoras ativas', value: data.filter((l) => l.jobs.length > 0).length, color: NEX.cyan },
          { label: 'Jobs na projeção', value: totalJobs, color: NEX.text },
          { label: 'Jobs com prazo em risco', value: overdueCount, color: overdueCount > 0 ? NEX.red : NEX.textDim },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl px-4 py-3" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
            <div className="text-[10.5px] uppercase tracking-wider mb-1" style={{ color: NEX.textMute }}>{label}</div>
            <div className="text-[22px] font-semibold tabular-nums" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <div className="text-center py-16" style={{ color: NEX.textMute }}>
          <Icon d={Icons.clock} size={32} className="mx-auto mb-3 opacity-30" />
          <div>Nenhum job em fila para projetar.</div>
        </div>
      )}

      {/* Projeção por impressora */}
      {data.map((lane) => (
        <div key={lane.equipmentId} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-[13px]">{lane.equipmentName}</div>
            <div className="text-[11.5px]" style={{ color: NEX.textMute }}>
              Livre estimado: <span className="font-mono">{formatDatetime(lane.projectedFreeAt)}</span>
            </div>
          </div>

          {lane.jobs.length === 0 ? (
            <div className="rounded-lg px-4 py-3 text-[12px]" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, color: NEX.textMute }}>
              Sem jobs em fila.
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}` }}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: NEX.surface2, borderBottom: `1px solid ${NEX.border}` }}>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: NEX.textMute }}>Job</th>
                    <th className="text-left px-2 py-2 font-semibold hidden sm:table-cell" style={{ color: NEX.textMute }}>Produto</th>
                    <th className="text-left px-2 py-2 font-semibold hidden md:table-cell" style={{ color: NEX.textMute }}>Início estimado</th>
                    <th className="text-left px-2 py-2 font-semibold" style={{ color: NEX.textMute }}>Término estimado</th>
                    <th className="text-center px-2 py-2 font-semibold hidden sm:table-cell" style={{ color: NEX.textMute }}>Duração</th>
                    <th className="text-center px-2 py-2 font-semibold" style={{ color: NEX.textMute }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lane.jobs.map((job, idx) => (
                    <tr key={job.jobId} style={{
                      borderTop: idx > 0 ? `1px solid ${NEX.border}` : undefined,
                      background: job.isOverdue ? nexAlpha('red', 0.04) : undefined,
                    }}>
                      <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: NEX.textMute }}>{job.jobNumber}</td>
                      <td className="px-2 py-2.5 font-medium hidden sm:table-cell truncate max-w-[160px]">{job.productName}</td>
                      <td className="px-2 py-2.5 hidden md:table-cell" style={{ color: NEX.textDim }}>{formatDatetime(job.estimatedStart)}</td>
                      <td className="px-2 py-2.5" style={{ color: job.isOverdue ? NEX.red : NEX.text }}>
                        {formatDatetime(job.estimatedEnd)}
                        {job.dueDate && (
                          <div className="text-[10px]" style={{ color: job.isOverdue ? NEX.red : NEX.textMute }}>
                            Prazo: {new Date(job.dueDate).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center hidden sm:table-cell tabular-nums" style={{ color: NEX.textMute }}>
                        {formatDuration(job.totalPrintMinutes)}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {job.isOverdue
                          ? <Pill tone="red">Prazo em risco</Pill>
                          : <Pill tone={job.status === 'PRINTING' ? 'cyan' : 'default'}>{job.status === 'PRINTING' ? 'Imprimindo' : 'Aguardando'}</Pill>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
