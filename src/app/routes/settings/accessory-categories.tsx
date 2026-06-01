import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { domainService } from '@/services/entities.service'
import type { AccessoryCategory } from '@/types/api.types'
import { Field, inputCls, getApiMessage } from './_shared'

interface AccCategoryNode extends AccessoryCategory { children: AccCategoryNode[] }

function buildTree(flat: AccessoryCategory[]): AccCategoryNode[] {
  const map = new Map<string, AccCategoryNode>()
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }))
  const roots: AccCategoryNode[] = []
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  const sort = (nodes: AccCategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach((n) => sort(n.children))
    return nodes
  }
  return sort(roots)
}

function ActionBtn({ children, color, title, onClick, disabled }: {
  children: React.ReactNode; color: string; title: string; disabled?: boolean; onClick?: () => void
}) {
  return (
    <button title={title} disabled={disabled} onClick={onClick}
      className="h-6 w-6 rounded flex items-center justify-center opacity-60 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
      style={{ color }}
    >
      {children}
    </button>
  )
}

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
  const [parentId, setParentId] = useState('')
  const [isActive, setIsActive] = useState(true)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories as AccessoryCategory[]
    return (categories as AccessoryCategory[]).filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, search])

  // opções de pai: exclui self e seus descendentes
  const parentOptions = useMemo(() => {
    if (!editingId) return (categories as AccessoryCategory[]).filter((c) => c.isActive)
    return (categories as AccessoryCategory[]).filter((c) => c.isActive && c.id !== editingId && c.parentId !== editingId)
  }, [categories, editingId])

  const resetForm = () => { setEditingId(null); setName(''); setParentId(''); setIsActive(true) }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }
  const openEdit = (c: AccessoryCategory) => {
    setEditingId(c.id); setName(c.name); setParentId(c.parentId ?? ''); setIsActive(c.isActive)
    setDrawerOpen(true)
  }

  const save = useMutation({
    mutationFn: (p: { id?: string; data: { name: string; parentId?: string; isActive?: boolean } }) =>
      p.id
        ? domainService.updateAccessoryCategory(p.id, p.data)
        : domainService.createAccessoryCategory(p.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Categoria atualizada' : 'Categoria criada')
      setDrawerOpen(false); resetForm()
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
      toast.success('Categoria removida'); setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['domain', 'accessory-categories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover categoria')),
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar categoria..." className="bg-transparent flex-1 text-[12.5px] focus:outline-none" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>{filtered.length} {filtered.length === 1 ? 'categoria' : 'categorias'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Nova categoria</Btn>
        </div>
      </div>

      {/* Árvore */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <div className="grid px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ gridTemplateColumns: '1fr auto auto auto', gap: 8, borderBottom: `1px solid ${NEX.border}`, color: NEX.textMute, background: NEX.surface2 }}>
          <span>Categoria</span>
          <span className="w-16 text-center">Acessórios</span>
          <span className="w-16 text-center">Status</span>
          <span className="w-20" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
            <Icon d={Icons.pkg} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
            <p className="text-[13px]">{search ? `Nenhum resultado para "${search}"` : 'Nenhuma categoria cadastrada.'}</p>
            {!search && <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>Adicionar primeira categoria</Btn>}
          </div>
        ) : (() => {
          const tree = buildTree(search.trim() ? filtered : (categories as AccessoryCategory[]))
          const visibleIds = new Set(filtered.map((c) => c.id))

          const renderNode = (node: AccCategoryNode, depth: number, isLast: boolean): React.ReactNode => {
            if (search.trim() && !visibleIds.has(node.id) && !node.children.some((ch) => visibleIds.has(ch.id))) return null
            const blocked = (node._count?.accessories ?? 0) > 0 || (node._count?.children ?? 0) > 0
            return (
              <div key={node.id}>
                <div className="group grid items-center px-4 py-2.5 hover:bg-[#11161E] transition-colors"
                  style={{ gridTemplateColumns: '1fr auto auto auto', gap: 8, borderTop: `1px solid ${NEX.border}` }}>
                  {/* Nome com indentação */}
                  <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: depth * 20 }}>
                    {depth > 0 && (
                      <span className="flex-shrink-0 text-[13px] select-none" style={{ color: NEX.border }}>
                        {isLast ? '└─' : '├─'}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate" style={{ color: node.isActive ? NEX.text : NEX.textMute }}>
                        {node.name}
                        {node.children.length > 0 && (
                          <span className="ml-1.5 text-[10px] font-mono" style={{ color: NEX.textMute }}>{node.children.length} sub</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="w-16 text-center font-mono text-[11.5px]" style={{ color: NEX.textDim }}>
                    {node._count?.accessories ?? 0}
                  </span>

                  <span className="w-16 text-center">
                    <Pill tone={node.isActive ? 'green' : 'default'}>{node.isActive ? 'Ativa' : 'Inativa'}</Pill>
                  </span>

                  <div className="w-20 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(node)}>
                      <Icon d={Icons.edit} size={12} />
                    </ActionBtn>
                    <ActionBtn color={NEX.amber} title={node.isActive ? 'Desativar' : 'Ativar'} onClick={() => setPendingToggle(node)}>
                      <Icon d={node.isActive ? Icons.x : Icons.check} size={12} />
                    </ActionBtn>
                    <ActionBtn color={blocked ? NEX.textMute : NEX.red} title={blocked ? 'Possui acessórios ou subcategorias' : 'Excluir'} disabled={blocked} onClick={() => setPendingDelete(node)}>
                      <Icon d={Icons.trash} size={12} />
                    </ActionBtn>
                  </div>
                </div>
                {node.children.map((child, i) => renderNode(child, depth + 1, i === node.children.length - 1))}
              </div>
            )
          }

          return <>{tree.map((root, i) => renderNode(root, 0, i === tree.length - 1))}</>
        })()}
      </div>

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => { setDrawerOpen(false); resetForm() }} title={editingId ? 'Editar categoria' : 'Nova categoria de acessório'}>
        <div className="space-y-4">
          <Field label="Nome *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: Embalagem, Fixação, Acabamento…" autoFocus />
          </Field>

          <Field label="Categoria pai">
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}>
              <option value="">Nenhuma (categoria raiz)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-3 cursor-pointer select-none"
            style={{ padding: '10px 12px', borderRadius: 8, background: isActive ? nexAlpha('green', 0.08) : NEX.surface2, border: `1px solid ${isActive ? nexAlpha('green', 0.25) : NEX.border}`, transition: 'all 0.15s' }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ accentColor: NEX.green, width: 15, height: 15 }} />
            <div>
              <div className="text-[12.5px] font-medium" style={{ color: isActive ? NEX.green : NEX.text }}>Categoria ativa</div>
              <div className="text-[11px]" style={{ color: NEX.textMute }}>Aparece na seleção ao cadastrar acessórios</div>
            </div>
          </label>

          <div className="flex flex-col gap-2 pt-1">
            <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className="w-full justify-center"
              disabled={!name.trim() || save.isPending}
              onClick={() => {
                if (!name.trim()) return
                save.mutate({ id: editingId ?? undefined, data: { name: name.trim(), parentId: parentId || undefined, isActive } })
              }}
            >
              {editingId ? 'Salvar alterações' : 'Criar categoria'}
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => { setDrawerOpen(false); resetForm() }}>Cancelar</Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(o) => { if (!o) setPendingToggle(null) }}
        title={pendingToggle?.isActive ? 'Desativar categoria?' : 'Ativar categoria?'}
        description={pendingToggle ? (pendingToggle.isActive ? `"${pendingToggle.name}" não aparecerá na seleção.` : `"${pendingToggle.name}" voltará a aparecer.`) : ''}
        confirmLabel={pendingToggle?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggle?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => { if (pendingToggle) toggleActive.mutate(pendingToggle) }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null) }}
        title="Excluir categoria?"
        description={pendingDelete ? `Esta ação removerá "${pendingDelete.name}". Acessórios vinculados perderão a categoria.` : ''}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => { if (pendingDelete) remove.mutate(pendingDelete.id) }}
      />
    </div>
  )
}
