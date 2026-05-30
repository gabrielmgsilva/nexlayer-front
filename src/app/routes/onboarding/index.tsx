import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Btn, Pill, Icon, Icons, NEX, nexAlpha } from '@/lib/nex'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { authService, type SetupStatus } from '@/services/auth.service'
import { equipmentService, materialsService, costConfigService } from '@/services/entities.service'

type StepId = 'welcome' | 'equipment' | 'material' | 'cost' | 'done'

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'welcome',   label: 'Boas-vindas' },
  { id: 'equipment', label: 'Impressora' },
  { id: 'material',  label: 'Filamento' },
  { id: 'cost',      label: 'Custos' },
  { id: 'done',      label: 'Pronto' },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState<StepId>('welcome')

  const { data: status, isLoading } = useQuery({
    queryKey: ['auth', 'setup-status'],
    queryFn: () => authService.getSetupStatus(),
  })

  const completeMutation = useMutation({
    mutationFn: () => authService.completeOnboarding(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'setup-status'] })
      toast.success('Setup concluído! Bem-vindo(a).')
      navigate('/', { replace: true })
    },
    onError: () => toast.error('Falha ao finalizar setup'),
  })

  const stepIdx = STEPS.findIndex((s) => s.id === step)

  const goNext = () => {
    const nextIdx = Math.min(STEPS.length - 1, stepIdx + 1)
    setStep(STEPS[nextIdx].id)
    qc.invalidateQueries({ queryKey: ['auth', 'setup-status'] })
  }
  const goBack = () => {
    const prevIdx = Math.max(0, stepIdx - 1)
    setStep(STEPS[prevIdx].id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NEX.bg, color: NEX.text }}>
        Carregando...
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: NEX.bg, color: NEX.text }}>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: NEX.cyan }}>NEXLAYER · Setup inicial</div>
            <h1 className="text-2xl font-bold mt-1">Vamos configurar sua produção</h1>
          </div>
          <Btn size="sm" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
            Pular tudo
          </Btn>
        </div>

        {/* Stepper */}
        <Card>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const active = i === stepIdx
              const done = i < stepIdx
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                    style={{
                      background: done ? NEX.green : active ? NEX.cyan : NEX.surface2,
                      color: done || active ? 'var(--nex-on-primary)' : NEX.textDim,
                      border: `1px solid ${done ? NEX.green : active ? NEX.cyan : NEX.border}`,
                    }}
                  >
                    {done ? <Icon d={Icons.check} size={14} /> : i + 1}
                  </div>
                  <div className="text-[11.5px] font-medium hidden md:block" style={{ color: active ? NEX.text : NEX.textMute }}>
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="h-px flex-1" style={{ background: done ? NEX.green : NEX.border }} />
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Step content */}
        {step === 'welcome' && <WelcomeStep onNext={goNext} status={status} />}
        {step === 'equipment' && <EquipmentStep onBack={goBack} onNext={goNext} hasEquipment={status?.hasEquipment ?? false} />}
        {step === 'material' && <MaterialStep onBack={goBack} onNext={goNext} hasMaterial={status?.hasMaterial ?? false} />}
        {step === 'cost' && <CostStep onBack={goBack} onNext={goNext} hasCostConfig={status?.hasCostConfig ?? false} />}
        {step === 'done' && (
          <Card>
            <div className="text-center py-6 space-y-4">
              <div className="text-4xl">🚀</div>
              <h2 className="text-xl font-bold">Tudo pronto!</h2>
              <div className="text-[13px]" style={{ color: NEX.textDim }}>
                Você pode adicionar produtos e iniciar sua primeira produção quando quiser.
              </div>
              <Btn kind="primary" size="lg"
                   onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                Entrar no NEXLAYER
              </Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Welcome
// ─────────────────────────────────────────
function WelcomeStep({ onNext, status }: { onNext: () => void; status: SetupStatus | undefined }) {
  const items = [
    { label: 'Cadastrar primeira impressora', done: status?.hasEquipment ?? false },
    { label: 'Cadastrar filamento + bobina',  done: (status?.hasMaterial ?? false) && (status?.hasMaterialStock ?? false) },
    { label: 'Definir custos operacionais',   done: status?.hasCostConfig ?? false },
    { label: 'Cadastrar primeiro produto',    done: status?.hasProduct ?? false },
  ]
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold mb-1">Bem-vindo(a) ao NEXLAYER</h2>
          <p className="text-[13px]" style={{ color: NEX.textDim }}>
            Em ~3 minutos você terá tudo configurado para começar a calcular custos reais e
            controlar sua produção. Vamos cadastrar:
          </p>
        </div>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.label} className="flex items-center gap-3 p-2.5 rounded-md"
                 style={{ background: NEX.surface2, border: `1px solid ${NEX.border}` }}>
              <div className="h-6 w-6 rounded-full flex items-center justify-center"
                   style={{
                     background: it.done ? nexAlpha('green', 0.2) : nexAlpha('textDim', 0.1),
                     color: it.done ? NEX.green : NEX.textMute,
                   }}>
                <Icon d={it.done ? Icons.check : Icons.plus} size={13} />
              </div>
              <span className="text-[12.5px]" style={{ color: it.done ? NEX.textDim : NEX.text }}>
                {it.label} {it.done && <Pill tone="green" className="ml-1">feito</Pill>}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <Btn kind="primary" size="lg" onClick={onNext}>Começar →</Btn>
        </div>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────
// Equipment
// ─────────────────────────────────────────
function EquipmentStep({ onBack, onNext, hasEquipment }: { onBack: () => void; onNext: () => void; hasEquipment: boolean }) {
  const [name, setName] = useState('Minha impressora')
  const [model, setModel] = useState('')
  const [purchasePrice, setPurchasePrice] = useState(3000)
  const [lifespan, setLifespan] = useState('6000')
  const [ratedPower, setRatedPower] = useState('350')
  const [avgPower, setAvgPower] = useState('120')
  const [annualMaintenance, setAnnualMaintenance] = useState(300)
  const [annualUsage, setAnnualUsage] = useState('1500')

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const m = useMutation({
    mutationFn: () => equipmentService.create({
      name, model: model || name, purchasePrice: Number(purchasePrice),
      purchaseDate: today,
      estimatedLifespanHours: Number(lifespan),
      ratedPowerWatts: Number(ratedPower),
      avgPowerWatts: Number(avgPower),
      annualMaintenanceCost: Number(annualMaintenance),
      annualUsageHours: Number(annualUsage),
    }),
    onSuccess: () => { toast.success('Impressora cadastrada'); onNext() },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Falha ao cadastrar'),
  })

  return (
    <StepCard
      title="Cadastre sua primeira impressora"
      subtitle="Esses dados são usados para calcular custo de depreciação, energia e manutenção por job."
    >
      {hasEquipment && (
        <Pill tone="green">Você já tem impressoras cadastradas — pode pular este passo</Pill>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Creality K1" />
        </Field>
        <Field label="Modelo">
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="K1 Max" />
        </Field>
        <Field label="Preço de compra (R$)">
          <DecimalInput value={purchasePrice} onValueChange={setPurchasePrice} min={0} />
        </Field>
        <Field label="Vida útil estimada (horas)">
          <Input type="number" value={lifespan} onChange={(e) => setLifespan(e.target.value)} />
        </Field>
        <Field label="Potência nominal (W)">
          <Input type="number" value={ratedPower} onChange={(e) => setRatedPower(e.target.value)} />
        </Field>
        <Field label="Potência média de impressão (W)">
          <Input type="number" value={avgPower} onChange={(e) => setAvgPower(e.target.value)} />
        </Field>
        <Field label="Manutenção anual (R$)">
          <DecimalInput value={annualMaintenance} onValueChange={setAnnualMaintenance} min={0} />
        </Field>
        <Field label="Horas de uso anuais">
          <Input type="number" value={annualUsage} onChange={(e) => setAnnualUsage(e.target.value)} />
        </Field>
      </div>
      <Footer
        onBack={onBack}
        onNext={() => m.mutate()}
        onSkip={onNext}
        nextLabel="Cadastrar e continuar"
        loading={m.isPending}
      />
    </StepCard>
  )
}

// ─────────────────────────────────────────
// Material + Stock
// ─────────────────────────────────────────
function MaterialStep({ onBack, onNext, hasMaterial }: { onBack: () => void; onNext: () => void; hasMaterial: boolean }) {
  const [diameter, setDiameter] = useState('1.75')
  const [spoolWeight, setSpoolWeight] = useState('1000')
  const [costPerKg, setCostPerKg] = useState(110)

  const m = useMutation({
    mutationFn: async () => {
      const mat = await materialsService.create({
        materialType: 'FILAMENT',
        diameterMm: Number(diameter),
        spoolWeightG: Number(spoolWeight),
      })
      await materialsService.addStock(mat.id, {
        initialWeightG: Number(spoolWeight),
        costPerKg: Number(costPerKg),
        purchaseDate: new Date().toISOString().slice(0, 10),
      })
    },
    onSuccess: () => { toast.success('Filamento + bobina cadastrados'); onNext() },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Falha ao cadastrar'),
  })

  return (
    <StepCard
      title="Cadastre seu primeiro filamento"
      subtitle="Vamos criar um filamento genérico e uma bobina inicial em estoque. Você pode refinar depois (cor, marca, tipo)."
    >
      {hasMaterial && (
        <Pill tone="green">Você já tem filamentos cadastrados — pode pular este passo</Pill>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Diâmetro (mm)">
          <Input type="number" step="0.05" value={diameter} onChange={(e) => setDiameter(e.target.value)} />
        </Field>
        <Field label="Peso da bobina (g)">
          <Input type="number" value={spoolWeight} onChange={(e) => setSpoolWeight(e.target.value)} />
        </Field>
        <Field label="Custo por kg (R$)">
          <DecimalInput value={costPerKg} onValueChange={setCostPerKg} min={0} />
        </Field>
      </div>
      <Footer
        onBack={onBack}
        onNext={() => m.mutate()}
        onSkip={onNext}
        nextLabel="Cadastrar e continuar"
        loading={m.isPending}
      />
    </StepCard>
  )
}

// ─────────────────────────────────────────
// Cost Config
// ─────────────────────────────────────────
function CostStep({ onBack, onNext, hasCostConfig }: { onBack: () => void; onNext: () => void; hasCostConfig: boolean }) {
  const [electricity, setElectricity] = useState(0.85)
  const [labor, setLabor] = useState(25)
  const [laborMin, setLaborMin] = useState('15')
  const [overhead, setOverhead] = useState(500)

  const m = useMutation({
    mutationFn: () => costConfigService.create({
      name: 'Padrão',
      isDefault: true,
      electricityCostPerKwh: Number(electricity),
      laborCostPerHour: Number(labor),
      monthlyOverhead: Number(overhead),
    }),
    onSuccess: () => { toast.success('Perfil de custos criado'); onNext() },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Falha ao salvar'),
  })

  return (
    <StepCard
      title="Defina seus custos operacionais"
      subtitle="Esses valores são aplicados na precificação. Você pode criar perfis adicionais depois."
    >
      {hasCostConfig && (
        <Pill tone="green">Você já tem um perfil de custos — pode pular este passo</Pill>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Energia (R$/kWh)">
          <DecimalInput value={electricity} onValueChange={setElectricity} min={0} />
        </Field>
        <Field label="Mão de obra (R$/hora)">
          <DecimalInput value={labor} onValueChange={setLabor} min={0} />
        </Field>
        <Field label="Tempo médio de mão de obra por job (min)">
          <Input type="number" value={laborMin} onChange={(e) => setLaborMin(e.target.value)} />
        </Field>
        <Field label="Overhead mensal (R$)">
          <DecimalInput value={overhead} onValueChange={setOverhead} min={0} />
        </Field>
      </div>
      <Footer
        onBack={onBack}
        onNext={() => m.mutate()}
        onSkip={onNext}
        nextLabel="Salvar e finalizar"
        loading={m.isPending}
      />
    </StepCard>
  )
}

// ─────────────────────────────────────────
// Shared UI bits
// ─────────────────────────────────────────
function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold mb-1">{title}</h2>
          <p className="text-[12.5px]" style={{ color: NEX.textDim }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: NEX.textMute }}>{label}</span>
      {children}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-9 px-3 rounded-md text-[13px] outline-none transition-colors focus:border-cyan-500"
      style={{
        background: NEX.surface2,
        color: NEX.text,
        border: `1px solid ${NEX.border}`,
        ...(props.style ?? {}),
      }}
    />
  )
}

function DecimalInput({ className, style, ...props }: React.ComponentProps<typeof DecimalRtlInput>) {
  return (
    <DecimalRtlInput
      {...props}
      className={`h-9 px-3 rounded-md text-[13px] outline-none transition-colors focus:border-cyan-500 text-right tabular-nums ${className ?? ''}`}
      style={{
        background: NEX.surface2,
        color: NEX.text,
        border: `1px solid ${NEX.border}`,
        ...(style ?? {}),
      }}
    />
  )
}

function Footer({
  onBack, onNext, onSkip, nextLabel, loading,
}: {
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  nextLabel: string
  loading: boolean
}) {
  return (
    <div className="flex items-center justify-between pt-3">
      <Btn onClick={onBack}>← Voltar</Btn>
      <div className="flex gap-2">
        <Btn onClick={onSkip}>Pular</Btn>
        <Btn kind="primary" onClick={onNext} disabled={loading}>{loading ? 'Salvando...' : nextLabel}</Btn>
      </div>
    </div>
  )
}
