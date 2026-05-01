import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Btn, Icon, Icons, NEX, FilamentDot, Money } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { salesChannelService, customersService, costConfigService, domainService, equipmentService } from '@/services/entities.service'
import type { Customer, SalesChannel, CostConfig, Color } from '@/types/api.types'

type Tab = 'channels' | 'customers' | 'colors' | 'cost-center'

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'channels',  label: 'Canais',     icon: Icons.link },
  { id: 'customers', label: 'Clientes',   icon: Icons.user },
  { id: 'colors',    label: 'Cores',      icon: Icons.spool },
  { id: 'cost-center', label: 'Centro de custo', icon: Icons.cog },
]

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('channels')
  return (
    <div className="px-8 py-6 space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-md w-fit" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded text-[12px] font-medium flex items-center gap-1.5"
            style={{ background: tab === t.id ? NEX.cyanDim : 'transparent', color: tab === t.id ? NEX.cyan : NEX.textDim }}>
            <Icon d={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'channels'  && <ChannelsTab />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'colors'    && <ColorsTab />}
      {tab === 'cost-center'  && <CostCenterTab />}
    </div>
  )
}

/* ─── Channels ────────────────────────────────────────────── */
function ChannelsTab() {
  const queryClient = useQueryClient()
  const { data: channels = [] } = useQuery({
    queryKey: ['sales', 'channels', 'all'],
    queryFn: () => salesChannelService.findAll({ includeInactive: true }),
  })

  const [pendingDeleteChannel, setPendingDeleteChannel] = useState<SalesChannel | null>(null)
  const [pendingToggleChannel, setPendingToggleChannel] = useState<SalesChannel | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [commission, setCommission] = useState(0)
  const [feeFixed, setFeeFixed] = useState(0)

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setCommission(0)
    setFeeFixed(0)
  }

  const startEdit = (channel: SalesChannel) => {
    setEditingId(channel.id)
    setName(channel.name)
    setCommission(Number(channel.commissionPercent) || 0)
    setFeeFixed(Number(channel.feeFixed) || 0)
  }

  const getApiMessage = (err: unknown, fallback: string) => {
    const message = (err as { response?: { data?: { message?: string | string[] } } })
      ?.response?.data?.message

    if (Array.isArray(message)) return message[0] ?? fallback
    return message ?? fallback
  }

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: { name: string; commissionPercent: number; feeFixed: number } }) =>
      payload.id
        ? salesChannelService.update(payload.id, payload.data)
        : salesChannelService.create(payload.data),
    onSuccess: (_, payload) => {
      toast.success(payload.id ? 'Canal atualizado' : 'Canal criado')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['sales', 'channels'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar canal')),
  })

  const toggleActive = useMutation({
    mutationFn: (channel: SalesChannel) => salesChannelService.update(channel.id, { isActive: !channel.isActive }),
    onSuccess: (_, channel) => {
      toast.success(channel.isActive ? 'Canal desativado' : 'Canal ativado')
      setPendingToggleChannel(null)
      queryClient.invalidateQueries({ queryKey: ['sales', 'channels'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status do canal')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => salesChannelService.remove(id),
    onSuccess: () => {
      toast.success('Canal removido')
      setPendingDeleteChannel(null)
      queryClient.invalidateQueries({ queryKey: ['sales', 'channels'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover canal')),
  })

  const submit = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    save.mutate({
      id: editingId ?? undefined,
      data: {
        name: trimmedName,
        commissionPercent: Number(commission) || 0,
        feeFixed: Number(feeFixed) || 0,
      },
    })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Canais de venda</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>Lojas e marketplaces onde você vende.</div>
        </div>
        <table className="w-full text-[12.5px]">
          <tbody>
            {channels.length === 0 && <tr><td className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>Nenhum canal cadastrado.</td></tr>}
            {channels.map((c: SalesChannel) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-2"><Pill tone="default">{Number(c.commissionPercent).toFixed(2)}% comissão</Pill></td>
                <td className="px-2"><Pill tone="default"><Money value={Number(c.feeFixed ?? 0)} /></Pill></td>
                <td className="px-2"><Pill tone={c.isActive ? 'green' : 'default'}>{c.isActive ? 'Ativo' : 'Inativo'}</Pill></td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-3">
                    <button onClick={() => startEdit(c)} className="text-[11px]" style={{ color: NEX.cyan }}>Alterar</button>
                    <button onClick={() => setPendingToggleChannel(c)} className="text-[11px]" style={{ color: NEX.amber }}>
                      {c.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => setPendingDeleteChannel(c)} className="text-[11px]" style={{ color: NEX.red }}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <div className="text-[13px] font-semibold mb-3">{editingId ? 'Alterar canal' : 'Novo canal'}</div>
        <div className="space-y-3">
          <Field label="Nome">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Shopee, Loja Própria…" />
          </Field>
          <Field label="Comissão (%)">
            <DecimalRtlInput value={commission} onValueChange={setCommission} max={100} suffix="%" className={inputCls + ' text-right tabular-nums'} />
          </Field>
          <Field label="Taxa fixa por venda (R$)">
            <DecimalRtlInput value={feeFixed} onValueChange={setFeeFixed} className={inputCls + ' text-right tabular-nums'} />
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
              disabled={!name.trim() || save.isPending}
              onClick={submit}
            >
              {editingId ? 'Salvar alterações' : 'Criar canal'}
            </Btn>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingDeleteChannel}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteChannel(null)
        }}
        title="Excluir canal de venda?"
        description={pendingDeleteChannel
          ? `Esta ação removerá permanentemente o canal "${pendingDeleteChannel.name}".`
          : 'Esta ação removerá permanentemente o canal selecionado.'}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => {
          if (!pendingDeleteChannel) return
          remove.mutate(pendingDeleteChannel.id)
        }}
      />

      <ConfirmDialog
        open={!!pendingToggleChannel}
        onOpenChange={(open) => {
          if (!open) setPendingToggleChannel(null)
        }}
        title={pendingToggleChannel?.isActive ? 'Desativar canal de venda?' : 'Ativar canal de venda?'}
        description={pendingToggleChannel
          ? (pendingToggleChannel.isActive
            ? `Esta ação desativará o canal "${pendingToggleChannel.name}" para novas vendas.`
            : `Esta ação ativará o canal "${pendingToggleChannel.name}" para novas vendas.`)
          : 'Confirme a alteração de status do canal selecionado.'}
        confirmLabel={pendingToggleChannel?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggleChannel?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => {
          if (!pendingToggleChannel) return
          toggleActive.mutate(pendingToggleChannel)
        }}
      />
    </div>
  )
}

/* ─── Customers ──────────────────────────────────────────── */
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

function CustomersTab() {
  const queryClient = useQueryClient()
  const { data: res } = useQuery({ queryKey: ['customers', 'list'], queryFn: () => customersService.findAll({ limit: 200 }) })
  const list: Customer[] = res?.data ?? []

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
      resetForm()
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
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Clientes</div>
        </div>
        <table className="w-full text-[12.5px]">
          <tbody>
            {list.length === 0 && <tr><td className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>Nenhum cliente.</td></tr>}
            {list.map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-2"><Pill tone="default">{c.type}</Pill></td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {c.type === 'PJ'
                    ? (c.cnpj ? formatCnpj(c.cnpj) : '—')
                    : (c.cpf ? formatCpf(c.cpf) : '—')}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{c.city && c.state ? `${c.city}/${c.state}` : '—'}</td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{c.phone ? formatPhone(c.phone) : '—'}</td>
                <td className="px-2 text-right">
                  <div className="inline-flex items-center gap-3">
                    <button onClick={() => startEdit(c)} className="text-[11px]" style={{ color: NEX.cyan }}>Alterar</button>
                    <button onClick={() => setPendingToggleCustomer(c)} className="text-[11px]" style={{ color: NEX.amber }}>
                      {c.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
                <td className="px-4">
                  <Pill tone={c.isActive ? 'green' : 'default'}>{c.isActive ? 'Ativo' : 'Inativo'}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <div className="text-[13px] font-semibold mb-3">{editingId ? 'Alterar cliente' : 'Novo cliente'}</div>
        <div className="space-y-3">
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

          <Field label={type === 'PJ' ? 'Nome fantasia *' : 'Nome completo *'}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>

          {type === 'PJ' && (
            <Field label="Razão social *">
              <input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} className={inputCls} />
            </Field>
          )}

          <Field label={type === 'PJ' ? 'CNPJ *' : 'CPF *'}>
            <input
              value={type === 'PJ' ? formatCnpj(documentDigits) : formatCpf(documentDigits)}
              onChange={(e) => setDocumentDigits(digitsOnly(e.target.value).slice(0, documentLimit))}
              inputMode="numeric"
              className={inputCls}
            />
          </Field>

          {type === 'PJ' && (
            <>
              <Field label="Inscrição estadual">
                <input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Inscrição municipal">
                <input value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} className={inputCls} />
              </Field>
            </>
          )}

          <Field label="Telefone">
            <input
              value={formatPhone(phoneDigits)}
              onChange={(e) => setPhoneDigits(digitsOnly(e.target.value).slice(0, 11))}
              inputMode="numeric"
              className={inputCls}
            />
          </Field>

          <Field label="E-mail"><input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>

          <Field label="CEP *">
            <input
              value={formatZipCode(zipCodeDigits)}
              onChange={(e) => setZipCodeDigits(digitsOnly(e.target.value).slice(0, 8))}
              inputMode="numeric"
              className={inputCls}
            />
          </Field>

          <Field label="Logradouro *"><input value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Número *"><input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className={inputCls} /></Field>
            <Field label="Complemento"><input value={complement} onChange={(e) => setComplement(e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Bairro *"><input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Cidade *"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
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
              onClick={submit}
            >
              {editingId ? 'Salvar alterações' : 'Criar cliente'}
            </Btn>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingToggleCustomer}
        onOpenChange={(open) => {
          if (!open) setPendingToggleCustomer(null)
        }}
        title={pendingToggleCustomer?.isActive ? 'Desativar cliente?' : 'Ativar cliente?'}
        description={pendingToggleCustomer
          ? (pendingToggleCustomer.isActive
            ? `Esta ação desativará o cliente "${pendingToggleCustomer.name}" para novas vendas.`
            : `Esta ação ativará o cliente "${pendingToggleCustomer.name}" para novas vendas.`)
          : 'Confirme a alteração de status do cliente selecionado.'}
        confirmLabel={pendingToggleCustomer?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggleCustomer?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => {
          if (!pendingToggleCustomer) return
          toggleActive.mutate(pendingToggleCustomer)
        }}
      />
    </div>
  )
}

/* ─── Colors ─────────────────────────────────────────────── */
function ColorsTab() {
  const queryClient = useQueryClient()
  const { data: colors = [] } = useQuery({ queryKey: ['domain', 'colors'], queryFn: () => domainService.getColors() })
  const [name, setName] = useState('')
  const [hexCode, setHex] = useState('#00D9FF')
  const [isRainbow, setRainbow] = useState(false)
  const [pendingDeleteColor, setPendingDeleteColor] = useState<Color | null>(null)
  const create = useMutation({
    mutationFn: () => domainService.createColor({ name, hexCode: isRainbow ? undefined : hexCode, isRainbow }),
    onSuccess: () => { toast.success('Cor criada'); setName(''); queryClient.invalidateQueries({ queryKey: ['domain', 'colors'] }) },
    onError: () => toast.error('Falha ao criar cor'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => domainService.deleteColor(id),
    onSuccess: () => {
      toast.success('Cor removida')
      setPendingDeleteColor(null)
      queryClient.invalidateQueries({ queryKey: ['domain', 'colors'] })
    },
    onError: () => toast.error('Falha ao remover cor'),
  })

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <div className="text-[13px] font-semibold mb-3">Cores cadastradas · {colors.length}</div>
        <div className="grid grid-cols-2 gap-2">
          {colors.map((c: Color) => (
            <div key={c.id} className="flex items-center gap-2 px-2 py-2 rounded-md" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
              {c.isRainbow ? (
                <span className="h-4 w-4 rounded-full" style={{ background: 'linear-gradient(45deg,#FF5C7A,#FFB547,#5EFF8A,#00D9FF,#B388FF)' }} />
              ) : (
                <FilamentDot color={c.hexCode ?? '#888'} size={16} />
              )}
              <span className="text-[12px] flex-1 truncate">{c.name}</span>
              <button onClick={() => setPendingDeleteColor(c)} className="text-[10px]" style={{ color: NEX.red }}>×</button>
            </div>
          ))}
          {colors.length === 0 && <div className="col-span-2 text-[12px] py-4" style={{ color: NEX.textMute }}>Nenhuma cor.</div>}
        </div>
      </Card>
      <Card>
        <div className="text-[13px] font-semibold mb-3">Nova cor</div>
        <div className="space-y-3">
          <Field label="Nome *"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          {!isRainbow && (
            <Field label="Código hex">
              <div className="flex items-center gap-2 px-2">
                <input type="color" value={hexCode} onChange={(e) => setHex(e.target.value)} className="h-7 w-10 cursor-pointer bg-transparent border-0" />
                <input value={hexCode} onChange={(e) => setHex(e.target.value)} className="flex-1 bg-transparent text-[12px] font-mono focus:outline-none" />
              </div>
            </Field>
          )}
          <label className="flex items-center gap-2 text-[12px]" style={{ color: NEX.textDim }}>
            <input type="checkbox" checked={isRainbow} onChange={(e) => setRainbow(e.target.checked)} />
            Rainbow / multicolor
          </label>
          <Btn kind="primary" size="md" icon={Icons.plus} className="w-full justify-center" disabled={!name || create.isPending} onClick={() => create.mutate()}>
            Criar cor
          </Btn>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingDeleteColor}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteColor(null)
        }}
        title="Excluir cor?"
        description={pendingDeleteColor
          ? `Esta ação removerá permanentemente a cor "${pendingDeleteColor.name}".`
          : 'Esta ação removerá permanentemente a cor selecionada.'}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => {
          if (!pendingDeleteColor) return
          remove.mutate(pendingDeleteColor.id)
        }}
      />
    </div>
  )
}

