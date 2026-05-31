import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { brandsService } from '@/services/entities.service'
import { Field, inputCls, getApiMessage } from './_shared'

type BrandWithCount = {
  id: string
  name: string
  website?: string | null
  isActive: boolean
  createdAt: string
  _count: { materials: number; equipment: number }
}

export function BrandsPage() {
  const queryClient = useQueryClient()
  const { data: brands = [] } = useQuery<BrandWithCount[]>({
    queryKey: ['brands', 'all'],
    queryFn: () => brandsService.findAll() as Promise<BrandWithCount[]>,
  })

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BrandWithCount | null>(null)
  const [pendingToggle, setPendingToggle] = useState<BrandWithCount | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return brands
    return brands.filter((b) => b.name.toLowerCase().includes(q) || (b.website ?? '').toLowerCase().includes(q))
  }, [brands, search])

  const resetForm = () => { setEditingId(null); setName(''); setWebsite('') }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (b: BrandWithCount) => {
    setEditingId(b.id)
    setName(b.name)
    setWebsite(b.website ?? '')
    setDrawerOpen(true)
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), website: website.trim() || undefined }
      return editingId
        ? brandsService.update(editingId, payload)
        : brandsService.create(payload)
    },
    onSuccess: () => {
      toast.success(editingId ? 'Marca atualizada' : 'Marca criada')
      setDrawerOpen(false); resetForm()
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      queryClient.invalidateQueries({ queryKey: ['domain'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar marca')),
  })

  const toggle = useMutation({
    mutationFn: (b: BrandWithCount) => brandsService.update(b.id, { isActive: !b.isActive }),
    onSuccess: (_, b) => {
      toast.success(b.isActive ? 'Marca desativada' : 'Marca ativada')
      setPendingToggle(null)
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      queryClient.invalidateQueries({ queryKey: ['domain'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status')),
  })

  const remove = useMutation({
    mutationFn: (b: BrandWithCount) => brandsService.remove(b.id),
    onSuccess: () => {
      toast.success('Marca removida')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      queryClient.invalidateQueries({ queryKey: ['domain'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover marca')),
  })

  const canSave = name.trim().length > 0
  const saveError = save.isError ? getApiMessage(save.error, 'Falha ao salvar') : null

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 space-y-5">
      {/* Header toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 h-8 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar marca…"
            className="bg-transparent text-[12.5px] focus:outline-none flex-1"
            style={{ color: NEX.text }}
          />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="ml-auto">
          <Btn kind="primary" size="sm" icon={Icons.plus} onClick={openCreate}>Nova marca</Btn>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[480px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
                <th className="text-left px-4 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Marca</th>
                <th className="text-left px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold hidden sm:table-cell" style={{ color: NEX.textMute }}>Site</th>
                <th className="text-center px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Materiais</th>
                <th className="text-center px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Equip.</th>
                <th className="text-center px-2 py-3 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: NEX.textMute }}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[12px]" style={{ color: NEX.textMute }}>
                    {search ? 'Nenhuma marca encontrada.' : 'Nenhuma marca cadastrada.'}
                  </td>
                </tr>
              )}
              {filtered.map((b) => (
                <tr key={b.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-2 py-3 hidden sm:table-cell">
                    {b.website
                      ? <span className="text-[11.5px]" style={{ color: NEX.textDim }}>{b.website}</span>
                      : <span style={{ color: NEX.textMute }}>—</span>}
                  </td>
                  <td className="px-2 py-3 text-center font-mono text-[11.5px]">{b._count.materials}</td>
                  <td className="px-2 py-3 text-center font-mono text-[11.5px]">{b._count.equipment}</td>
                  <td className="px-2 py-3 text-center">
                    <Pill tone={b.isActive ? 'green' : 'default'}>{b.isActive ? 'Ativo' : 'Inativo'}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(b)}
                        className="h-7 w-7 rounded flex items-center justify-center opacity-60 hover:opacity-100"
                        style={{ color: NEX.textDim }}
                        title="Editar"
                      >
                        <Icon d={Icons.edit} size={13} />
                      </button>
                      <button
                        onClick={() => setPendingToggle(b)}
                        className="h-7 w-7 rounded flex items-center justify-center opacity-60 hover:opacity-100"
                        style={{ color: b.isActive ? NEX.amber : NEX.green }}
                        title={b.isActive ? 'Desativar' : 'Ativar'}
                      >
                        <Icon d={b.isActive ? Icons.x : Icons.check} size={13} />
                      </button>
                      <button
                        onClick={() => setPendingDelete(b)}
                        className="h-7 w-7 rounded flex items-center justify-center opacity-60 hover:opacity-100"
                        style={{ color: NEX.red }}
                        title="Remover"
                        disabled={b._count.materials > 0 || b._count.equipment > 0}
                      >
                        <Icon d={Icons.trash} size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer create/edit */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); resetForm() }}
        title={editingId ? 'Editar marca' : 'Nova marca'}
        error={saveError}
      >
        <div className="space-y-4">
          <Field label="Nome *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Ex.: Bambu Lab"
              autoFocus
            />
          </Field>
          <Field label="Site (opcional)">
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={inputCls}
              placeholder="https://bambulab.com"
              type="url"
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Btn kind="primary" size="md" className="flex-1 justify-center"
              disabled={!canSave || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Salvando…' : editingId ? 'Salvar' : 'Criar'}
            </Btn>
            <Btn kind="ghost" size="md" onClick={() => { setDrawerOpen(false); resetForm() }}>
              Cancelar
            </Btn>
          </div>
        </div>
      </Drawer>

      {/* Confirm toggle */}
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(open) => { if (!open) setPendingToggle(null) }}
        title={pendingToggle?.isActive ? 'Desativar marca' : 'Ativar marca'}
        description={pendingToggle ? `Deseja ${pendingToggle.isActive ? 'desativar' : 'ativar'} a marca "${pendingToggle.name}"?` : ''}
        variant="default"
        onConfirm={() => { if (pendingToggle) toggle.mutate(pendingToggle) }}
        loading={toggle.isPending}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
        title="Remover marca"
        description={pendingDelete ? `Remover a marca "${pendingDelete.name}"? Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Remover"
        onConfirm={() => { if (pendingDelete) remove.mutate(pendingDelete) }}
        loading={remove.isPending}
      />
    </div>
  )
}
