import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { categoriesService } from '@/services/entities.service'
import type { Category } from '@/types/api.types'
import { Field, inputCls, getApiMessage } from './_shared'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: NEX.textMute }}>{label}</div>
      {children}
    </div>
  )
}

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'list', 'all'],
    queryFn: () => categoriesService.findAll(),
  })

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [pendingToggle, setPendingToggle] = useState<Category | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [isActive, setIsActive] = useState(true)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c: Category) =>
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q),
    )
  }, [categories, search])

  // Parent options: exclude self and own descendants when editing
  const parentOptions = useMemo(() => {
    if (!editingId) return categories.filter((c: Category) => c.isActive)
    return categories.filter((c: Category) => c.isActive && c.id !== editingId)
  }, [categories, editingId])

  // Auto-generate slug from name unless manually edited
  useEffect(() => {
    if (!slugManual) setSlug(slugify(name))
  }, [name, slugManual])

  const resetForm = () => {
    setEditingId(null); setName(''); setSlug(''); setSlugManual(false)
    setDescription(''); setParentId(''); setIsActive(true)
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (c: Category) => {
    setEditingId(c.id); setName(c.name); setSlug(c.slug); setSlugManual(true)
    setDescription(c.description ?? ''); setParentId(c.parentId ?? '')
    setIsActive(c.isActive); setDrawerOpen(true)
  }

  const buildPayload = () => ({
    name: name.trim(),
    slug: slug.trim() || slugify(name),
    description: description.trim() || undefined,
    parentId: parentId || undefined,
    isActive,
  })

  const save = useMutation({
    mutationFn: (p: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      p.id ? categoriesService.update(p.id, p.data) : categoriesService.create(p.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Categoria atualizada' : 'Categoria criada')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar categoria')),
  })

  const toggleActive = useMutation({
    mutationFn: (c: Category) => categoriesService.update(c.id, { isActive: !c.isActive }),
    onSuccess: (_, c) => {
      toast.success(c.isActive ? 'Categoria desativada' : 'Categoria ativada')
      setPendingToggle(null)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => categoriesService.remove(id),
    onSuccess: () => {
      toast.success('Categoria removida')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover categoria')),
  })

  const canSubmit = !!name.trim() && !!slug.trim()

  const parentMap = useMemo(() => {
    const m: Record<string, string> = {}
    categories.forEach((c: Category) => { m[c.id] = c.name })
    return m
  }, [categories])

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoria..."
            className="bg-transparent flex-1 text-[12.5px] focus:outline-none"
            style={{ color: NEX.text }}
          />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>
            {filtered.length} {filtered.length === 1 ? 'categoria' : 'categorias'}
          </span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Nova categoria</Btn>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Categoria', 'Slug', 'Categoria pai', 'Produtos', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                  <Icon d={Icons.layers} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p className="text-[13px]">
                    {search ? `Nenhum resultado para "${search}"` : 'Nenhuma categoria cadastrada.'}
                  </p>
                  {!search && (
                    <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>
                      Adicionar primeira categoria
                    </Btn>
                  )}
                </div>
              </td></tr>
            )}
            {filtered.map((c: Category) => (
              <tr key={c.id} className="group" style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: NEX.text }}>{c.name}</div>
                  {c.description && (
                    <div className="text-[11px] truncate max-w-[200px]" style={{ color: NEX.textDim }}>{c.description}</div>
                  )}
                </td>
                <td className="px-2">
                  <span className="font-mono text-[11.5px] px-1.5 py-0.5 rounded" style={{ background: NEX.surface2, color: NEX.textDim }}>
                    {c.slug}
                  </span>
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {c.parentId ? (parentMap[c.parentId] ?? '—') : <span style={{ color: NEX.textMute }}>Raiz</span>}
                </td>
                <td className="px-2 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>
                  {c._count?.products ?? 0}
                </td>
                <td className="px-2">
                  <Pill tone={c.isActive ? 'green' : 'default'}>{c.isActive ? 'Ativa' : 'Inativa'}</Pill>
                </td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(c)}>
                      <Icon d={Icons.edit} size={12} />
                    </ActionBtn>
                    <ActionBtn color={NEX.amber} title={c.isActive ? 'Desativar' : 'Ativar'} onClick={() => setPendingToggle(c)}>
                      <Icon d={c.isActive ? Icons.x : Icons.check} size={12} />
                    </ActionBtn>
                    <ActionBtn
                      color={(c._count?.products ?? 0) > 0 || (c._count?.children ?? 0) > 0 ? NEX.textMute : NEX.red}
                      title={(c._count?.products ?? 0) > 0 ? 'Categoria com produtos — não pode excluir' : 'Excluir'}
                      disabled={(c._count?.products ?? 0) > 0 || (c._count?.children ?? 0) > 0}
                      onClick={() => setPendingDelete(c)}
                    >
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
        title={editingId ? 'Editar categoria' : 'Nova categoria'}
      >
        <div className="space-y-5">
          <Section label="Identificação">
            <Field label="Nome *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Ex.: Chaveiros"
                autoFocus
              />
            </Field>

            <Field label="Slug *">
              <div className="flex items-center">
                <input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }}
                  className={inputCls + ' font-mono flex-1'}
                  placeholder="ex.: chaveiros"
                />
                {slugManual && (
                  <button
                    onClick={() => { setSlug(slugify(name)); setSlugManual(false) }}
                    className="px-2 text-[11px] flex-shrink-0"
                    style={{ color: NEX.cyan }}
                    title="Regenerar a partir do nome"
                  >
                    ↺
                  </button>
                )}
              </div>
              <div className="px-3 pb-1 text-[10.5px]" style={{ color: NEX.textMute }}>
                Usado na URL · apenas letras minúsculas, números e hífens
              </div>
            </Field>

            <Field label="Descrição">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[68px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y"
                placeholder="Descrição opcional da categoria"
              />
            </Field>
          </Section>

          <Section label="Hierarquia">
            <Field label="Categoria pai">
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}>
                <option value="">Nenhuma (categoria raiz)</option>
                {parentOptions.map((c: Category) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </Section>

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
                Aparece na seleção ao criar produtos
              </div>
            </div>
          </label>

          <div className="flex flex-col gap-2 pt-1">
            <Btn
              kind="primary" size="md"
              icon={editingId ? Icons.check : Icons.plus}
              className="w-full justify-center"
              disabled={!canSubmit || save.isPending}
              onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}
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
            ? `"${pendingToggle.name}" não aparecerá na seleção de produtos.`
            : `"${pendingToggle.name}" voltará a aparecer na seleção de produtos.`)
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
          ? `Esta ação removerá permanentemente "${pendingDelete.name}". Produtos vinculados perderão a categoria.`
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
