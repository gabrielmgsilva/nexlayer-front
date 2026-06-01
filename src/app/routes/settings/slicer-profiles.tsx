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

interface ParamRow { key: string; value: string }

function paramsToRows(params: Record<string, string>): ParamRow[] {
  const entries = Object.entries(params)
  return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]
}

function rowsToParams(rows: ParamRow[]): Record<string, string> {
  return Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value.trim()]))
}

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
  const [paramRows, setParamRows] = useState<ParamRow[]>([{ key: '', value: '' }])
  const [notes, setNotes] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.equipment?.name ?? '').toLowerCase().includes(q) ||
      (p.material?.filamentType?.name ?? '').toLowerCase().includes(q) ||
      Object.keys(p.params ?? {}).some((k) => k.toLowerCase().includes(q)),
    )
  }, [profiles, search])

  const resetForm = () => {
    setEditingId(null); setName(''); setMaterialId(''); setEquipmentId('')
    setParamRows([{ key: '', value: '' }]); setNotes('')
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }
  const openEdit = (p: SlicerProfile) => {
    setEditingId(p.id); setName(p.name)
    setMaterialId(p.materialId ?? ''); setEquipmentId(p.equipmentId ?? '')
    setParamRows(paramsToRows(p.params ?? {})); setNotes(p.notes ?? '')
    setDrawerOpen(true)
  }

  const updateRow = (idx: number, field: 'key' | 'value', val: string) =>
    setParamRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))

  const addRow = () => setParamRows((prev) => [...prev, { key: '', value: '' }])

  const removeRow = (idx: number) =>
    setParamRows((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ key: '', value: '' }])

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        materialId: materialId || undefined,
        equipmentId: equipmentId || undefined,
        params: rowsToParams(paramRows),
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
            const matLabel = p.material ? [p.material.filamentType?.name, p.material.brand?.name].filter(Boolean).join(' · ') : null
            const eqLabel = p.equipment ? `${p.equipment.name}${p.equipment.model ? ` · ${p.equipment.model}` : ''}` : null
            const paramEntries = Object.entries(p.params ?? {})
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

                {(matLabel || eqLabel) && (
                  <div className="space-y-0.5 text-[11.5px]">
                    {matLabel && <div className="flex justify-between"><span style={{ color: NEX.textMute }}>Material</span><span className="truncate max-w-[55%] text-right">{matLabel}</span></div>}
                    {eqLabel && <div className="flex justify-between"><span style={{ color: NEX.textMute }}>Impressora</span><span className="truncate max-w-[55%] text-right">{eqLabel}</span></div>}
                  </div>
                )}

                {paramEntries.length > 0 && (
                  <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${NEX.border}` }}>
                    {paramEntries.map(([key, val], idx) => (
                      <div key={key} className="flex items-center justify-between px-2.5 py-1.5 text-[11.5px]"
                        style={{ borderTop: idx > 0 ? `1px solid ${NEX.border}` : undefined, background: idx % 2 === 0 ? 'transparent' : NEX.surface2 }}>
                        <span style={{ color: NEX.textMute }}>{key}</span>
                        <span className="font-mono font-medium tabular-nums">{val}</span>
                      </div>
                    ))}
                  </div>
                )}

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

          {/* Editor de parâmetros livre */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: NEX.textMute }}>Parâmetros</span>
              <button
                onClick={addRow}
                className="flex items-center gap-1 text-[11.5px] font-medium"
                style={{ color: NEX.cyan }}
              >
                <Icon d={Icons.plus} size={11} /> Adicionar
              </button>
            </div>

            <div className="space-y-2">
              {paramRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6 }}>
                    <input
                      value={row.key}
                      onChange={(e) => updateRow(idx, 'key', e.target.value)}
                      placeholder="Nome (ex: Temperatura Nozzle)"
                      className="w-full h-8 px-3 bg-transparent text-[12.5px] focus:outline-none"
                      style={{ color: NEX.text }}
                    />
                  </div>
                  <div className="flex-1" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6 }}>
                    <input
                      value={row.value}
                      onChange={(e) => updateRow(idx, 'value', e.target.value)}
                      placeholder="Valor (ex: 220°C)"
                      className="w-full h-8 px-3 bg-transparent text-[12.5px] focus:outline-none"
                      style={{ color: NEX.text }}
                    />
                  </div>
                  <button
                    onClick={() => removeRow(idx)}
                    className="h-8 w-8 rounded flex items-center justify-center flex-shrink-0 opacity-40 hover:opacity-100"
                    style={{ color: NEX.red }}
                  >
                    <Icon d={Icons.x} size={13} />
                  </button>
                </div>
              ))}
            </div>

            {paramRows.every((r) => !r.key.trim()) && (
              <div className="mt-1.5 text-[11px]" style={{ color: NEX.textMute }}>
                Sem parâmetros. Clique em "Adicionar" para incluir nome/valor livres.
              </div>
            )}
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
