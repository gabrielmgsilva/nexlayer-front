import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Btn, Icons, Icon, NEX } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { slicerProfilesService, type SlicerProfile } from '@/services/entities.service'
import { equipmentService, materialsService } from '@/services/entities.service'
import type { Equipment, Material } from '@/types/api.types'
import { Field, inputCls, getApiMessage } from './_shared'

export function SlicerProfilesPage() {
  const queryClient = useQueryClient()
  const { data: profiles = [] } = useQuery<SlicerProfile[]>({
    queryKey: ['slicer-profiles', 'all'],
    queryFn: () => slicerProfilesService.findAll(),
  })
  const { data: equipRes } = useQuery({ queryKey: ['equipment', 'opt'], queryFn: () => equipmentService.findAll({ limit: 100 }) })
  const equipments: Equipment[] = equipRes?.data ?? []
  const { data: matsRes } = useQuery({ queryKey: ['materials', 'opt'], queryFn: () => materialsService.findAll({ limit: 200 }) })
  const materials: Material[] = matsRes?.data ?? []

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SlicerProfile | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [equipmentId, setEquipmentId] = useState('')
  const [nozzleTempC, setNozzleTempC] = useState('')
  const [bedTempC, setBedTempC] = useState('')
  const [speedMmS, setSpeedMmS] = useState('')
  const [layerHeightMm, setLayerHeightMm] = useState('')
  const [infillPercent, setInfillPercent] = useState('')
  const [supportType, setSupportType] = useState('')
  const [notes, setNotes] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.equipment?.name ?? '').toLowerCase().includes(q) ||
      (p.material?.filamentType?.name ?? '').toLowerCase().includes(q),
    )
  }, [profiles, search])

  const resetForm = () => {
    setEditingId(null); setName(''); setMaterialId(''); setEquipmentId('')
    setNozzleTempC(''); setBedTempC(''); setSpeedMmS(''); setLayerHeightMm('')
    setInfillPercent(''); setSupportType(''); setNotes('')
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }
  const openEdit = (p: SlicerProfile) => {
    setEditingId(p.id); setName(p.name); setMaterialId(p.materialId ?? ''); setEquipmentId(p.equipmentId ?? '')
    setNozzleTempC(p.nozzleTempC != null ? String(p.nozzleTempC) : '')
    setBedTempC(p.bedTempC != null ? String(p.bedTempC) : '')
    setSpeedMmS(p.speedMmS != null ? String(p.speedMmS) : '')
    setLayerHeightMm(p.layerHeightMm != null ? String(p.layerHeightMm) : '')
    setInfillPercent(p.infillPercent != null ? String(p.infillPercent) : '')
    setSupportType(p.supportType ?? ''); setNotes(p.notes ?? '')
    setDrawerOpen(true)
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        materialId: materialId || undefined,
        equipmentId: equipmentId || undefined,
        nozzleTempC: nozzleTempC ? parseInt(nozzleTempC) : undefined,
        bedTempC: bedTempC ? parseInt(bedTempC) : undefined,
        speedMmS: speedMmS ? parseInt(speedMmS) : undefined,
        layerHeightMm: layerHeightMm ? parseFloat(layerHeightMm) : undefined,
        infillPercent: infillPercent ? parseInt(infillPercent) : undefined,
        supportType: supportType.trim() || undefined,
        notes: notes.trim() || undefined,
        isActive: true,
      }
      return editingId
        ? slicerProfilesService.update(editingId, payload)
        : slicerProfilesService.create(payload as Parameters<typeof slicerProfilesService.create>[0])
    },
    onSuccess: () => {
      toast.success(editingId ? 'Perfil atualizado' : 'Perfil criado')
      setDrawerOpen(false); resetForm()
      queryClient.invalidateQueries({ queryKey: ['slicer-profiles'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar')),
  })

  const remove = useMutation({
    mutationFn: (p: SlicerProfile) => slicerProfilesService.remove(p.id),
    onSuccess: () => {
      toast.success('Perfil removido'); setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['slicer-profiles'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover')),
  })

  const saveError = save.isError ? getApiMessage(save.error, 'Falha ao salvar') : null

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 h-8 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar perfil…" className="bg-transparent text-[12.5px] focus:outline-none flex-1" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="ml-auto">
          <Btn kind="primary" size="sm" icon={Icons.plus} onClick={openCreate}>Novo perfil</Btn>
        </div>
      </div>

      {/* Grid de cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: NEX.textMute }}>
          <Icon d={Icons.cog} size={32} className="mx-auto mb-3 opacity-30" />
          <div>{search ? 'Nenhum perfil encontrado.' : 'Nenhum perfil de fatiamento cadastrado.'}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const matLabel = p.material ? [p.material.filamentType?.name, p.material.brand?.name].filter(Boolean).join(' · ') : '—'
            const eqLabel = p.equipment ? `${p.equipment.name}${p.equipment.model ? ` · ${p.equipment.model}` : ''}` : '—'
            return (
              <div key={p.id} className="rounded-xl p-4 space-y-3" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-[13px] leading-tight">{p.name}</div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(p)} className="h-7 w-7 rounded flex items-center justify-center opacity-50 hover:opacity-100" style={{ color: NEX.textDim }}>
                      <Icon d={Icons.edit} size={13} />
                    </button>
                    <button onClick={() => setPendingDelete(p)} className="h-7 w-7 rounded flex items-center justify-center opacity-50 hover:opacity-100" style={{ color: NEX.red }}>
                      <Icon d={Icons.trash} size={13} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-[11.5px]" style={{ color: NEX.textDim }}>
                  <div className="flex justify-between"><span style={{ color: NEX.textMute }}>Material</span><span className="truncate max-w-[55%] text-right">{matLabel}</span></div>
                  <div className="flex justify-between"><span style={{ color: NEX.textMute }}>Impressora</span><span className="truncate max-w-[55%] text-right">{eqLabel}</span></div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {p.nozzleTempC != null && <div className="rounded-md px-2 py-1.5 text-center" style={{ background: NEX.surface2 }}><div style={{ color: NEX.textMute }}>Nozzle</div><div className="font-mono font-semibold">{p.nozzleTempC}°C</div></div>}
                  {p.bedTempC != null && <div className="rounded-md px-2 py-1.5 text-center" style={{ background: NEX.surface2 }}><div style={{ color: NEX.textMute }}>Cama</div><div className="font-mono font-semibold">{p.bedTempC}°C</div></div>}
                  {p.speedMmS != null && <div className="rounded-md px-2 py-1.5 text-center" style={{ background: NEX.surface2 }}><div style={{ color: NEX.textMute }}>Vel.</div><div className="font-mono font-semibold">{p.speedMmS}mm/s</div></div>}
                  {p.layerHeightMm != null && <div className="rounded-md px-2 py-1.5 text-center" style={{ background: NEX.surface2 }}><div style={{ color: NEX.textMute }}>Camada</div><div className="font-mono font-semibold">{p.layerHeightMm}mm</div></div>}
                  {p.infillPercent != null && <div className="rounded-md px-2 py-1.5 text-center" style={{ background: NEX.surface2 }}><div style={{ color: NEX.textMute }}>Infill</div><div className="font-mono font-semibold">{p.infillPercent}%</div></div>}
                  {p.supportType && <div className="rounded-md px-2 py-1.5 text-center" style={{ background: NEX.surface2 }}><div style={{ color: NEX.textMute }}>Suporte</div><div className="font-semibold truncate">{p.supportType}</div></div>}
                </div>

                {p.notes && <div className="text-[11px] italic" style={{ color: NEX.textMute }}>{p.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => { setDrawerOpen(false); resetForm() }} title={editingId ? 'Editar perfil' : 'Novo perfil de fatiamento'} error={saveError}>
        <div className="space-y-4">
          <Field label="Nome *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: PLA Bambu 0.4mm Standard" autoFocus />
          </Field>
          <Field label="Material (opcional)">
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={inputCls}>
              <option value="">— qualquer —</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.filamentType?.name ?? 'Sem tipo'} · {m.brand?.name ?? '—'}</option>)}
            </select>
          </Field>
          <Field label="Impressora (opcional)">
            <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} className={inputCls}>
              <option value="">— qualquer —</option>
              {equipments.map((e) => <option key={e.id} value={e.id}>{e.name}{e.model ? ` · ${e.model}` : ''}</option>)}
            </select>
          </Field>

          <div className="text-[10px] font-semibold uppercase tracking-widest pt-2" style={{ color: NEX.textMute }}>Parâmetros de impressão</div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Temp. nozzle (°C)">
              <input type="number" value={nozzleTempC} onChange={(e) => setNozzleTempC(e.target.value)} className={inputCls} placeholder="220" />
            </Field>
            <Field label="Temp. cama (°C)">
              <input type="number" value={bedTempC} onChange={(e) => setBedTempC(e.target.value)} className={inputCls} placeholder="60" />
            </Field>
            <Field label="Velocidade (mm/s)">
              <input type="number" value={speedMmS} onChange={(e) => setSpeedMmS(e.target.value)} className={inputCls} placeholder="150" />
            </Field>
            <Field label="Altura de camada (mm)">
              <input type="number" step="0.01" value={layerHeightMm} onChange={(e) => setLayerHeightMm(e.target.value)} className={inputCls} placeholder="0.20" />
            </Field>
            <Field label="Infill (%)">
              <input type="number" min={0} max={100} value={infillPercent} onChange={(e) => setInfillPercent(e.target.value)} className={inputCls} placeholder="15" />
            </Field>
            <Field label="Tipo de suporte">
              <input value={supportType} onChange={(e) => setSupportType(e.target.value)} className={inputCls} placeholder="Linear, Árvore, Nenhum…" />
            </Field>
          </div>

          <Field label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 bg-transparent text-[13px] focus:outline-none" />
          </Field>

          <div className="flex gap-2 pt-2">
            <Btn kind="primary" size="md" className="flex-1 justify-center"
              disabled={!name.trim() || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Salvando…' : editingId ? 'Salvar' : 'Criar'}
            </Btn>
            <Btn kind="ghost" size="md" onClick={() => { setDrawerOpen(false); resetForm() }}>Cancelar</Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null) }}
        title="Remover perfil"
        description={`Remover o perfil "${pendingDelete?.name}"?`}
        confirmLabel="Remover"
        onConfirm={() => { if (pendingDelete) remove.mutate(pendingDelete) }}
        loading={remove.isPending}
      />
    </div>
  )
}
