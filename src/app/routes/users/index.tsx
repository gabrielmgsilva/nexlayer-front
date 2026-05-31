import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Btn, Icon, Icons, NEX } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DrawerPanel } from '@/components/ui/drawer'
import { usersService } from '@/services/entities.service'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/types/api.types'

type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER'

const ROLE_LABELS: Record<Role, string> = {
  ADMIN:    'Administrador',
  OPERATOR: 'Operador',
  VIEWER:   'Visualizador',
}

const ROLE_TONES: Record<Role, 'violet' | 'cyan' | 'default'> = {
  ADMIN:    'violet',
  OPERATOR: 'cyan',
  VIEWER:   'default',
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

/* ─── Drawer ──────────────────────────────────────────────── */
type DrawerMode = { type: 'create' } | { type: 'edit'; user: User }

function UserDrawer({ mode, onClose }: { mode: DrawerMode; onClose: () => void }) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const isEdit = mode.type === 'edit'
  const target = isEdit ? mode.user : null

  const [name, setName] = useState(target?.name ?? '')
  const [email, setEmail] = useState(target?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(target?.role ?? 'OPERATOR')

  const create = useMutation({
    mutationFn: () => usersService.create({ name: name.trim(), email: email.trim(), password, role }),
    onSuccess: () => {
      toast.success('Usuário criado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Falha ao criar usuário'))
    },
  })

  const update = useMutation({
    mutationFn: () => usersService.update(target!.id, {
      name: name.trim() || undefined,
      role,
      ...(password ? { password } : {}),
    }),
    onSuccess: () => {
      toast.success('Usuário atualizado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Falha ao atualizar usuário'))
    },
  })

  const isPending = create.isPending || update.isPending
  const canSubmit = isEdit
    ? !!name.trim()
    : !!name.trim() && !!email.trim() && password.length >= 8

  function submit() {
    if (!canSubmit) return
    isEdit ? update.mutate() : create.mutate()
  }

  return (
    <DrawerPanel open onClose={onClose} width={440}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center flex-shrink-0" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div>
            <div className="text-[15px] font-semibold">
              {isEdit ? 'Editar usuário' : 'Novo usuário'}
            </div>
            {isEdit && (
              <div className="text-[11px] mt-0.5" style={{ color: NEX.textMute }}>{target!.email}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-auto h-8 w-8 rounded-md flex items-center justify-center"
            style={{ color: NEX.textMute }}
            onMouseEnter={(e) => { e.currentTarget.style.background = NEX.surface2 }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Icon d={Icons.x} size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <Field label="Nome completo *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João Silva"
              className={inputCls}
              autoFocus
            />
          </Field>

          {!isEdit && (
            <Field label="E-mail *">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="usuario@empresa.com"
                className={inputCls}
              />
            </Field>
          )}

          <div>
            <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>Perfil de acesso *</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="h-9 rounded text-[12px] font-medium transition-all"
                  style={{
                    background: role === r ? NEX.cyanDim : NEX.surface2,
                    color: role === r ? NEX.cyan : NEX.textDim,
                    border: `1px solid ${role === r ? NEX.cyan : NEX.border}`,
                  }}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[11px] space-y-0.5" style={{ color: NEX.textMute }}>
              {role === 'ADMIN'    && <p>Acesso total — gerencia usuários, configurações e todos os módulos.</p>}
              {role === 'OPERATOR' && <p>Acesso operacional — gerencia vendas, produção e estoque.</p>}
              {role === 'VIEWER'   && <p>Somente leitura — visualiza dados sem poder editar.</p>}
            </div>
          </div>

          <Field label={isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha * (mín. 8 caracteres)'}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
              className={inputCls}
            />
          </Field>

          {isEdit && target?.id === currentUser?.id && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[11.5px]"
              style={{ background: '#1A1100', border: `1px solid ${NEX.amber}`, color: NEX.amber }}
            >
              <Icon d={Icons.alert} size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Você está editando sua própria conta. Alterações no perfil afetam o acesso imediatamente.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex gap-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${NEX.border}` }}
        >
          <Btn kind="ghost" size="md" className="flex-1 justify-center" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            kind="primary"
            size="md"
            icon={isEdit ? Icons.check : Icons.plus}
            className="flex-1 justify-center"
            disabled={!canSubmit || isPending}
            onClick={submit}
          >
            {isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </Btn>
        </div>
    </DrawerPanel>
  )
}

/* ─── Page ────────────────────────────────────────────────── */
export function UsersPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [drawer, setDrawer] = useState<DrawerMode | null>(null)
  const [pendingToggle, setPendingToggle] = useState<User | null>(null)

  const { data: res } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.findAll({ limit: 100 }),
  })
  const users: User[] = res?.data ?? []

  const toggleActive = useMutation({
    mutationFn: (user: User) => usersService.update(user.id, { isActive: !user.isActive }),
    onSuccess: (_, user) => {
      toast.success(user.isActive ? 'Usuário desativado' : 'Usuário ativado')
      setPendingToggle(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Falha ao alterar status'),
  })

  const active = users.filter((u) => u.isActive)
  const inactive = users.filter((u) => !u.isActive)

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold">Usuários</h1>
          <p className="text-[12px] mt-0.5" style={{ color: NEX.textMute }}>
            {active.length} ativo{active.length !== 1 ? 's' : ''}
            {inactive.length > 0 && ` · ${inactive.length} inativo${inactive.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Btn kind="primary" size="sm" icon={Icons.plus} onClick={() => setDrawer({ type: 'create' })}>
          Novo usuário
        </Btn>
      </div>

      {/* Table */}
      <Card padding={false}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${NEX.border}` }}>
              {['Usuário', 'Perfil', 'Status', 'Criado em', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: NEX.textMute }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[12px]" style={{ color: NEX.textMute }}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr
                key={u.id}
                style={{ borderTop: `1px solid ${NEX.border}` }}
                className="group"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #00D9FF, #B388FF)', color: '#07090C' }}
                    >
                      {u.name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-1.5">
                        {u.name}
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: NEX.cyanDim, color: NEX.cyan }}>você</span>
                        )}
                      </div>
                      <div className="text-[11px]" style={{ color: NEX.textMute }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={ROLE_TONES[u.role as Role] ?? 'default'}>
                    {ROLE_LABELS[u.role as Role] ?? u.role}
                  </Pill>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={u.isActive ? 'green' : 'default'}>
                    {u.isActive ? 'Ativo' : 'Inativo'}
                  </Pill>
                </td>
                <td className="px-4 py-3 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDrawer({ type: 'edit', user: u })}
                      className="text-[11px] font-medium"
                      style={{ color: NEX.cyan }}
                    >
                      Editar
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => setPendingToggle(u)}
                        className="text-[11px] font-medium"
                        style={{ color: u.isActive ? NEX.amber : NEX.green }}
                      >
                        {u.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Drawer */}
      {drawer && <UserDrawer mode={drawer} onClose={() => setDrawer(null)} />}

      {/* Confirm toggle */}
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(open) => { if (!open) setPendingToggle(null) }}
        title={pendingToggle?.isActive ? 'Desativar usuário?' : 'Ativar usuário?'}
        description={pendingToggle
          ? pendingToggle.isActive
            ? `"${pendingToggle.name}" perderá acesso ao sistema imediatamente.`
            : `"${pendingToggle.name}" poderá acessar o sistema novamente.`
          : ''}
        confirmLabel={pendingToggle?.isActive ? 'Desativar' : 'Ativar'}
        variant={pendingToggle?.isActive ? 'danger' : 'default'}
        loading={toggleActive.isPending}
        onConfirm={() => { if (pendingToggle) toggleActive.mutate(pendingToggle) }}
      />
    </div>
  )
}
