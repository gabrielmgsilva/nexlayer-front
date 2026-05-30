import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { suppliersService } from '@/services/entities.service'
import type { Supplier } from '@/types/api.types'

const inputCls = 'w-full h-9 px-3 bg-transparent text-[13px] focus:outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>{label}</span>
      <div style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6, color: NEX.text }}>{children}</div>
    </label>
  )
}

function getApiMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  if (Array.isArray(message)) return message[0] ?? fallback
  return message ?? fallback
}

function digitsOnly(v: string) { return v.replace(/\D/g, '') }

function formatPhone(v: string) {
  const d = digitsOnly(v).slice(0, 11)
  if (d.length <= 2) return d.length === 0 ? '' : `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function formatCnpjCpf(v: string) {
  const d = digitsOnly(v)
  if (d.length <= 11) {
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }
  const c = d.slice(0, 14)
  if (c.length <= 2) return c
  if (c.length <= 5) return `${c.slice(0, 2)}.${c.slice(2)}`
  if (c.length <= 8) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`
  if (c.length <= 12) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
}

export function SuppliersPage() {
  const queryClient = useQueryClient()
  const { data: res } = useQuery({ queryKey: ['suppliers', 'list'], queryFn: () => suppliersService.findAll({ limit: 200 }) })
  const list: Supplier[] = res?.data ?? []

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null)
  const [pendingToggle, setPendingToggle] = useState<Supplier | null>(null)

  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [website, setWebsite] = useState('')
  const [cnpjCpfDigits, setCnpjCpfDigits] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) => s.name.toLowerCase().includes(q) || (s.contactName ?? '').toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q))
  }, [list, search])

  const resetForm = () => {
    setEditingId(null); setName(''); setContactName(''); setEmail('')
    setPhoneDigits(''); setWebsite(''); setCnpjCpfDigits(''); setAddress(''); setNotes('')
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (s: Supplier) => {
    setEditingId(s.id); setName(s.name); setContactName(s.contactName ?? '')
    setEmail(s.email ?? ''); setPhoneDigits(digitsOnly(s.phone ?? '').slice(0, 11))
    setWebsite(s.website ?? ''); setCnpjCpfDigits(digitsOnly(s.cnpjCpf ?? '').slice(0, 14))
    setAddress(s.address ?? ''); setNotes(s.notes ?? '')
    setDrawerOpen(true)
  }

  const buildPayload = () => ({
    name: name.trim(),
    contactName: contactName.trim() || undefined,
    email: email.trim() || undefined,
    phone: phoneDigits || undefined,
    website: website.trim() || undefined,
    cnpjCpf: cnpjCpfDigits || undefined,
    address: address.trim() || undefined,
    notes: notes.trim() || undefined,
  })

  const save = useMutation({
    mutationFn: (p: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      p.id ? suppliersService.update(p.id, p.data) : suppliersService.create(p.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Fornecedor atualizado' : 'Fornecedor criado')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar fornecedor')),
  })

  const toggleActive = useMutation({
    mutationFn: (s: Supplier) => suppliersService.update(s.id, { isActive: !s.isActive }),
    onSuccess: (_, s) => {
      toast.success(s.isActive ? 'Fornecedor desativado' : 'Fornecedor ativado')
      setPendingToggle(null)
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => suppliersService.remove(id),
    onSuccess: () => { toast.success('Fornecedor removido'); setPendingDelete(null); queryClient.invalidateQueries({ queryKey: ['suppliers'] }) },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover fornecedor')),
  })

  return (
    <div className="px-8 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar fornecedor..." className="bg-transparent flex-1 text-[12.5px] focus:outline-none" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>{filtered.length} {filtered.length === 1 ? 'fornecedor' : 'fornecedores'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Novo fornecedor</Btn>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Fornecedor', 'Contato', 'CNPJ / CPF', 'Telefone', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                  <Icon d={Icons.truck} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p className="text-[13px]">{search ? `Nenhum resultado para "${search}"` : 'Nenhum fornecedor cadastrado.'}</p>
                  {!search && <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>Adicionar primeiro fornecedor</Btn>}
                </div>
              </td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="group" style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: NEX.text }}>{s.name}</div>
                  {s.email && <div className="text-[11px]" style={{ color: NEX.textDim }}>{s.email}</div>}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{s.contactName || '—'}</td>
                <td className="px-2 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>{s.cnpjCpf ? formatCnpjCpf(s.cnpjCpf) : '—'}</td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{s.phone ? formatPhone(s.phone) : '—'}</td>
                <td className="px-2"><Pill tone={s.isActive ? 'green' : 'default'}>{s.isActive ? 'Ativo' : 'Inativo'}</Pill></td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(s)}><Icon d={Icons.edit} size={12} /></ActionBtn>
                    <ActionBtn color={NEX.amber} title={s.isActive ? 'Desativar' : 'Ativar'} onClick={() => setPendingToggle(s)}><Icon d={s.isActive ? Icons.x : Icons.check} size={12} /></ActionBtn>
                    <ActionBtn color={NEX.red} title="Excluir" onClick={() => setPendingDelete(s)}><Icon d={Icons.trash} size={12} /></ActionBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Editar fornecedor' : 'Novo fornecedor'}>
        <div className="space-y-4">
          <Field label="Nome *"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: Bambu Lab Brasil" autoFocus /></Field>
          <Field label="Nome do contato"><input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ / CPF">
              <input value={formatCnpjCpf(cnpjCpfDigits)} onChange={(e) => setCnpjCpfDigits(digitsOnly(e.target.value).slice(0, 14))} inputMode="numeric" className={inputCls} />
            </Field>
            <Field label="Telefone">
              <input value={formatPhone(phoneDigits)} onChange={(e) => setPhoneDigits(digitsOnly(e.target.value).slice(0, 11))} inputMode="numeric" className={inputCls} />
            </Field>
          </div>
          <Field label="E-mail"><input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} type="email" /></Field>
          <Field label="Website"><input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" /></Field>
          <Field label="Endereço"><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></Field>
          <Field label="Observações"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[72px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" /></Field>
          <div className="flex flex-col gap-2 pt-1">
            <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className="w-full justify-center" disabled={!name.trim() || save.isPending}
              onClick={() => { if (name.trim()) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}>
              {editingId ? 'Salvar alterações' : 'Criar fornecedor'}
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>Cancelar</Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!pendingToggle} onOpenChange={(o) => { if (!o) setPendingToggle(null) }}
        title={pendingToggle?.isActive ? 'Desativar fornecedor?' : 'Ativar fornecedor?'}
        description={pendingToggle ? (pendingToggle.isActive ? `"${pendingToggle.name}" não aparecerá nas seleções ativas.` : `"${pendingToggle.name}" voltará a aparecer nas seleções ativas.`) : ''}
        confirmLabel={pendingToggle?.isActive ? 'Desativar' : 'Ativar'} variant={pendingToggle?.isActive ? 'danger' : 'default'} loading={toggleActive.isPending}
        onConfirm={() => { if (pendingToggle) toggleActive.mutate(pendingToggle) }} />

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null) }}
        title="Excluir fornecedor?" description={pendingDelete ? `Esta ação removerá permanentemente "${pendingDelete.name}". Acessórios vinculados perderão a referência.` : ''}
        confirmLabel="Excluir" variant="danger" loading={remove.isPending}
        onConfirm={() => { if (pendingDelete) remove.mutate(pendingDelete.id) }} />
    </div>
  )
}

function ActionBtn({ children, color, title, onClick, disabled }: { children: React.ReactNode; color: string; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="h-7 w-7 rounded flex items-center justify-center transition-colors disabled:opacity-30"
      style={{ color, background: 'transparent' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = nexAlpha('surface2', 1) }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
      {children}
    </button>
  )
}
