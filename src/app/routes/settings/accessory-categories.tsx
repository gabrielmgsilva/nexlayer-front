import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { domainService } from '@/services/entities.service'
import type { AccessoryCategory } from '@/types/api.types'
import { Field, inputCls, getApiMessage } from './_shared'

export function AccessoryCategoriesPage() {
  const queryClient = useQueryClient()
  const { data: categories = [] } = useQuery({
    queryKey: ['domain', 'accessory-categories'],
    queryFn: () => domainService.getAccessoryCategories(),
  })

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AccessoryCategory | null>(null)
  const [pendingToggle, setPendingToggle] = useState<AccessoryCategory | null>(null)

  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return (categories as AccessoryCategory[]).filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, search])

  const resetForm = () => { setEditingId(null); setName(''); setIsActive(true) }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (c: AccessoryCategory) => {
    setEditingId(c.id); setName(c.name); setIsActive(c.isActive)
    setDrawerOpen(true)
  }

  const save = useMutation({
    mutationFn: (p: { id?: string; data: { name: string; isActive?: boolean } }) =>
      p.id
        ? domainService.updateAccessoryCategory(p.id, p.data)
        : domainService.createAccessoryCategory(p.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Categoria atualizada' : 'Categoria criada')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['domain', 'accessory-categories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar categoria')),
  })

  const toggleActive = useMutation({
    mutationFn: (c: AccessoryCategory) =>
      domainService.updateAccessoryCategory(c.id, { isActive: !c.isActive }),
    onSuccess: (_, c) => {
      toast.success(c.isActive ? 'Categoria desativada' : 'Categoria ativada')
      setPendingToggle(null)
      queryClient.invalidateQueries({ queryKey: ['domain', 'accessory-categories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => domainService.deleteAccessoryCategory(id),
    onSuccess: () => {
      toast.success('Categoria removida')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['domain', 'accessory-categories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover categoria')),
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs"
          style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
        >
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoria..."
            className="bg-transparent flex-1 text-[12.5px] focus:outline-none"
            style={{ color: NEX.text }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}>
              <Icon d={Icons.x} size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>
            {filtered.length} {filtered.length === 1 ? 'categoria' : 'categorias'}
          </span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>
            Nova categoria
          </Btn>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Categoria', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                    <Icon d={Icons.pkg} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p className="text-[13px]">
                      {search
                        ? `Nenhum resultado para "${search}"`
                        : 'Nenhuma categoria de acessório cadastrada.'}
                    </p>
                    {!search && (
                      <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>
                        Adicionar primeira categoria
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {(filtered as AccessoryCategory[]).map((c) => (
              <tr key={c.id} className="group" style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3 font-medium" style={{ color: NEX.text }}>{c.name}</td>
                <td className="px-2">
                  <Pill tone={c.isActive ? 'green' : 'default'}>
                    {c.isActive ? 'Ativa' : 'Inativa'}
                  </Pill>
                </td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(c)}>
                      <Icon d={Icons.edit} size={12} />
                    </ActionBtn>
                    <ActionBtn
                      color={NEX.amber}
                      title={c.isActive ? 'Desativar' : 'Ativar'}
                      onClick={() => setPendingToggle(c)}
                    >
                      <Icon d={c.isActive ? Icons.x : Icons.check} size={12} />
                    </ActionBtn>
                    <ActionBtn color={NEX.red} title="Excluir" onClick={() => setPendingDelete(c)}>
                      <Icon d={Icons.trash} size={12} />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'Editar categoria' : 'Nova categoria de acessório'}
      >
        <div className="space-y-4">
          <Field label="Nome *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Ex.: Embalagem, Fixação, Acabamento…"
              autoFocus
            />
          </Field>

          <label
            className="flex items-center gap-3 cursor-pointer select-none"
            style={{
              padding: '10px 12px', borderRadius: 8,
              background: isActive ? nexAlpha('green', 0.08) : NEX.surface2,
              border: `1px solid ${isActive ? nexAlpha('green', 0.25) : NEX.border}`,
              transition: 'all 0.15s',
            }}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ accentColor: NEX.green, width: 15, height: 15 }}
            />
            <div>
              <div className="text-[12.5px] font-medium" style={{ color: isActive ? NEX.green : NEX.text }}>
                Categoria ativa
              </div>
              <div className="text-[11px]" style={{ color: NEX.textMute }}>
                Aparece na seleção ao cadastrar acessórios
              </div>
            </div>
          </label>

          <div className="flex flex-col gap-2 pt-1">
            <Btn
              kind="primary" size="md"
              icon={editingId ? Icons.check : Icons.plus}
              className="w-full justify-center"
              disabled={!name.trim() || save.isPending}
              onClick={() => {
                if (!name.trim()) return
                save.mutate({ id: editingId ?? undefined, data: { name: name.trim(), isActive } })
              }}
            >
              {editingId ? 'Salvar alterações' : 'Criar categoria'}
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(o) => { if (!o) setPendingToggle(null) }}
        title={pendingToggle?.isActive ? 'Desativar categoria?' : 'Ativar categoria?'}
        description={pendingToggle
          ? (pendingToggle.isActive
            ? `"${pendingToggle.name}" não aparecerá na seleção de acessórios.`
            : `"${pendingToggle.name}" voltará a aparecer na seleção de acessórios.`)
          : ''}
        confirmLabel={pendingToggle?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggle?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => { if (pendingToggle) toggleActive.mutate(pendingToggle) }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null) }}
        title="Excluir categoria?"
        description={pendingDelete
          ? `Esta ação removerá permanentemente "${pendingDelete.name}". Acessórios vinculados perderão a categoria.`
          : ''}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => { if (pendingDelete) remove.mutate(pendingDelete.id) }}
      />
    </div>
  )
}

function ActionBtn({
  children, color, title, onClick, disabled,
}: {
  children: React.ReactNode; color: string; title: string
  onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className="h-7 w-7 rounded flex items-center justify-center transition-colors disabled:opacity-30"
      style={{ color, background: 'transparent' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = nexAlpha('surface2', 1) }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
