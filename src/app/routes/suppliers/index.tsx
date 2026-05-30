import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Btn, Icons, NEX } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { suppliersService } from '@/services/entities.service'
import type { Supplier } from '@/types/api.types'

const inputCls = 'w-full h-9 px-3 bg-transparent text-[13px] focus:outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>{label}</span>
      <div style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6, color: NEX.text }}>
        {children}
      </div>
    </label>
  )
}

function getApiMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  if (Array.isArray(message)) return message[0] ?? fallback
  return message ?? fallback
}

function digitsOnly(value: string) { return value.replace(/\D/g, '') }

function formatPhone(value: string) {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length <= 2) return d.length === 0 ? '' : `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function formatCnpjCpf(value: string) {
  const d = digitsOnly(value)
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
  const { data: res } = useQuery({
    queryKey: ['suppliers', 'list'],
    queryFn: () => suppliersService.findAll({ limit: 200 }),
  })
  const list: Supplier[] = res?.data ?? []

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

  const resetForm = () => {
    setEditingId(null); setName(''); setContactName(''); setEmail('')
    setPhoneDigits(''); setWebsite(''); setCnpjCpfDigits(''); setAddress(''); setNotes('')
  }

  const startEdit = (supplier: Supplier) => {
    setEditingId(supplier.id)
    setName(supplier.name)
    setContactName(supplier.contactName ?? '')
    setEmail(supplier.email ?? '')
    setPhoneDigits(digitsOnly(supplier.phone ?? '').slice(0, 11))
    setWebsite(supplier.website ?? '')
    setCnpjCpfDigits(digitsOnly(supplier.cnpjCpf ?? '').slice(0, 14))
    setAddress(supplier.address ?? '')
    setNotes(supplier.notes ?? '')
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
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar fornecedor')),
  })

  const toggleActive = useMutation({
    mutationFn: (supplier: Supplier) =>
      suppliersService.update(supplier.id, { isActive: !supplier.isActive }),
    onSuccess: (_, supplier) => {
      toast.success(supplier.isActive ? 'Fornecedor desativado' : 'Fornecedor ativado')
      setPendingToggle(null)
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => suppliersService.remove(id),
    onSuccess: () => {
      toast.success('Fornecedor removido')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover fornecedor')),
  })

  const canSubmit = !!name.trim()

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Fornecedores</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>
            Empresas e pessoas que fornecem materiais e acessórios.
          </div>
        </div>

        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
              {['Fornecedor', 'Contato', 'CNPJ / CPF', 'Telefone', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: NEX.textDim }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>
                  Nenhum fornecedor cadastrado.
                </td>
              </tr>
            )}
            {list.map((supplier) => (
              <tr key={supplier.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3">
                  <div className="font-medium">{supplier.name}</div>
                  {supplier.email && (
                    <div className="text-[11px]" style={{ color: NEX.textDim }}>{supplier.email}</div>
                  )}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {supplier.contactName || '—'}
                </td>
                <td className="px-2 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>
                  {supplier.cnpjCpf ? formatCnpjCpf(supplier.cnpjCpf) : '—'}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {supplier.phone ? formatPhone(supplier.phone) : '—'}
                </td>
                <td className="px-2">
                  <Pill tone={supplier.isActive ? 'green' : 'default'}>
                    {supplier.isActive ? 'Ativo' : 'Inativo'}
                  </Pill>
                </td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-3">
                    <button onClick={() => startEdit(supplier)} className="text-[11px]" style={{ color: NEX.cyan }}>
                      Alterar
                    </button>
                    <button onClick={() => setPendingToggle(supplier)} className="text-[11px]" style={{ color: NEX.amber }}>
                      {supplier.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => setPendingDelete(supplier)} className="text-[11px]" style={{ color: NEX.red }}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="text-[13px] font-semibold mb-3">
          {editingId ? 'Alterar fornecedor' : 'Novo fornecedor'}
        </div>
        <div className="space-y-3">
          <Field label="Nome *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: Bambu Lab Brasil" />
          </Field>

          <Field label="Nome do contato">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="CNPJ / CPF">
              <input
                value={formatCnpjCpf(cnpjCpfDigits)}
                onChange={(e) => setCnpjCpfDigits(digitsOnly(e.target.value).slice(0, 14))}
                inputMode="numeric"
                className={inputCls}
              />
            </Field>
            <Field label="Telefone">
              <input
                value={formatPhone(phoneDigits)}
                onChange={(e) => setPhoneDigits(digitsOnly(e.target.value).slice(0, 11))}
                inputMode="numeric"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="E-mail">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} type="email" />
          </Field>

          <Field label="Website">
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" />
          </Field>

          <Field label="Endereço">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Observações">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[72px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y"
            />
          </Field>

          <div className="flex gap-2">
            {editingId && (
              <Btn kind="ghost" size="md" className="flex-1 justify-center" onClick={resetForm}>
                Cancelar alteração
              </Btn>
            )}
            <Btn
              kind="primary"
              size="md"
              icon={editingId ? Icons.check : Icons.plus}
              className={(editingId ? 'flex-1' : 'w-full') + ' justify-center'}
              disabled={!canSubmit || save.isPending}
              onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}
            >
              {editingId ? 'Salvar alterações' : 'Criar fornecedor'}
            </Btn>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(open) => { if (!open) setPendingToggle(null) }}
        title={pendingToggle?.isActive ? 'Desativar fornecedor?' : 'Ativar fornecedor?'}
        description={pendingToggle
          ? (pendingToggle.isActive
            ? `O fornecedor "${pendingToggle.name}" não aparecerá nas seleções ativas.`
            : `O fornecedor "${pendingToggle.name}" voltará a aparecer nas seleções ativas.`)
          : ''}
        confirmLabel={pendingToggle?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggle?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => { if (!pendingToggle) return; toggleActive.mutate(pendingToggle) }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
        title="Excluir fornecedor?"
        description={pendingDelete
          ? `Esta ação removerá permanentemente o fornecedor "${pendingDelete.name}". Acessórios e materiais vinculados perderão a referência.`
          : ''}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => { if (!pendingDelete) return; remove.mutate(pendingDelete.id) }}
      />
    </div>
  )
}
