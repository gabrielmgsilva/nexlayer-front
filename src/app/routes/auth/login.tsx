import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Btn, Icon, Icons, NEX } from '@/lib/nex'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'

const schema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      const res = await authService.login(data.email, data.password)
      setAuth(res.user, res.accessToken, res.refreshToken)
      navigate('/')
    } catch {
      toast.error('Credenciais inválidas. Verifique e-mail e senha.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: NEX.bg }}>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div
            className="h-12 w-12 rounded-md flex items-center justify-center mb-3"
            style={{ background: `linear-gradient(135deg, ${NEX.cyan}, ${NEX.violet})`, boxShadow: `0 0 24px -4px ${NEX.cyan}` }}
          >
            <Icon d={Icons.layers} size={22} style={{ color: '#000' }} />
          </div>
          <div className="text-[20px] font-bold tracking-tight">NEXLAYER</div>
          <div className="text-[11px]" style={{ color: NEX.textMute }}>Plataforma de manufatura aditiva</div>
        </div>

        <div className="rounded-xl p-6" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
          <div className="text-[14px] font-semibold mb-4">Entrar na conta</div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="E-mail" error={errors.email?.message}>
              <input
                type="email"
                placeholder="seu@email.com"
                className="w-full h-9 px-3 bg-transparent text-[13px] focus:outline-none"
                style={{ color: NEX.text }}
                {...register('email')}
              />
            </Field>
            <Field label="Senha" error={errors.password?.message}>
              <div className="flex items-center pr-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="flex-1 h-9 px-3 bg-transparent text-[13px] focus:outline-none"
                  style={{ color: NEX.text }}
                  {...register('password')}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[11px] px-2" style={{ color: NEX.textDim }} tabIndex={-1}>
                  {showPassword ? 'ocultar' : 'mostrar'}
                </button>
              </div>
            </Field>
            <Btn kind="primary" size="lg" type="submit" className="w-full justify-center" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Btn>
          </form>
        </div>

        <div className="mt-4 text-center text-[10.5px]" style={{ color: NEX.textMute }}>
          NEXLAYER v0.5.0 BETA · Cerberus Tecnologia
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>{label}</span>
      <div style={{ background: NEX.surface2, border: `1px solid ${error ? NEX.red : NEX.border}`, borderRadius: 6 }}>
        {children}
      </div>
      {error && <span className="text-[11px] mt-1 block" style={{ color: NEX.red }}>{error}</span>}
    </label>
  )
}
