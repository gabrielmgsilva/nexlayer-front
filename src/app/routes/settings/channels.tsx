import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pill, Btn, Icons, Icon, NEX, Money, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { salesChannelService } from '@/services/entities.service'
import type { SalesChannel } from '@/types/api.types'
import { Field, inputCls, getApiMessage } from './_shared'

export function ChannelsPage() {
  const queryClient = useQueryClient()
  const { data: channels = [] } = useQuery({
    queryKey: ['sales', 'channels', 'all'],
    queryFn: () => salesChannelService.findAll({ includeInactive: true }),
  })

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDeleteChannel, setPendingDeleteChannel] = useState<SalesChannel | null>(null)
  const [pendingToggleChannel, setPendingToggleChannel] = useState<SalesChannel | null>(null)

  const [name, setName] = useState('')
  const [commission, setCommission] = useState(0)
  const [feeFixed, setFeeFixed] = useState(0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return channels
    return channels.filter((c: SalesChannel) => c.name.toLowerCase().includes(q))
  }, [channels, search])

  const resetForm = () => { setEditingId(null); setName(''); setCommission(0); setFeeFixed(0) }

  const openCreate = () => { resetForm(); setDrawerOpen(true) }

  const openEdit = (c: SalesChannel) => {
    setEditingId(c.id)
    setName(c.name)
    setCommission(Number(c.commissionPercent) || 0)
    setFeeFixed(Number(c.feeFixed) || 0)
    setDrawerOpen(true)
  }

  const save = useMutation({
    mutationFn: (p: { id?: string; data: { name: string; commissionPercent: number; feeFixed: number } }) =>
      p.id ? salesChannelService.update(p.id, p.data) : salesChannelService.create(p.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Canal atualizado' : 'Canal criado')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['sales', 'channels'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar canal')),
  })

  const toggleActive = useMutation({
    mutationFn: (c: SalesChannel) => salesChannelService.update(c.id, { isActive: !c.isActive }),
    onSuccess: (_, c) => {
      toast.success(c.isActive ? 'Canal desativado' : 'Canal ativado')
      setPendingToggleChannel(null)
      queryClient.invalidateQueries({ queryKey: ['sales', 'channels'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao alterar status')),
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

  const canSubmit = !!name.trim()

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar canal..." className="bg-transparent flex-1 text-[12.5px] focus:outline-none" style={{ color: NEX.text }} />
          {search && <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}><Icon d={Icons.x} size={12} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px]" style={{ color: NEX.textMute }}>{filtered.length} {filtered.length === 1 ? 'canal' : 'canais'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openCreate}>Novo canal</Btn>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${NEX.border}`, background: NEX.surface }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Canal', 'Comissão', 'Taxa fixa', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: NEX.textMute }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5}>
                <div className="flex flex-col items-center justify-center py-14" style={{ color: NEX.textMute }}>
                  <Icon d={Icons.link} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p className="text-[13px]">{search ? `Nenhum resultado para "${search}"` : 'Nenhum canal cadastrado.'}</p>
                  {!search && <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openCreate}>Criar primeiro canal</Btn>}
                </div>
              </td></tr>
            )}
            {filtered.map((c: SalesChannel) => (
              <tr key={c.id} className="group" style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3 font-medium" style={{ color: NEX.text }}>{c.name}</td>
                <td className="px-2 text-[11.5px] font-mono" style={{ color: NEX.textDim }}>{Number(c.commissionPercent).toFixed(2)}%</td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}><Money value={Number(c.feeFixed ?? 0)} /></td>
                <td className="px-2"><Pill tone={c.isActive ? 'green' : 'default'}>{c.isActive ? 'Ativo' : 'Inativo'}</Pill></td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionBtn color={NEX.cyan} title="Editar" onClick={() => openEdit(c)}><Icon d={Icons.edit} size={12} /></ActionBtn>
                    <ActionBtn color={NEX.amber} title={c.isActive ? 'Desativar' : 'Ativar'} onClick={() => setPendingToggleChannel(c)}><Icon d={c.isActive ? Icons.x : Icons.check} size={12} /></ActionBtn>
                    <ActionBtn color={NEX.red} title="Excluir" onClick={() => setPendingDeleteChannel(c)}><Icon d={Icons.trash} size={12} /></ActionBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Editar canal' : 'Novo canal'}>
        <div className="space-y-4">
          <Field label="Nome *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Shopee, Loja Própria…" autoFocus />
          </Field>
          <Field label="Comissão (%)">
            <DecimalRtlInput value={commission} onValueChange={setCommission} max={100} suffix="%" className={inputCls + ' text-right tabular-nums'} />
          </Field>
          <Field label="Taxa fixa por venda (R$)">
            <DecimalRtlInput value={feeFixed} onValueChange={setFeeFixed} className={inputCls + ' text-right tabular-nums'} />
          </Field>
          <div className="flex flex-col gap-2 pt-2">
            <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className="w-full justify-center" disabled={!canSubmit || save.isPending}
              onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: { name: name.trim(), commissionPercent: commission, feeFixed } }) }}>
              {editingId ? 'Salvar alterações' : 'Criar canal'}
            </Btn>
            <Btn kind="ghost" size="md" className="w-full justify-center" onClick={() => setDrawerOpen(false)}>Cancelar</Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!pendingDeleteChannel} onOpenChange={(o) => { if (!o) setPendingDeleteChannel(null) }}
        title="Excluir canal?" description={pendingDeleteChannel ? `Esta ação removerá permanentemente o canal "${pendingDeleteChannel.name}".` : ''}
        confirmLabel="Excluir" variant="danger" loading={remove.isPending}
        onConfirm={() => { if (pendingDeleteChannel) remove.mutate(pendingDeleteChannel.id) }} />

      <ConfirmDialog open={!!pendingToggleChannel} onOpenChange={(o) => { if (!o) setPendingToggleChannel(null) }}
        title={pendingToggleChannel?.isActive ? 'Desativar canal?' : 'Ativar canal?'}
        description={pendingToggleChannel ? (pendingToggleChannel.isActive ? `Desativará "${pendingToggleChannel.name}" para novas vendas.` : `Ativará "${pendingToggleChannel.name}" para novas vendas.`) : ''}
        confirmLabel={pendingToggleChannel?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggleChannel?.isActive ? 'danger' : 'default'} loading={toggleActive.isPending}
        onConfirm={() => { if (pendingToggleChannel) toggleActive.mutate(pendingToggleChannel) }} />
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
