import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Btn, Icons, NEX } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { customersService } from '@/services/entities.service'
import type { Customer } from '@/types/api.types'
import { Field, inputCls, getApiMessage } from './_shared'

function digitsOnly(value: string) { return value.replace(/\D/g, '') }

function formatCpf(value: string) {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatCnpj(value: string) {
  const d = digitsOnly(value).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function formatPhone(value: string) {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length <= 2) return d.length === 0 ? '' : `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function formatZipCode(value: string) {
  const d = digitsOnly(value).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function CustomersPage() {
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

  const resetForm = () => {
    setEditingId(null); setType('PF'); setName(''); setRazaoSocial(''); setDocumentDigits('')
    setEmail(''); setPhoneDigits(''); setZipCodeDigits(''); setStreet(''); setAddressNumber('')
    setComplement(''); setNeighborhood(''); setCity(''); setState(''); setIbgeCode('')
    setInscricaoEstadual(''); setInscricaoMunicipal('')
  }

  const startEdit = (customer: Customer) => {
    const nextType = customer.type ?? (customer.cnpj ? 'PJ' : 'PF')
    setEditingId(customer.id); setType(nextType); setName(customer.name ?? '')
    setRazaoSocial(customer.razaoSocial ?? '')
    setDocumentDigits(digitsOnly(nextType === 'PJ' ? (customer.cnpj ?? '') : (customer.cpf ?? '')).slice(0, nextType === 'PJ' ? 14 : 11))
    setEmail(customer.email ?? ''); setPhoneDigits(digitsOnly(customer.phone ?? '').slice(0, 11))
    setZipCodeDigits(digitsOnly(customer.zipCode ?? '').slice(0, 8)); setStreet(customer.street ?? '')
    setAddressNumber(customer.addressNumber ?? ''); setComplement(customer.complement ?? '')
    setNeighborhood(customer.neighborhood ?? ''); setCity(customer.city ?? '')
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
                  {c.type === 'PJ' ? (c.cnpj ? formatCnpj(c.cnpj) : '—') : (c.cpf ? formatCpf(c.cpf) : '—')}
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
            {(['PF', 'PJ'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className="h-9 rounded text-[12px] font-medium"
                style={{
                  background: type === t ? NEX.cyanDim : NEX.surface2,
                  color: type === t ? NEX.cyan : NEX.textDim,
                  border: `1px solid ${NEX.border}`,
                }}
                onClick={() => {
                  setType(t)
                  setDocumentDigits((prev) => prev.slice(0, t === 'PF' ? 11 : 14))
                  if (t === 'PF') { setRazaoSocial(''); setInscricaoEstadual(''); setInscricaoMunicipal('') }
                }}
              >
                {t === 'PF' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}
              </button>
            ))}
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

          <Field label="E-mail">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>

          <Field label="CEP *">
            <input
              value={formatZipCode(zipCodeDigits)}
              onChange={(e) => setZipCodeDigits(digitsOnly(e.target.value).slice(0, 8))}
              inputMode="numeric"
              className={inputCls}
            />
          </Field>

          <Field label="Logradouro *">
            <input value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Número *"><input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className={inputCls} /></Field>
            <Field label="Complemento"><input value={complement} onChange={(e) => setComplement(e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Bairro *">
            <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Cidade *"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
            <Field label="UF *">
              <input value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} className={inputCls + ' uppercase'} />
            </Field>
          </div>
          <Field label="Código IBGE (município)">
            <input value={ibgeCode} onChange={(e) => setIbgeCode(digitsOnly(e.target.value).slice(0, 7))} inputMode="numeric" className={inputCls} />
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
              onClick={() => { if (!canSubmit) return; save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}
            >
              {editingId ? 'Salvar alterações' : 'Criar cliente'}
            </Btn>
          </div>
        </div>
      </Card>

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
