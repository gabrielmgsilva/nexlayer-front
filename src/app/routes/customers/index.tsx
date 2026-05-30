import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icon, Icons, NEX } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DrawerPanel } from '@/components/ui/drawer'
import { customersService } from '@/services/entities.service'
import type { Customer } from '@/types/api.types'

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function formatCpf(value: string) {
  const digits = digitsOnly(value).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatCnpj(value: string) {
  const digits = digitsOnly(value).slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function formatPhone(value: string) {
  const digits = digitsOnly(value).slice(0, 11)
  if (digits.length <= 2) return digits.length === 0 ? '' : `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatZipCode(value: string) {
  const digits = digitsOnly(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

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

export function CustomersPage() {
  const queryClient = useQueryClient()
  const { data: res } = useQuery({ queryKey: ['customers', 'list'], queryFn: () => customersService.findAll({ limit: 200 }) })
  const list: Customer[] = res?.data ?? []

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingToggleCustomer, setPendingToggleCustomer] = useState<Customer | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [type, setType] = useState<'PF' | 'PJ'>('PF')
  const [name, setName] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [documentDigits, setDocumentDigits] = useState('')
  const [email, setEmail] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [zipCodeDigits, setZipCodeDigits] = useState('')
  const [street, setStreet] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [ibgeCode, setIbgeCode] = useState('')
  const [inscricaoEstadual, setInscricaoEstadual] = useState('')
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('')

  const getApiMessage = (err: unknown, fallback: string) => {
    const message = (err as { response?: { data?: { message?: string | string[] } } })
      ?.response?.data?.message
    if (Array.isArray(message)) return message[0] ?? fallback
    return message ?? fallback
  }

  const resetForm = () => {
    setEditingId(null)
    setType('PF')
    setName('')
    setRazaoSocial('')
    setDocumentDigits('')
    setEmail('')
    setPhoneDigits('')
    setZipCodeDigits('')
    setStreet('')
    setAddressNumber('')
    setComplement('')
    setNeighborhood('')
    setCity('')
    setState('')
    setIbgeCode('')
    setInscricaoEstadual('')
    setInscricaoMunicipal('')
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    resetForm()
  }

  const openNew = () => {
    resetForm()
    setDrawerOpen(true)
  }

  const startEdit = (customer: Customer) => {
    const nextType = customer.type ?? (customer.cnpj ? 'PJ' : 'PF')
    setEditingId(customer.id)
    setType(nextType)
    setName(customer.name ?? '')
    setRazaoSocial(customer.razaoSocial ?? '')
    setDocumentDigits(
      digitsOnly(nextType === 'PJ' ? (customer.cnpj ?? '') : (customer.cpf ?? '')).slice(0, nextType === 'PJ' ? 14 : 11),
    )
    setEmail(customer.email ?? '')
    setPhoneDigits(digitsOnly(customer.phone ?? '').slice(0, 11))
    setZipCodeDigits(digitsOnly(customer.zipCode ?? '').slice(0, 8))
    setStreet(customer.street ?? '')
    setAddressNumber(customer.addressNumber ?? '')
    setComplement(customer.complement ?? '')
    setNeighborhood(customer.neighborhood ?? '')
    setCity(customer.city ?? '')
    setState((customer.state ?? '').toUpperCase().slice(0, 2))
    setIbgeCode(digitsOnly(customer.ibgeCode ?? '').slice(0, 7))
    setInscricaoEstadual(customer.inscricaoEstadual ?? '')
    setInscricaoMunicipal(customer.inscricaoMunicipal ?? '')
    setDrawerOpen(true)
  }

  const documentLimit = type === 'PF' ? 11 : 14
  const hasRequiredAddress = !!(street.trim() && addressNumber.trim() && neighborhood.trim() && city.trim() && state.trim().length === 2 && zipCodeDigits.length === 8)
  const hasRequiredIdentity = type === 'PF'
    ? documentDigits.length === 11
    : documentDigits.length === 14 && !!razaoSocial.trim()
  const canSubmit = !!name.trim() && hasRequiredIdentity && hasRequiredAddress

  const buildPayload = () => ({
    type,
    name: name.trim(),
    razaoSocial: type === 'PJ' ? razaoSocial.trim() || undefined : undefined,
    email: email.trim() || undefined,
    phone: phoneDigits || undefined,
    cpf: type === 'PF' ? documentDigits : undefined,
    cnpj: type === 'PJ' ? documentDigits : undefined,
    street: street.trim(),
    addressNumber: addressNumber.trim(),
    complement: complement.trim() || undefined,
    neighborhood: neighborhood.trim(),
    city: city.trim(),
    state: state.trim().toUpperCase(),
    zipCode: zipCodeDigits,
    ibgeCode: ibgeCode || undefined,
    inscricaoEstadual: type === 'PJ' ? inscricaoEstadual.trim() || undefined : undefined,
    inscricaoMunicipal: type === 'PJ' ? inscricaoMunicipal.trim() || undefined : undefined,
  })

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      payload.id
        ? customersService.update(payload.id, payload.data)
        : customersService.create(payload.data),
    onSuccess: (_, payload) => {
      toast.success(payload.id ? 'Cliente atualizado' : 'Cliente criado')
      closeDrawer()
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar cliente')),
  })

  const toggleActive = useMutation({
    mutationFn: (customer: Customer) => customersService.update(customer.id, { isActive: !customer.isActive }),
    onSuccess: (_, customer) => {
      toast.success(customer.isActive ? 'Cliente desativado' : 'Cliente ativado')
      setPendingToggleCustomer(null)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status do cliente')),
  })

  const submit = () => {
    if (!canSubmit) return
    save.mutate({ id: editingId ?? undefined, data: buildPayload() })
  }

  return (
    <div className="px-8 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold">Clientes</h1>
          <p className="text-[12px] mt-0.5" style={{ color: NEX.textMute }}>
            {list.length} cadastrado{list.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Btn kind="primary" size="md" icon={Icons.plus} onClick={openNew}>
          Novo cliente
        </Btn>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
      >
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              <th className="px-4 py-2.5 text-left font-medium" style={{ color: NEX.textDim }}>Nome</th>
              <th className="px-2 py-2.5 text-left font-medium" style={{ color: NEX.textDim }}>Tipo</th>
              <th className="px-2 py-2.5 text-left font-medium" style={{ color: NEX.textDim }}>CPF / CNPJ</th>
              <th className="px-2 py-2.5 text-left font-medium" style={{ color: NEX.textDim }}>Cidade</th>
              <th className="px-2 py-2.5 text-left font-medium" style={{ color: NEX.textDim }}>Telefone</th>
              <th className="px-2 py-2.5 text-left font-medium" style={{ color: NEX.textDim }}>Status</th>
              <th className="px-4 py-2.5 text-right font-medium" style={{ color: NEX.textDim }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[12px]" style={{ color: NEX.textMute }}>
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
            {list.map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-2">
                  <Pill tone="default">{c.type}</Pill>
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {c.type === 'PJ'
                    ? (c.cnpj ? formatCnpj(c.cnpj) : '—')
                    : (c.cpf ? formatCpf(c.cpf) : '—')}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {c.city && c.state ? `${c.city}/${c.state}` : '—'}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {c.phone ? formatPhone(c.phone) : '—'}
                </td>
                <td className="px-2">
                  <Pill tone={c.isActive ? 'green' : 'default'}>{c.isActive ? 'Ativo' : 'Inativo'}</Pill>
                </td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-3">
                    <button onClick={() => startEdit(c)} className="text-[11px]" style={{ color: NEX.cyan }}>
                      Alterar
                    </button>
                    <button onClick={() => setPendingToggleCustomer(c)} className="text-[11px]" style={{ color: NEX.amber }}>
                      {c.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Drawer ──────────────────────────────────────────────── */}
      <DrawerPanel open={drawerOpen} onClose={closeDrawer} width={520}>
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: `1px solid ${NEX.border}` }}
            >
              <div>
                <div className="text-[14px] font-semibold">
                  {editingId ? 'Alterar cliente' : 'Novo cliente'}
                </div>
                {editingId && (
                  <div className="text-[11px] mt-0.5" style={{ color: NEX.textDim }}>
                    Editando cadastro existente
                  </div>
                )}
              </div>
              <button
                onClick={closeDrawer}
                className="h-7 w-7 flex items-center justify-center rounded-md transition-colors"
                style={{ color: NEX.textDim }}
                onMouseEnter={(e) => { e.currentTarget.style.background = NEX.surface2 }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <Icon d={Icons.x} size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="h-9 rounded text-[12px] font-medium"
                  style={{
                    background: type === 'PF' ? NEX.cyanDim : NEX.surface2,
                    color: type === 'PF' ? NEX.cyan : NEX.textDim,
                    border: `1px solid ${NEX.border}`,
                  }}
                  onClick={() => {
                    setType('PF')
                    setDocumentDigits((prev) => prev.slice(0, 11))
                    setRazaoSocial('')
                    setInscricaoEstadual('')
                    setInscricaoMunicipal('')
                  }}
                >
                  Pessoa Física (PF)
                </button>
                <button
                  type="button"
                  className="h-9 rounded text-[12px] font-medium"
                  style={{
                    background: type === 'PJ' ? NEX.cyanDim : NEX.surface2,
                    color: type === 'PJ' ? NEX.cyan : NEX.textDim,
                    border: `1px solid ${NEX.border}`,
                  }}
                  onClick={() => {
                    setType('PJ')
                    setDocumentDigits((prev) => prev.slice(0, 14))
                  }}
                >
                  Pessoa Jurídica (PJ)
                </button>
              </div>

              <div
                className="text-[10px] uppercase tracking-wider font-semibold pt-1"
                style={{ color: NEX.textMute }}
              >
                Identificação
              </div>

              <Field label={type === 'PJ' ? 'Nome fantasia *' : 'Nome completo *'}>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>

              {type === 'PJ' && (
                <Field label="Razão social *">
                  <input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} className={inputCls} />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Field label={type === 'PJ' ? 'CNPJ *' : 'CPF *'}>
                  <input
                    value={type === 'PJ' ? formatCnpj(documentDigits) : formatCpf(documentDigits)}
                    onChange={(e) => setDocumentDigits(digitsOnly(e.target.value).slice(0, documentLimit))}
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
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </Field>

              {type === 'PJ' && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Inscrição estadual">
                    <input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Inscrição municipal">
                    <input value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} className={inputCls} />
                  </Field>
                </div>
              )}

              <div
                className="text-[10px] uppercase tracking-wider font-semibold pt-2"
                style={{ color: NEX.textMute }}
              >
                Endereço
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Field label="CEP *">
                  <input
                    value={formatZipCode(zipCodeDigits)}
                    onChange={(e) => setZipCodeDigits(digitsOnly(e.target.value).slice(0, 8))}
                    inputMode="numeric"
                    className={inputCls}
                  />
                </Field>
                <Field label="Número *">
                  <input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Complemento">
                  <input value={complement} onChange={(e) => setComplement(e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label="Logradouro *">
                <input value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} />
              </Field>

              <Field label="Bairro *">
                <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputCls} />
              </Field>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field label="Cidade *">
                    <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <Field label="UF *">
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                    className={inputCls + ' uppercase'}
                  />
                </Field>
              </div>

              <Field label="Código IBGE (município)">
                <input
                  value={ibgeCode}
                  onChange={(e) => setIbgeCode(digitsOnly(e.target.value).slice(0, 7))}
                  inputMode="numeric"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4 flex gap-2 flex-shrink-0"
              style={{ borderTop: `1px solid ${NEX.border}` }}
            >
              <Btn kind="ghost" size="md" className="flex-1 justify-center" onClick={closeDrawer}>
                Cancelar
              </Btn>
              <Btn
                kind="primary"
                size="md"
                icon={editingId ? Icons.check : Icons.plus}
                className="flex-1 justify-center"
                disabled={!canSubmit || save.isPending}
                onClick={submit}
              >
                {save.isPending ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar cliente'}
              </Btn>
            </div>
      </DrawerPanel>

      <ConfirmDialog
        open={!!pendingToggleCustomer}
        onOpenChange={(open) => { if (!open) setPendingToggleCustomer(null) }}
        title={pendingToggleCustomer?.isActive ? 'Desativar cliente?' : 'Ativar cliente?'}
        description={pendingToggleCustomer
          ? (pendingToggleCustomer.isActive
            ? `Esta ação desativará o cliente "${pendingToggleCustomer.name}" para novas vendas.`
            : `Esta ação ativará o cliente "${pendingToggleCustomer.name}" para novas vendas.`)
          : 'Confirme a alteração de status do cliente selecionado.'}
        confirmLabel={pendingToggleCustomer?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggleCustomer?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => { if (!pendingToggleCustomer) return; toggleActive.mutate(pendingToggleCustomer) }}
      />
    </div>
  )
}