/* ─── Cost center / cost configs ─────────────────────────── */
function CostCenterTab() {
  const queryClient = useQueryClient()
  const { data: configs = [] } = useQuery({ queryKey: ['cost-configs'], queryFn: () => costConfigService.findAll() })
  const { data: equipmentRes } = useQuery({
    queryKey: ['equipment', 'all', 'settings'],
    queryFn: () => equipmentService.findAll({ page: 1, limit: 200 }),
  })
  const equipments = equipmentRes?.data ?? []

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [equipmentId, setEquipmentId] = useState('')
  const [electricityCostPerKwh, setElectricityCostPerKwh] = useState(0.8)
  const [laborCostPerHour, setLaborCostPerHour] = useState(0)
  const [laborMinutesPerJob, setLaborMinutesPerJob] = useState('')
  const [monthlyOverhead, setMonthlyOverhead] = useState(0)
  const [monthlyProductionHours, setMonthlyProductionHours] = useState('')
  const [failureRateMode, setFailureRateMode] = useState<CostConfig['failureRateMode']>('HYBRID')
  const [failureRatePercent, setFailureRatePercent] = useState(5)
  const [failureAutoWindowDays, setFailureAutoWindowDays] = useState('')
  const [failureAutoMinSamples, setFailureAutoMinSamples] = useState('')
  const [notes, setNotes] = useState('')
  const [pendingToggleConfig, setPendingToggleConfig] = useState<CostConfig | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CostConfig | null>(null)

  const getApiMessage = (err: unknown, fallback: string) => {
    const message = (err as { response?: { data?: { message?: string | string[] } } })
      ?.response?.data?.message

    if (Array.isArray(message)) return message[0] ?? fallback
    return message ?? fallback
  }

  const parseOptionalNumber = (value: string) => {
    const normalized = value.trim().replace(',', '.')
    if (!normalized) return undefined
    const numeric = Number(normalized)
    return Number.isFinite(numeric) ? numeric : undefined
  }

  const parseOptionalInt = (value: string) => {
    const numeric = parseOptionalNumber(value)
    if (numeric === undefined) return undefined
    return Math.trunc(numeric)
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setIsDefault(false)
    setEquipmentId('')
    setElectricityCostPerKwh(0.8)
    setLaborCostPerHour(0)
    setLaborMinutesPerJob('')
    setMonthlyOverhead(0)
    setMonthlyProductionHours('')
    setFailureRateMode('HYBRID')
    setFailureRatePercent(5)
    setFailureAutoWindowDays('')
    setFailureAutoMinSamples('')
    setNotes('')
  }

  const startEdit = (config: CostConfig) => {
    setEditingId(config.id)
    setName(config.name)
    setIsDefault(config.isDefault)
    setEquipmentId(config.equipmentId ?? '')
    setElectricityCostPerKwh(Number(config.electricityCostPerKwh) || 0)
    setLaborCostPerHour(Number(config.laborCostPerHour) || 0)
    setLaborMinutesPerJob(config.laborMinutesPerJob != null ? String(config.laborMinutesPerJob) : '')
    setMonthlyOverhead(Number(config.monthlyOverhead) || 0)
    setMonthlyProductionHours(config.monthlyProductionHours != null ? String(config.monthlyProductionHours) : '')
    setFailureRateMode(config.failureRateMode)
    setFailureRatePercent(Number(config.failureRatePercent) || 0)
    setFailureAutoWindowDays(config.failureAutoWindowDays != null ? String(config.failureAutoWindowDays) : '')
    setFailureAutoMinSamples(config.failureAutoMinSamples != null ? String(config.failureAutoMinSamples) : '')
    setNotes(config.notes ?? '')
  }

  const buildPayload = () => {
    const payload: {
      name: string
      isDefault?: boolean
      equipmentId?: string
      electricityCostPerKwh: number
      laborCostPerHour?: number
      laborMinutesPerJob?: number
      monthlyOverhead?: number
      monthlyProductionHours?: number
      failureRateMode?: CostConfig['failureRateMode']
      failureRatePercent?: number
      failureAutoWindowDays?: number
      failureAutoMinSamples?: number
      notes?: string
    } = {
      name: name.trim(),
      isDefault,
      equipmentId: equipmentId || undefined,
      electricityCostPerKwh: Math.max(0, electricityCostPerKwh || 0),
      laborCostPerHour: Math.max(0, laborCostPerHour || 0),
      monthlyOverhead: Math.max(0, monthlyOverhead || 0),
      failureRateMode,
      failureRatePercent: Number(failureRatePercent) || 0,
      notes: notes.trim() || undefined,
    }

    const nextLaborMinutes = parseOptionalInt(laborMinutesPerJob)
    if (nextLaborMinutes !== undefined) payload.laborMinutesPerJob = Math.max(nextLaborMinutes, 0)


    const nextMonthlyHours = parseOptionalInt(monthlyProductionHours)
    if (nextMonthlyHours !== undefined) payload.monthlyProductionHours = Math.max(nextMonthlyHours, 1)

    if (failureRateMode !== 'MANUAL') {
      const nextAutoWindow = parseOptionalInt(failureAutoWindowDays)
      if (nextAutoWindow !== undefined) payload.failureAutoWindowDays = Math.max(nextAutoWindow, 7)

      const nextAutoMin = parseOptionalInt(failureAutoMinSamples)
      if (nextAutoMin !== undefined) payload.failureAutoMinSamples = Math.max(nextAutoMin, 1)
    }

    return payload
  }

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      payload.id
        ? costConfigService.update(payload.id, payload.data)
        : costConfigService.create(payload.data),
    onSuccess: (_, payload) => {
      toast.success(payload.id ? 'Centro de custo atualizado' : 'Centro de custo criado')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['cost-configs'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar centro de custo')),
  })

  const setDefault = useMutation({
    mutationFn: (config: CostConfig) => costConfigService.update(config.id, { isDefault: true, isActive: true }),
    onSuccess: () => {
      toast.success('Centro de custo padrão atualizado')
      queryClient.invalidateQueries({ queryKey: ['cost-configs'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao definir padrão')),
  })

  const toggleActive = useMutation({
    mutationFn: (config: CostConfig) => costConfigService.update(config.id, { isActive: !config.isActive }),
    onSuccess: (_, config) => {
      toast.success(config.isActive ? 'Centro de custo desativado' : 'Centro de custo ativado')
      setPendingToggleConfig(null)
      queryClient.invalidateQueries({ queryKey: ['cost-configs'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => costConfigService.remove(id),
    onSuccess: () => {
      toast.success('Centro de custo removido')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['cost-configs'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover centro de custo')),
  })

  const canSubmit = !!name.trim() && failureRatePercent >= 0 && failureRatePercent <= 100

  const submit = () => {
    if (!canSubmit) return
    save.mutate({ id: editingId ?? undefined, data: buildPayload() })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Centros de custo</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>
            Perfis de custo usados na calculadora e na produção.
          </div>
        </div>

        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
              <th className="px-4 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Nome</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Equipamento</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Energia</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Mão de obra</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Falhas</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Status</th>
              <th className="px-4 py-2 text-right font-medium" style={{ color: NEX.textDim }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {configs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>
                  Nenhum centro de custo cadastrado.
                </td>
              </tr>
            )}

            {configs.map((config: CostConfig) => (
              <tr key={config.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3">
                  <div className="inline-flex items-center gap-2">
                    <span className="font-medium">{config.name}</span>
                    {config.isDefault && <Pill tone="cyan">Padrão</Pill>}
                  </div>
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {config.equipment?.name ?? '—'}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  <Money value={Number(config.electricityCostPerKwh)} />/kWh
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {config.laborCostPerHour != null ? <Money value={Number(config.laborCostPerHour)} /> : '—'}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {config.failureRateMode} · {Number(config.failureRatePercent).toFixed(2)}%
                </td>
                <td className="px-2">
                  <Pill tone={config.isActive ? 'green' : 'default'}>{config.isActive ? 'Ativo' : 'Inativo'}</Pill>
                </td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-3">
                    <button onClick={() => startEdit(config)} className="text-[11px]" style={{ color: NEX.cyan }}>Alterar</button>
                    {!config.isDefault && (
                      <button onClick={() => setDefault.mutate(config)} className="text-[11px]" style={{ color: NEX.cyan }}>
                        Definir padrão
                      </button>
                    )}
                    <button
                      onClick={() => setPendingToggleConfig(config)}
                      className="text-[11px]"
                      disabled={config.isDefault}
                      style={{ color: config.isDefault ? NEX.textMute : NEX.amber }}
                    >
                      {config.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => setPendingDelete(config)}
                      className="text-[11px]"
                      disabled={config.isDefault}
                      style={{ color: config.isDefault ? NEX.textMute : NEX.red }}
                    >
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
        <div className="text-[13px] font-semibold mb-3">{editingId ? 'Alterar centro de custo' : 'Novo centro de custo'}</div>
        <div className="space-y-3">
          <Field label="Nome *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: Padrão Fábrica" />
          </Field>

          <label className="flex items-center gap-2 text-[12px]" style={{ color: NEX.textDim }}>
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Definir como centro de custo padrão
          </label>

          <Field label="Equipamento (opcional)">
            <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} className={inputCls}>
              <option value="">Sem vínculo (genérico)</option>
              {equipments.map((equipment) => (
                <option key={equipment.id} value={equipment.id}>{equipment.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Energia (R$/kWh) *">
              <DecimalRtlInput value={electricityCostPerKwh} onValueChange={setElectricityCostPerKwh} className={inputCls + ' text-right tabular-nums'} />
            </Field>
            <Field label="Falha manual (%) *">
              <DecimalRtlInput value={failureRatePercent} onValueChange={setFailureRatePercent} max={100} suffix="%" className={inputCls + ' text-right tabular-nums'} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Mão de obra (R$/h)">
              <DecimalRtlInput value={laborCostPerHour} onValueChange={setLaborCostPerHour} className={inputCls + ' text-right tabular-nums'} />
            </Field>
            <Field label="Minutos de MO por job">
              <input
                type="number"
                min={0}
                step="1"
                value={laborMinutesPerJob}
                onChange={(e) => setLaborMinutesPerJob(e.target.value)}
                className={inputCls + ' text-right tabular-nums'}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Overhead mensal (R$)">
              <DecimalRtlInput value={monthlyOverhead} onValueChange={setMonthlyOverhead} className={inputCls + ' text-right tabular-nums'} />
            </Field>
            <Field label="Horas produção/mês">
              <input
                type="number"
                min={1}
                step="1"
                value={monthlyProductionHours}
                onChange={(e) => setMonthlyProductionHours(e.target.value)}
                className={inputCls + ' text-right tabular-nums'}
              />
            </Field>
          </div>

          <Field label="Modo de falha">
            <select
              value={failureRateMode}
              onChange={(e) => setFailureRateMode(e.target.value as CostConfig['failureRateMode'])}
              className={inputCls}
            >
              <option value="MANUAL">MANUAL</option>
              <option value="AUTO">AUTO</option>
              <option value="HYBRID">HYBRID</option>
            </select>
          </Field>

          {failureRateMode !== 'MANUAL' && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Janela AUTO (dias)">
                <input
                  type="number"
                  min={7}
                  step="1"
                  value={failureAutoWindowDays}
                  onChange={(e) => setFailureAutoWindowDays(e.target.value)}
                  className={inputCls + ' text-right tabular-nums'}
                />
              </Field>
              <Field label="Amostras mínimas AUTO">
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={failureAutoMinSamples}
                  onChange={(e) => setFailureAutoMinSamples(e.target.value)}
                  className={inputCls + ' text-right tabular-nums'}
                />
              </Field>
            </div>
          )}

          <Field label="Observações">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[78px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y"
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
              onClick={submit}
            >
              {editingId ? 'Salvar alterações' : 'Criar centro de custo'}
            </Btn>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingToggleConfig}
        onOpenChange={(open) => {
          if (!open) setPendingToggleConfig(null)
        }}
        title={pendingToggleConfig?.isActive ? 'Desativar centro de custo?' : 'Ativar centro de custo?'}
        description={pendingToggleConfig
          ? (pendingToggleConfig.isActive
            ? `Esta ação desativará o centro de custo "${pendingToggleConfig.name}" nas seleções ativas da calculadora.`
            : `Esta ação ativará o centro de custo "${pendingToggleConfig.name}" nas seleções ativas da calculadora.`)
          : 'Confirme a alteração de status do centro de custo selecionado.'}
        confirmLabel={pendingToggleConfig?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggleConfig?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => {
          if (!pendingToggleConfig) return
          toggleActive.mutate(pendingToggleConfig)
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Excluir centro de custo?"
        description={pendingDelete
          ? `Esta ação removerá permanentemente o centro de custo "${pendingDelete.name}".`
          : 'Esta ação removerá permanentemente o centro de custo selecionado.'}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate(pendingDelete.id)
        }}
      />
    </div>
  )
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
