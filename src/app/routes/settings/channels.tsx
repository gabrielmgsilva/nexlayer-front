import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Btn, Icons, NEX, Money } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
    mutationFn: (channel: SalesChannel) =>
      salesChannelService.update(channel.id, { isActive: !channel.isActive }),
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
      data: { name: trimmedName, commissionPercent: Number(commission) || 0, feeFixed: Number(feeFixed) || 0 },
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
            {channels.length === 0 && (
              <tr><td className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>Nenhum canal cadastrado.</td></tr>
            )}
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
        onOpenChange={(open) => { if (!open) setPendingDeleteChannel(null) }}
        title="Excluir canal de venda?"
        description={pendingDeleteChannel
          ? `Esta ação removerá permanentemente o canal "${pendingDeleteChannel.name}".`
          : 'Esta ação removerá permanentemente o canal selecionado.'}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => { if (!pendingDeleteChannel) return; remove.mutate(pendingDeleteChannel.id) }}
      />

      <ConfirmDialog
        open={!!pendingToggleChannel}
        onOpenChange={(open) => { if (!open) setPendingToggleChannel(null) }}
        title={pendingToggleChannel?.isActive ? 'Desativar canal de venda?' : 'Ativar canal de venda?'}
        description={pendingToggleChannel
          ? (pendingToggleChannel.isActive
            ? `Esta ação desativará o canal "${pendingToggleChannel.name}" para novas vendas.`
            : `Esta ação ativará o canal "${pendingToggleChannel.name}" para novas vendas.`)
          : 'Confirme a alteração de status do canal selecionado.'}
        confirmLabel={pendingToggleChannel?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggleChannel?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => { if (!pendingToggleChannel) return; toggleActive.mutate(pendingToggleChannel) }}
      />
    </div>
  )
}
