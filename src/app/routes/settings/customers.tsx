import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { customersService } from '@/services/entities.service'
import type { Customer } from '@/types/api.types'
import { Field, inputCls, getApiMessage } from './_shared'

function digitsOnly(v: string) { return v.replace(/\D/g, '') }
function formatCpf(v: string) {
  const d = digitsOnly(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
function formatCnpj(v: string) {
  const d = digitsOnly(v).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}
function formatPhone(v: string) {
  const d = digitsOnly(v).slice(0, 11)
  if (d.length <= 2) return d.length === 0 ? '' : `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
function formatZip(v: string) { const d = digitsOnly(v).slice(0, 8); return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}` }

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: NEX.textMute }}>{label}</div>
      {children}
    </div>
  )
}

export function CustomersPage() {
  const queryClient = useQueryClient()
  const { data: res } = useQuery({ queryKey: ['customers', 'list'], queryFn: () => customersService.findAll({ limit: 200 }) })
  const list: Customer[] = res?.data ?? []

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingToggle, setPendingToggle] = useState<Customer | null>(null)

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
  const [stateUF, setStateUF] = useState('')
  const [ibgeCode, setIbgeCode] = useState('')
  const [inscricaoEstadual, setInscricaoEstadual] = useState('')
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => c.name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.city ?? '').toLowerCase().includes(q))
  }, [list, search])

  const resetForm = () => {
    setEditingId(null); setType('PF'); setName(''); setRazaoSocial(''); setDocumentDigits('')
    setEmail(''); setPhoneDigits(''); setZipCodeDigits(''); setStreet(''); setAddressNumber('')
    setComplement(''); setNeighborhood(''); setCity(''); setStateUF(''); setIbgeCode('')
    setInscricaoEstadual(''); setInscricaoMunicipal('')
  }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (c: Customer) => {
    const t = c.type ?? (c.cnpj ? 'PJ' : 'PF')
    setEditingId(c.id); setType(t); setName(c.name ?? ''); setRazaoSocial(c.razaoSocial ?? '')
    setDocumentDigits(digitsOnly(t === 'PJ' ? (c.cnpj ?? '') : (c.cpf ?? '')).slice(0, t === 'PJ' ? 14 : 11))
    setEmail(c.email ?? ''); setPhoneDigits(digitsOnly(c.phone ?? '').slice(0, 11))
    setZipCodeDigits(digitsOnly(c.zipCode ?? '').slice(0, 8)); setStreet(c.street ?? '')
    setAddressNumber(c.addressNumber ?? ''); setComplement(c.complement ?? '')
    setNeighborhood(c.neighborhood ?? ''); setCity(c.city ?? '')
    setStateUF((c.state ?? '').toUpperCase().slice(0, 2))
    setIbgeCode(digitsOnly(c.ibgeCode ?? '').slice(0, 7))
    setInscricaoEstadual(c.inscricaoEstadual ?? ''); setInscricaoMunicipal(c.inscricaoMunicipal ?? '')
    setDrawerOpen(true)
  }

  const documentLimit = type === 'PF' ? 11 : 14
  const hasRequiredAddress = !!(street.trim() && addressNumber.trim() && neighborhood.trim() && city.trim() && stateUF.trim().length === 2 && zipCodeDigits.length === 8)
  const hasRequiredIdentity = type === 'PF' ? documentDigits.length === 11 : documentDigits.length === 14 && !!razaoSocial.trim()
  const canSubmit = !!name.trim() && hasRequiredIdentity && hasRequiredAddress

  const buildPayload = () => ({
    type, name: name.trim(),
    razaoSocial: type === 'PJ' ? razaoSocial.trim() || undefined : undefined,
    email: email.trim() || undefined, phone: phoneDigits || undefined,
    cpf: type === 'PF' ? documentDigits : undefined,
    cnpj: type === 'PJ' ? documentDigits : undefined,
    street: street.trim(), addressNumber: addressNumber.trim(),
    complement: complement.trim() || undefined, neighborhood: neighborhood.trim(),
    city: city.trim(), state: stateUF.trim().toUpperCase(), zipCode: zipCodeDigits,
    ibgeCode: ibgeCode || undefined,
    inscricaoEstadual: type === 'PJ' ? inscricaoEstadual.trim() || undefined : undefined,
    inscricaoMunicipal: type === 'PJ' ? inscricaoMunicipal.trim() || undefined : undefined,
  })

  const save = useMutation({
    mutationFn: (p: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      p.id ? customersService.update(p.id, p.data) : customersService.create(p.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Cliente atualizado' : 'Cliente criado')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar cliente')),
  })

  const toggleActive = useMutation({
    mutationFn: (c: Customer) => customersService.update(c.id, { isActive: !c.isActive }),
    onSuccess: (_, c) => {
      toast.success(c.isActive ? 'Cliente desativado' : 'Cliente ativado')
      setPendingToggle(null)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status')),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." className="bg-transparent flex-1 text-[12.5px] focus:outline-none" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>{filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Novo cliente</Btn>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Cliente', 'Tipo', 'Documento', 'Cidade / UF', 'Telefone', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7}>
                <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                  <Icon d={Icons.user} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p className="text-[13px]">{search ? `Nenhum resultado para "${search}"` : 'Nenhum cliente cadastrado.'}</p>
                  {!search && <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>Adicionar primeiro cliente</Btn>}
                </div>
              </td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="group" style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: NEX.text }}>{c.name}</div>
                  {c.email && <div className="text-[11px]" style={{ color: NEX.textDim }}>{c.email}</div>}
                </td>
                <td className="px-2"><Pill tone="default">{c.type}</Pill></td>
                <td className="px-2 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>
                  {c.type === 'PJ' ? (c.cnpj ? formatCnpj(c.cnpj) : '—') : (c.cpf ? formatCpf(c.cpf) : '—')}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{c.city && c.state ? `${c.city}/${c.state}` : '—'}</td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{c.phone ? formatPhone(c.phone) : '—'}</td>
                <td className="px-2"><Pill tone={c.isActive ? 'green' : 'default'}>{c.isActive ? 'Ativo' : 'Inativo'}</Pill></td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(c)}><Icon d={Icons.edit} size={12} /></ActionBtn>
                    <ActionBtn color={NEX.amber} title={c.isActive ? 'Desativar' : 'Ativar'} onClick={() => setPendingToggle(c)}><Icon d={c.isActive ? Icons.x : Icons.check} size={12} /></ActionBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Editar cliente' : 'Novo cliente'} width={500}>
        <div className="space-y-5">
          {/* Tipo PF / PJ */}
          <div className="grid grid-cols-2 gap-2">
            {(['PF', 'PJ'] as const).map((t) => (
              <button key={t} type="button" className="h-9 rounded text-[12px] font-medium"
                style={{ background: type === t ? NEX.cyanDim : NEX.surface2, color: type === t ? NEX.cyan : NEX.textDim, border: `1px solid ${NEX.border}` }}
                onClick={() => { setType(t); setDocumentDigits((prev) => prev.slice(0, t === 'PF' ? 11 : 14)); if (t === 'PF') { setRazaoSocial(''); setInscricaoEstadual(''); setInscricaoMunicipal('') } }}>
                {t === 'PF' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}
              </button>
            ))}
          </div>

          <Section label="Identificação">
            <Field label={type === 'PJ' ? 'Nome fantasia *' : 'Nome completo *'}><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus /></Field>
            {type === 'PJ' && <Field label="Razão social *"><input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} className={inputCls} /></Field>}
            <Field label={type === 'PJ' ? 'CNPJ *' : 'CPF *'}>
              <input value={type === 'PJ' ? formatCnpj(documentDigits) : formatCpf(documentDigits)} onChange={(e) => setDocumentDigits(digitsOnly(e.target.value).slice(0, documentLimit))} inputMode="numeric" className={inputCls} />
            </Field>
            {type === 'PJ' && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Inscrição estadual"><input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} className={inputCls} /></Field>
                <Field label="Inscrição municipal"><input value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} className={inputCls} /></Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Telefone"><input value={formatPhone(phoneDigits)} onChange={(e) => setPhoneDigits(digitsOnly(e.target.value).slice(0, 11))} inputMode="numeric" className={inputCls} /></Field>
              <Field label="E-mail"><input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
            </div>
          </Section>

          <Section label="Endereço">
            <Field label="CEP *"><input value={formatZip(zipCodeDigits)} onChange={(e) => setZipCodeDigits(digitsOnly(e.target.value).slice(0, 8))} inputMode="numeric" className={inputCls} /></Field>
            <Field label="Logradouro *"><input value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Número *"><input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className={inputCls} /></Field>
              <Field label="Complemento"><input value={complement} onChange={(e) => setComplement(e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label="Bairro *"><input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputCls} /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Cidade *"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
              <Field label="UF *"><input value={stateUF} onChange={(e) => setStateUF(e.target.value.toUpperCase().slice(0, 2))} className={inputCls + ' uppercase'} /></Field>
              <Field label="Cód. IBGE"><input value={ibgeCode} onChange={(e) => setIbgeCode(digitsOnly(e.target.value).slice(0, 7))} inputMode="numeric" className={inputCls} /></Field>
            </div>
          </Section>

          <div className="flex flex-col gap-2 pt-1">
            <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className="w-full justify-center" disabled={!canSubmit || save.isPending}
              onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}>
              {editingId ? 'Salvar alterações' : 'Criar cliente'}
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>Cancelar</Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!pendingToggle} onOpenChange={(o) => { if (!o) setPendingToggle(null) }}
        title={pendingToggle?.isActive ? 'Desativar cliente?' : 'Ativar cliente?'}
        description={pendingToggle ? (pendingToggle.isActive ? `Desativará "${pendingToggle.name}".` : `Ativará "${pendingToggle.name}".`) : ''}
        confirmLabel={pendingToggle?.isActive ? 'Desativar' : 'Ativar'} variant={pendingToggle?.isActive ? 'danger' : 'default'} loading={toggleActive.isPending}
        onConfirm={() => { if (pendingToggle) toggleActive.mutate(pendingToggle) }} />
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
