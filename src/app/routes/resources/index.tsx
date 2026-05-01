import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Bar, Icon, Icons, Money, NEX, EQUIPMENT_STATUS, Btn } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { equipmentService, materialsService, accessoriesService, domainService, suppliersService } from '@/services/entities.service'
import type { Equipment, Material, MaterialStock, Accessory, FilamentType, Brand, MaterialCategory, AccessoryCategory, Unit, Supplier } from '@/types/api.types'

type Tab = 'equipment' | 'materials' | 'accessories'
const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'equipment',   label: 'Equipamentos',  icon: Icons.printer },
  { id: 'materials',   label: 'Matéria-prima', icon: Icons.spool },
  { id: 'accessories', label: 'Acessórios',    icon: Icons.pkg },
]

type PurchaseModeOption = 'UNIT' | 'PACK' | 'BOX' | 'ROLL' | 'CUSTOM'
const ACCESSORY_PURCHASE_MODES: Array<{ value: PurchaseModeOption; label: string }> = [
  { value: 'UNIT', label: 'Unidade' },
  { value: 'PACK', label: 'Pacote' },
  { value: 'BOX', label: 'Caixa' },
  { value: 'ROLL', label: 'Rolo' },
  { value: 'CUSTOM', label: 'Personalizado' },
]

function isPurchaseModeOption(value: string): value is PurchaseModeOption {
  return ACCESSORY_PURCHASE_MODES.some((option) => option.value === value)
}

export function ResourcesPage() {
  const [tab, setTab] = useState<Tab>('equipment')
  return (
    <div className="px-8 py-6 space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-md w-fit" style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded text-[12px] font-medium flex items-center gap-1.5 transition-all"
            style={{
              background: tab === t.id ? NEX.cyanDim : 'transparent',
              color: tab === t.id ? NEX.cyan : NEX.textDim,
            }}
          >
            <Icon d={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'equipment'   && <EquipmentTab />}
      {tab === 'materials'   && <RawMaterialsTab />}
      {tab === 'accessories' && <AccessoriesTab />}
    </div>
  )
}

/* ─── Equipment ──────────────────────────────────────────── */
function EquipmentTab() {
  const queryClient = useQueryClient()
  const { data: res } = useQuery({
    queryKey: ['equipment', 'list', 'full'],
    queryFn: () => equipmentService.findAll({ limit: 100 }),
  })
  const list: Equipment[] = res?.data ?? []

  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Equipment | null>(null)

  const [name, setName] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [purchasePrice, setPurchasePrice] = useState(3000)
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [estimatedLifespanHours, setEstimatedLifespanHours] = useState('6000')
  const [ratedPowerWatts, setRatedPowerWatts] = useState('350')
  const [avgPowerWatts, setAvgPowerWatts] = useState('120')
  const [annualMaintenanceCost, setAnnualMaintenanceCost] = useState(300)
  const [annualUsageHours, setAnnualUsageHours] = useState('1500')
  const [buildVolumeX, setBuildVolumeX] = useState('')
  const [buildVolumeY, setBuildVolumeY] = useState('')
  const [buildVolumeZ, setBuildVolumeZ] = useState('')
  const [maxSpeedMmS, setMaxSpeedMmS] = useState('')
  const [status, setStatus] = useState<Equipment['status']>('AVAILABLE')
  const [notes, setNotes] = useState('')

  const getApiMessage = (err: unknown, fallback: string) => {
    const message = (err as { response?: { data?: { message?: string | string[] } } })
      ?.response?.data?.message

    if (Array.isArray(message)) return message[0] ?? fallback
    return message ?? fallback
  }

  const parseOptionalInt = (value: string) => {
    if (!value.trim()) return undefined
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return undefined
    return Math.trunc(parsed)
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setModel('')
    setSerialNumber('')
    setPurchasePrice(3000)
    setPurchaseDate(new Date().toISOString().slice(0, 10))
    setEstimatedLifespanHours('6000')
    setRatedPowerWatts('350')
    setAvgPowerWatts('120')
    setAnnualMaintenanceCost(300)
    setAnnualUsageHours('1500')
    setBuildVolumeX('')
    setBuildVolumeY('')
    setBuildVolumeZ('')
    setMaxSpeedMmS('')
    setStatus('AVAILABLE')
    setNotes('')
  }

  const startEdit = (equipment: Equipment) => {
    setEditingId(equipment.id)
    setName(equipment.name ?? '')
    setModel(equipment.model ?? '')
    setSerialNumber(equipment.serialNumber ?? '')
    setPurchasePrice(Number(equipment.purchasePrice) || 0)
    setPurchaseDate(equipment.purchaseDate ? equipment.purchaseDate.slice(0, 10) : new Date().toISOString().slice(0, 10))
    setEstimatedLifespanHours(String(Number(equipment.estimatedLifespanHours) || 6000))
    setRatedPowerWatts(String(Number(equipment.ratedPowerWatts) || 350))
    setAvgPowerWatts(String(Number(equipment.avgPowerWatts) || 120))
    setAnnualMaintenanceCost(Number(equipment.annualMaintenanceCost) || 0)
    setAnnualUsageHours(String(Number(equipment.annualUsageHours) || 1500))
    setBuildVolumeX(equipment.buildVolumeX != null ? String(equipment.buildVolumeX) : '')
    setBuildVolumeY(equipment.buildVolumeY != null ? String(equipment.buildVolumeY) : '')
    setBuildVolumeZ(equipment.buildVolumeZ != null ? String(equipment.buildVolumeZ) : '')
    setMaxSpeedMmS(equipment.maxSpeedMmS != null ? String(equipment.maxSpeedMmS) : '')
    setStatus(equipment.status)
    setNotes(equipment.notes ?? '')
  }

  const buildPayload = () => {
    const payload: {
      name: string
      model: string
      serialNumber?: string
      purchasePrice: number
      purchaseDate: string
      estimatedLifespanHours: number
      ratedPowerWatts: number
      avgPowerWatts: number
      buildVolumeX?: number
      buildVolumeY?: number
      buildVolumeZ?: number
      maxSpeedMmS?: number
      status: Equipment['status']
      annualMaintenanceCost: number
      annualUsageHours: number
      notes?: string
    } = {
      name: name.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim() || undefined,
      purchasePrice: Math.max(0, purchasePrice || 0),
      purchaseDate,
      estimatedLifespanHours: Math.max(1, Number(estimatedLifespanHours) || 1),
      ratedPowerWatts: Math.max(1, Number(ratedPowerWatts) || 1),
      avgPowerWatts: Math.max(1, Number(avgPowerWatts) || 1),
      status,
      annualMaintenanceCost: Math.max(0, annualMaintenanceCost || 0),
      annualUsageHours: Math.max(1, Number(annualUsageHours) || 1),
      notes: notes.trim() || undefined,
    }

    const nextBuildVolumeX = parseOptionalInt(buildVolumeX)
    const nextBuildVolumeY = parseOptionalInt(buildVolumeY)
    const nextBuildVolumeZ = parseOptionalInt(buildVolumeZ)
    const nextMaxSpeedMmS = parseOptionalInt(maxSpeedMmS)

    if (nextBuildVolumeX !== undefined) payload.buildVolumeX = Math.max(nextBuildVolumeX, 1)
    if (nextBuildVolumeY !== undefined) payload.buildVolumeY = Math.max(nextBuildVolumeY, 1)
    if (nextBuildVolumeZ !== undefined) payload.buildVolumeZ = Math.max(nextBuildVolumeZ, 1)
    if (nextMaxSpeedMmS !== undefined) payload.maxSpeedMmS = Math.max(nextMaxSpeedMmS, 1)

    return payload
  }

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      payload.id
        ? equipmentService.update(payload.id, payload.data)
        : equipmentService.create(payload.data),
    onSuccess: (_, payload) => {
      toast.success(payload.id ? 'Equipamento atualizado' : 'Equipamento criado')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar equipamento')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => equipmentService.remove(id),
    onSuccess: () => {
      toast.success('Equipamento removido')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover equipamento')),
  })

  const canSubmit = !!name.trim() && !!model.trim() && !!purchaseDate

  const submit = () => {
    if (!canSubmit) return
    save.mutate({ id: editingId ?? undefined, data: buildPayload() })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Equipamentos</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>
            Cadastro e gestão operacional das impressoras.
          </div>
        </div>

        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
              <th className="px-4 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Equipamento</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Status</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Vida útil</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Potência média</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Manutenção anual</th>
              <th className="px-4 py-2 text-right font-medium" style={{ color: NEX.textDim }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>
                  Nenhum equipamento cadastrado.
                </td>
              </tr>
            )}

            {list.map((equipment) => {
              const lifePct = (equipment.estimatedLifespanHours ?? 0) > 0
                ? Math.min(100, (Number(equipment.totalPrintHours) / Number(equipment.estimatedLifespanHours)) * 100)
                : 0
              const tone = lifePct >= 95 ? 'red' : lifePct >= 85 ? 'amber' : lifePct >= 70 ? 'cyan' : 'green'
              const statusInfo = EQUIPMENT_STATUS[equipment.status] ?? EQUIPMENT_STATUS.AVAILABLE

              return (
                <tr key={equipment.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{equipment.name}</div>
                    <div className="text-[11px]" style={{ color: NEX.textDim }}>
                      {equipment.brand?.name ?? '—'} · {equipment.model ?? 'sem modelo'}
                    </div>
                  </td>
                  <td className="px-2">
                    <Pill tone={statusInfo.tone} dot={equipment.status === 'PRINTING'}>{statusInfo.label}</Pill>
                  </td>
                  <td className="px-2">
                    <div className="w-28">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span style={{ color: NEX.textDim }}>{lifePct.toFixed(0)}%</span>
                      </div>
                      <Bar value={lifePct} tone={tone} height={3} />
                    </div>
                  </td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                    {Number(equipment.avgPowerWatts)}W
                  </td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                    <Money value={Number(equipment.annualMaintenanceCost)} />
                  </td>
                  <td className="px-4 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button onClick={() => startEdit(equipment)} className="text-[11px]" style={{ color: NEX.cyan }}>Alterar</button>
                      <button onClick={() => setPendingDelete(equipment)} className="text-[11px]" style={{ color: NEX.red }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="text-[13px] font-semibold mb-3">{editingId ? 'Alterar equipamento' : 'Novo equipamento'}</div>

        <div className="space-y-3">
          <ResourceField label="Nome *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={resourceInputCls} placeholder="Ex.: Creality K1" />
          </ResourceField>

          <ResourceField label="Modelo *">
            <input value={model} onChange={(e) => setModel(e.target.value)} className={resourceInputCls} placeholder="Ex.: K1 Max" />
          </ResourceField>

          <ResourceField label="Número de série">
            <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={resourceInputCls} />
          </ResourceField>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Compra (R$) *">
              <DecimalRtlInput value={purchasePrice} onValueChange={setPurchasePrice} min={0} className={resourceInputCls + ' tabular-nums'} />
            </ResourceField>
            <ResourceField label="Data da compra *">
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={resourceInputCls} />
            </ResourceField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Vida útil (h) *">
              <input type="number" min={1} step="1" value={estimatedLifespanHours} onChange={(e) => setEstimatedLifespanHours(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
            <ResourceField label="Uso anual (h) *">
              <input type="number" min={1} step="1" value={annualUsageHours} onChange={(e) => setAnnualUsageHours(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Potência nominal (W) *">
              <input type="number" min={1} step="1" value={ratedPowerWatts} onChange={(e) => setRatedPowerWatts(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
            <ResourceField label="Potência média (W) *">
              <input type="number" min={1} step="1" value={avgPowerWatts} onChange={(e) => setAvgPowerWatts(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Manutenção anual (R$) *">
              <DecimalRtlInput value={annualMaintenanceCost} onValueChange={setAnnualMaintenanceCost} min={0} className={resourceInputCls + ' tabular-nums'} />
            </ResourceField>
            <ResourceField label="Status *">
              <select value={status} onChange={(e) => setStatus(e.target.value as Equipment['status'])} className={resourceInputCls}>
                <option value="AVAILABLE">Disponível</option>
                <option value="PRINTING">Imprimindo</option>
                <option value="MAINTENANCE">Manutenção</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </ResourceField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Volume X (mm)">
              <input type="number" min={1} step="1" value={buildVolumeX} onChange={(e) => setBuildVolumeX(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
            <ResourceField label="Volume Y (mm)">
              <input type="number" min={1} step="1" value={buildVolumeY} onChange={(e) => setBuildVolumeY(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Volume Z (mm)">
              <input type="number" min={1} step="1" value={buildVolumeZ} onChange={(e) => setBuildVolumeZ(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
            <ResourceField label="Velocidade máx. (mm/s)">
              <input type="number" min={1} step="1" value={maxSpeedMmS} onChange={(e) => setMaxSpeedMmS(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
          </div>

          <ResourceField label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[68px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" />
          </ResourceField>

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
              {editingId ? 'Salvar alterações' : 'Criar equipamento'}
            </Btn>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Excluir equipamento?"
        description={pendingDelete
          ? `Esta ação removerá permanentemente o equipamento "${pendingDelete.name}".`
          : 'Esta ação removerá permanentemente o equipamento selecionado.'}
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

const resourceInputCls = 'w-full h-9 px-3 bg-transparent text-[13px] focus:outline-none'
function ResourceField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: NEX.textDim }}>{label}</span>
      <div style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, borderRadius: 6, color: NEX.text }}>
        {children}
      </div>
    </label>
  )
}

/* ─── Raw Materials ──────────────────────────────────────── */
function RawMaterialsTab() {
  const queryClient = useQueryClient()
  const { data: res } = useQuery({
    queryKey: ['materials', 'list', 'full'],
    queryFn: () => materialsService.findAll({ limit: 200 }),
  })
  const materials: Material[] = res?.data ?? []

  const [materialType, setMaterialType] = useState<MaterialCategory>('FILAMENT')

  const { data: materialTypesRes = [] } = useQuery({
    queryKey: ['domain', 'filament-types', materialType],
    queryFn: () => domainService.getFilamentTypes(materialType),
  })
  const materialTypes: FilamentType[] = materialTypesRes

  const { data: brandsRes = [] } = useQuery({
    queryKey: ['domain', 'brands'],
    queryFn: () => domainService.getBrands(),
  })
  const brands: Brand[] = brandsRes

  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Material | null>(null)

  const [filamentTypeId, setFilamentTypeId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [diameterMm, setDiameterMm] = useState('1.75')
  const [spoolWeightG, setSpoolWeightG] = useState('1000')
  const [densityKgM3, setDensityKgM3] = useState('1100')
  const [notes, setNotes] = useState('')

  const [stockMaterialId, setStockMaterialId] = useState<string | null>(null)
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [pendingCloseStock, setPendingCloseStock] = useState<MaterialStock | null>(null)

  const [lotNumber, setLotNumber] = useState('')
  const [initialWeightG, setInitialWeightG] = useState('1000')
  const [currentWeightG, setCurrentWeightG] = useState('1000')
  const [costPerKg, setCostPerKg] = useState(0)
  const [stockStatus, setStockStatus] = useState<MaterialStock['status']>('SEALED')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [openedDate, setOpenedDate] = useState('')

  useEffect(() => {
    if (!filamentTypeId) return
    const existsInCategory = materialTypes.some((item) => item.id === filamentTypeId)
    if (!existsInCategory) setFilamentTypeId('')
  }, [materialTypes, filamentTypeId])

  const getApiMessage = (err: unknown, fallback: string) => {
    const message = (err as { response?: { data?: { message?: string | string[] } } })
      ?.response?.data?.message

    if (Array.isArray(message)) return message[0] ?? fallback
    return message ?? fallback
  }

  const parseOptionalNumber = (value: string) => {
    if (!value.trim()) return undefined
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return undefined
    return parsed
  }

  const parseOptionalInt = (value: string) => {
    const parsed = parseOptionalNumber(value)
    if (parsed === undefined) return undefined
    return Math.trunc(parsed)
  }

  const selectedStockMaterial = materials.find((item) => item.id === stockMaterialId) ?? null
  const pendingCloseMaterial = pendingCloseStock
    ? (materials.find((item) => item.id === pendingCloseStock.materialId) ?? null)
    : null

  const getDefaultContainerWeight = (material?: Material | null) => {
    if (!material) return 1000
    if (material.materialType === 'FILAMENT') {
      return Math.max(1, Math.trunc(Number(material.spoolWeightG) || 1000))
    }
    return 1000
  }

  const resetStockForm = (material?: Material | null) => {
    const baseWeight = getDefaultContainerWeight(material)
    setEditingStockId(null)
    setLotNumber('')
    setInitialWeightG(String(baseWeight))
    setCurrentWeightG(String(baseWeight))
    setCostPerKg(0)
    setStockStatus('SEALED')
    setPurchaseDate(new Date().toISOString().slice(0, 10))
    setOpenedDate('')
  }

  const selectStockMaterial = (material: Material) => {
    setStockMaterialId(material.id)
    resetStockForm(material)
  }

  useEffect(() => {
    if (!stockMaterialId) return
    const exists = materials.some((item) => item.id === stockMaterialId)
    if (exists) return
    setStockMaterialId(null)
    resetStockForm(null)
  }, [materials, stockMaterialId])

  const resetForm = () => {
    setEditingId(null)
    setMaterialType('FILAMENT')
    setFilamentTypeId('')
    setBrandId('')
    setDiameterMm('1.75')
    setSpoolWeightG('1000')
    setDensityKgM3('1100')
    setNotes('')
  }

  const startEdit = (material: Material) => {
    setEditingId(material.id)
    setMaterialType(material.materialType)
    setFilamentTypeId(material.filamentTypeId ?? '')
    setBrandId(material.brandId ?? '')
    setDiameterMm(material.diameterMm != null ? String(material.diameterMm) : '')
    setSpoolWeightG(material.spoolWeightG != null ? String(material.spoolWeightG) : '')
    setDensityKgM3(material.densityKgM3 != null ? String(material.densityKgM3) : '')
    setNotes(material.notes ?? '')
  }

  const buildPayload = () => {
    const payload: {
      materialType: MaterialCategory
      filamentTypeId?: string
      brandId?: string
      diameterMm?: number
      spoolWeightG?: number
      densityKgM3?: number
      notes?: string
    } = {
      materialType,
      filamentTypeId: filamentTypeId || undefined,
      brandId: brandId || undefined,
      notes: notes.trim() || undefined,
    }

    const nextDiameter = parseOptionalNumber(diameterMm)
    const nextSpoolWeight = parseOptionalInt(spoolWeightG)
    const nextDensity = parseOptionalNumber(densityKgM3)

    if (materialType === 'FILAMENT') {
      if (nextDiameter !== undefined) payload.diameterMm = Math.max(0.1, nextDiameter)
      if (nextSpoolWeight !== undefined) payload.spoolWeightG = Math.max(1, nextSpoolWeight)
    }
    if (materialType === 'RESIN') {
      if (nextDensity !== undefined) payload.densityKgM3 = Math.max(1, nextDensity)
    }

    return payload
  }

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      payload.id
        ? materialsService.update(payload.id, payload.data)
        : materialsService.create(payload.data),
    onSuccess: (_, payload) => {
      toast.success(payload.id ? 'Matéria-prima atualizada' : 'Matéria-prima criada')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar matéria-prima')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => materialsService.remove(id),
    onSuccess: () => {
      toast.success('Matéria-prima removida')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover matéria-prima')),
  })

  const canSubmit = materialType === 'FILAMENT'
    ? (!!filamentTypeId || !!brandId || !!diameterMm.trim() || !!spoolWeightG.trim() || !!notes.trim())
    : (!!filamentTypeId || !!brandId || !!densityKgM3.trim() || !!notes.trim())

  const submit = () => {
    if (!canSubmit) return
    save.mutate({ id: editingId ?? undefined, data: buildPayload() })
  }

  const { data: stocksRes } = useQuery({
    queryKey: ['materials', stockMaterialId, 'stocks', 'full'],
    queryFn: () => materialsService.getStocks(stockMaterialId as string, { limit: 200 }),
    enabled: !!stockMaterialId,
  })
  const stocks: MaterialStock[] = stocksRes?.data ?? []

  const startEditStock = (stock: MaterialStock) => {
    setEditingStockId(stock.id)
    setLotNumber(stock.lotNumber ?? '')
    setInitialWeightG(String(Math.trunc(Number(stock.initialWeightG) || 0)))
    setCurrentWeightG(String(Math.trunc(Number(stock.currentWeightG) || 0)))
    setCostPerKg(Number(stock.costPerKg) || 0)
    setStockStatus(stock.status)
    setOpenedDate(stock.openedDate ? stock.openedDate.slice(0, 10) : '')
    setPurchaseDate(new Date().toISOString().slice(0, 10))
  }

  const buildCreateStockPayload = () => ({
    initialWeightG: Math.max(1, parseOptionalInt(initialWeightG) ?? 1),
    costPerKg: Math.max(0, costPerKg || 0),
    lotNumber: lotNumber.trim() || undefined,
    purchaseDate: purchaseDate || undefined,
    openedDate: openedDate || undefined,
    status: stockStatus,
  })

  const buildUpdateStockPayload = () => {
    const payload: {
      status: MaterialStock['status']
      currentWeightG: number
      costPerKg: number
      lotNumber?: string
      openedDate?: string
    } = {
      status: stockStatus,
      currentWeightG: Math.max(0, parseOptionalInt(currentWeightG) ?? 0),
      costPerKg: Math.max(0, costPerKg || 0),
    }

    if (lotNumber.trim()) payload.lotNumber = lotNumber.trim()
    if (openedDate) payload.openedDate = openedDate

    return payload
  }

  const saveStock = useMutation({
    mutationFn: (payload: { materialId: string; stockId?: string }) =>
      payload.stockId
        ? materialsService.updateStock(payload.stockId, buildUpdateStockPayload())
        : materialsService.addStock(payload.materialId, buildCreateStockPayload()),
    onSuccess: (_, payload) => {
      const createdLabel = selectedStockMaterial?.materialType === 'FILAMENT'
        ? 'Bobina adicionada'
        : 'Pote de resina adicionado'
      toast.success(payload.stockId ? 'Recipiente atualizado' : createdLabel)
      if (payload.materialId) {
        queryClient.invalidateQueries({ queryKey: ['materials', payload.materialId, 'stocks'] })
      }
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      resetStockForm(selectedStockMaterial)
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar recipiente')),
  })

  const closeStock = useMutation({
    mutationFn: (stockId: string) => materialsService.updateStock(stockId, { status: 'EMPTY', currentWeightG: 0 }),
    onSuccess: () => {
      toast.success('Recipiente encerrado')
      setPendingCloseStock(null)
      if (stockMaterialId) {
        queryClient.invalidateQueries({ queryKey: ['materials', stockMaterialId, 'stocks'] })
      }
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao encerrar recipiente')),
  })

  const canSubmitStock = !!stockMaterialId && (
    editingStockId
      ? Number.isFinite(Number(currentWeightG)) && Number(currentWeightG) >= 0
      : Number.isFinite(Number(initialWeightG)) && Number(initialWeightG) > 0
  )

  const submitStock = () => {
    if (!stockMaterialId || !canSubmitStock) return
    saveStock.mutate({ materialId: stockMaterialId, stockId: editingStockId ?? undefined })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Matéria-prima</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>
            Cadastro e gestão dos materiais de impressão, em filamento ou resina.
          </div>
        </div>

        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
              <th className="px-4 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Matéria-prima</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Tipo</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Diâmetro</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Bobina / Densidade</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Recipientes</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Observações</th>
              <th className="px-4 py-2 text-right font-medium" style={{ color: NEX.textDim }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>
                  Nenhuma matéria-prima cadastrada.
                </td>
              </tr>
            )}

            {materials.map((material) => (
              <tr key={material.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3">
                  <div className="font-medium">{material.filamentType?.name ?? 'Sem tipo'}</div>
                  <div className="text-[11px]" style={{ color: NEX.textDim }}>
                    {material.brand?.name ?? 'Sem marca'}
                  </div>
                </td>
                <td className="px-2">
                  <Pill tone={material.materialType === 'FILAMENT' ? 'cyan' : 'default'}>
                    {material.materialType === 'FILAMENT' ? 'Filamento' : 'Resina'}
                  </Pill>
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {material.materialType === 'FILAMENT'
                    ? (material.diameterMm ? `${Number(material.diameterMm).toFixed(2)} mm` : '—')
                    : '—'}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {material.materialType === 'FILAMENT'
                    ? (material.spoolWeightG ? `${Math.trunc(Number(material.spoolWeightG))} g` : '—')
                    : (material.densityKgM3 ? `${Number(material.densityKgM3).toFixed(0)} kg/m3` : '—')}
                </td>
                <td className="px-2">
                  <button
                    onClick={() => selectStockMaterial(material)}
                    className="text-[11px]"
                    style={{ color: stockMaterialId === material.id ? NEX.green : NEX.cyan }}
                  >
                    {material.materialType === 'FILAMENT' ? 'Gerir bobinas' : 'Gerir potes'}
                  </button>
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {material.notes?.trim() || '—'}
                </td>
                <td className="px-4 text-right">
                  <div className="inline-flex items-center gap-3">
                    <button onClick={() => startEdit(material)} className="text-[11px]" style={{ color: NEX.cyan }}>Alterar</button>
                    <button onClick={() => setPendingDelete(material)} className="text-[11px]" style={{ color: NEX.red }}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="space-y-4">
        <Card>
          <div className="text-[13px] font-semibold mb-3">{editingId ? 'Alterar matéria-prima' : 'Nova matéria-prima'}</div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-9 rounded text-[12px] font-medium"
                style={{
                  background: materialType === 'FILAMENT' ? NEX.cyanDim : NEX.surface2,
                  color: materialType === 'FILAMENT' ? NEX.cyan : NEX.textDim,
                  border: `1px solid ${NEX.border}`,
                }}
                onClick={() => setMaterialType('FILAMENT')}
              >
                Filamento
              </button>
              <button
                type="button"
                className="h-9 rounded text-[12px] font-medium"
                style={{
                  background: materialType === 'RESIN' ? NEX.cyanDim : NEX.surface2,
                  color: materialType === 'RESIN' ? NEX.cyan : NEX.textDim,
                  border: `1px solid ${NEX.border}`,
                }}
                onClick={() => setMaterialType('RESIN')}
              >
                Resina
              </button>
            </div>

            <ResourceField label="Tipo específico">
              <select value={filamentTypeId} onChange={(e) => setFilamentTypeId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {materialTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </ResourceField>

            <ResourceField label="Marca">
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </ResourceField>

            {materialType === 'FILAMENT' ? (
              <div className="grid grid-cols-2 gap-2">
                <ResourceField label="Diâmetro (mm)">
                  <input type="number" min={0.1} step="0.01" value={diameterMm} onChange={(e) => setDiameterMm(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
                </ResourceField>
                <ResourceField label="Peso da bobina (g)">
                  <input type="number" min={1} step="1" value={spoolWeightG} onChange={(e) => setSpoolWeightG(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
                </ResourceField>
              </div>
            ) : (
              <ResourceField label="Densidade (kg/m3)">
                <input type="number" min={1} step="1" value={densityKgM3} onChange={(e) => setDensityKgM3(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
              </ResourceField>
            )}

            <ResourceField label="Observações">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[68px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" />
            </ResourceField>

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
                {editingId ? 'Salvar alterações' : 'Criar matéria-prima'}
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-[13px] font-semibold mb-1">Gestão de bobinas e potes</div>
          {!selectedStockMaterial ? (
            <div className="text-[11px]" style={{ color: NEX.textDim }}>
              Selecione uma matéria-prima na tabela e clique em Gerir bobinas ou Gerir potes.
            </div>
          ) : (
            <>
              <div className="text-[11px] mb-3" style={{ color: NEX.textDim }}>
                Gerenciando {selectedStockMaterial.materialType === 'FILAMENT' ? 'bobinas' : 'potes de resina'} de {selectedStockMaterial.filamentType?.name ?? 'matéria-prima sem tipo'}.
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <ResourceField label="Lote / identificação">
                    <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className={resourceInputCls} />
                  </ResourceField>
                  <ResourceField label="Status">
                    <select value={stockStatus} onChange={(e) => setStockStatus(e.target.value as MaterialStock['status'])} className={resourceInputCls}>
                      <option value="SEALED">Lacrado</option>
                      <option value="IN_USE">Em uso</option>
                      <option value="EMPTY">Vazio</option>
                      <option value="EXPIRED">Expirado</option>
                    </select>
                  </ResourceField>
                </div>

                {editingStockId ? (
                  <div className="grid grid-cols-2 gap-2">
                    <ResourceField label="Peso inicial (g)">
                      <input value={initialWeightG} className={resourceInputCls + ' text-right tabular-nums opacity-60'} disabled />
                    </ResourceField>
                    <ResourceField label="Peso atual (g) *">
                      <input type="number" min={0} step="1" value={currentWeightG} onChange={(e) => setCurrentWeightG(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
                    </ResourceField>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <ResourceField label={selectedStockMaterial.materialType === 'FILAMENT' ? 'Peso da bobina (g) *' : 'Peso do pote (g) *'}>
                      <input type="number" min={1} step="1" value={initialWeightG} onChange={(e) => {
                        setInitialWeightG(e.target.value)
                        setCurrentWeightG(e.target.value)
                      }} className={resourceInputCls + ' text-right tabular-nums'} />
                    </ResourceField>
                    <ResourceField label="Data da compra">
                      <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={resourceInputCls} />
                    </ResourceField>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <ResourceField label="Custo por kg (R$)">
                    <DecimalRtlInput value={costPerKg} onValueChange={setCostPerKg} min={0} className={resourceInputCls + ' tabular-nums'} />
                  </ResourceField>
                  <ResourceField label="Data de abertura">
                    <input type="date" value={openedDate} onChange={(e) => setOpenedDate(e.target.value)} className={resourceInputCls} />
                  </ResourceField>
                </div>

                <div className="flex gap-2">
                  {editingStockId && (
                    <Btn kind="ghost" size="md" className="flex-1 justify-center" onClick={() => resetStockForm(selectedStockMaterial)}>
                      Cancelar alteração
                    </Btn>
                  )}
                  <Btn
                    kind="primary"
                    size="md"
                    icon={editingStockId ? Icons.check : Icons.plus}
                    className={(editingStockId ? 'flex-1' : 'w-full') + ' justify-center'}
                    disabled={!canSubmitStock || saveStock.isPending}
                    onClick={submitStock}
                  >
                    {editingStockId
                      ? 'Salvar recipiente'
                      : (selectedStockMaterial.materialType === 'FILAMENT' ? 'Adicionar bobina' : 'Adicionar pote')}
                  </Btn>
                </div>

                <div style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <div className="text-[11px] py-2" style={{ color: NEX.textDim }}>
                    Recipientes cadastrados: {stocks.length}
                  </div>
                  {stocks.length === 0 ? (
                    <div className="pb-2 text-[11px]" style={{ color: NEX.textMute }}>
                      Nenhuma {selectedStockMaterial.materialType === 'FILAMENT' ? 'bobina' : 'pote'} cadastrada.
                    </div>
                  ) : (
                    <table className="w-full text-[11.5px]">
                      <thead>
                        <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
                          <th className="py-2 text-left font-medium" style={{ color: NEX.textDim }}>Recipiente</th>
                          <th className="py-2 text-left font-medium" style={{ color: NEX.textDim }}>Status</th>
                          <th className="py-2 text-left font-medium" style={{ color: NEX.textDim }}>Peso / nível</th>
                          <th className="py-2 text-left font-medium" style={{ color: NEX.textDim }}>Custo/kg</th>
                          <th className="py-2 text-right font-medium" style={{ color: NEX.textDim }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stocks.map((stock) => {
                          const currentWeight = Math.max(0, Number(stock.currentWeightG) || 0)
                          const initialWeight = Math.max(0, Number(stock.initialWeightG) || 0)
                          const remainingPercent = initialWeight > 0
                            ? Math.min(100, Math.round((currentWeight / initialWeight) * 100))
                            : 0
                          const isCritical = stock.status !== 'EMPTY' && remainingPercent <= 20
                          const levelTone = stock.status === 'EMPTY' ? 'red' : isCritical ? 'amber' : 'cyan'
                          const levelLabel = stock.status === 'EMPTY' ? 'Sem saldo' : isCritical ? 'Crítico' : 'Estável'

                          return (
                            <tr key={stock.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                              <td className="py-2">
                                {stock.lotNumber ?? `${selectedStockMaterial.materialType === 'FILAMENT' ? 'Bobina' : 'Pote'} ${stock.id.slice(0, 8)}`}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-1">
                                  <Pill tone={stock.status === 'IN_USE' ? 'cyan' : stock.status === 'EMPTY' ? 'red' : 'default'}>
                                    {stock.status === 'SEALED' && 'Lacrado'}
                                    {stock.status === 'IN_USE' && 'Em uso'}
                                    {stock.status === 'EMPTY' && 'Vazio'}
                                    {stock.status === 'EXPIRED' && 'Expirado'}
                                  </Pill>
                                  <Pill tone={levelTone}>{levelLabel}</Pill>
                                </div>
                              </td>
                              <td className="py-2" style={{ color: NEX.textDim }}>
                                <div className="w-[120px]">
                                  <div className="mb-1 flex items-center justify-between text-[10.5px]" style={{ color: NEX.textDim }}>
                                    <span>{Math.trunc(currentWeight)} g</span>
                                    <span>{remainingPercent}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full" style={{ background: NEX.surface2 }}>
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${remainingPercent}%`,
                                        background: stock.status === 'EMPTY' ? NEX.red : isCritical ? NEX.amber : NEX.cyan,
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-2">
                                <Money value={Number(stock.costPerKg)} muted />
                              </td>
                              <td className="py-2 text-right">
                                <div className="inline-flex items-center gap-3">
                                  <button onClick={() => startEditStock(stock)} className="text-[11px]" style={{ color: NEX.cyan }}>Alterar</button>
                                  <button onClick={() => setPendingCloseStock(stock)} className="text-[11px]" style={{ color: NEX.red }}>Encerrar</button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Excluir matéria-prima?"
        description={pendingDelete
          ? `Esta ação removerá permanentemente a matéria-prima "${pendingDelete.filamentType?.name ?? pendingDelete.id.slice(0, 8)}".`
          : 'Esta ação removerá permanentemente a matéria-prima selecionada.'}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate(pendingDelete.id)
        }}
      />

      <ConfirmDialog
        open={!!pendingCloseStock}
        onOpenChange={(open) => {
          if (!open) setPendingCloseStock(null)
        }}
        title={pendingCloseMaterial?.materialType === 'FILAMENT' ? 'Encerrar bobina?' : 'Encerrar pote de resina?'}
        description={pendingCloseStock
          ? `Esta ação marca o recipiente "${pendingCloseStock.lotNumber ?? pendingCloseStock.id.slice(0, 8)}" como vazio e ajusta o peso para zero.`
          : 'Esta ação encerrará o recipiente selecionado.'}
        confirmLabel="Encerrar"
        variant="danger"
        loading={closeStock.isPending}
        onConfirm={() => {
          if (!pendingCloseStock) return
          closeStock.mutate(pendingCloseStock.id)
        }}
      />
    </div>
  )
}

/* ─── Accessories ────────────────────────────────────────── */
function AccessoriesTab() {
  const queryClient = useQueryClient()
  const { data: res } = useQuery({
    queryKey: ['accessories', 'list', 'full'],
    queryFn: () => accessoriesService.findAll({ limit: 200 }),
  })
  const list: Accessory[] = res?.data ?? []

  const { data: accessoryCategoriesRes = [] } = useQuery({
    queryKey: ['domain', 'accessory-categories'],
    queryFn: () => domainService.getAccessoryCategories(),
  })
  const accessoryCategories: AccessoryCategory[] = accessoryCategoriesRes

  const { data: unitsRes = [] } = useQuery({
    queryKey: ['domain', 'units'],
    queryFn: () => domainService.getUnits(),
  })
  const units: Unit[] = unitsRes

  const { data: suppliersRes = [] } = useQuery({
    queryKey: ['suppliers', 'list', 'for-accessories'],
    queryFn: () => suppliersService.findAll({ limit: 200 }).then((payload) => payload.data),
  })
  const suppliers: Supplier[] = suppliersRes

  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Accessory | null>(null)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [purchaseMode, setPurchaseMode] = useState<PurchaseModeOption>('UNIT')
  const [purchaseQuantity, setPurchaseQuantity] = useState('100')
  const [purchaseCost, setPurchaseCost] = useState(80)
  const [stockQuantity, setStockQuantity] = useState('0')
  const [minStockAlert, setMinStockAlert] = useState('0')

  const getApiMessage = (err: unknown, fallback: string) => {
    const message = (err as { response?: { data?: { message?: string | string[] } } })
      ?.response?.data?.message

    if (Array.isArray(message)) return message[0] ?? fallback
    return message ?? fallback
  }

  const parseOptionalNumber = (value: string) => {
    if (!value.trim()) return undefined
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return undefined
    return parsed
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setCategoryId('')
    setUnitId('')
    setSupplierId('')
    setPurchaseMode('UNIT')
    setPurchaseQuantity('100')
    setPurchaseCost(80)
    setStockQuantity('0')
    setMinStockAlert('0')
  }

  const startEdit = (accessory: Accessory) => {
    setEditingId(accessory.id)
    setName(accessory.name ?? '')
    setCategoryId(accessory.categoryId ?? '')
    setUnitId(accessory.unitId ?? '')
    setSupplierId(accessory.supplierId ?? '')
    setPurchaseMode(isPurchaseModeOption(accessory.purchaseMode) ? accessory.purchaseMode : 'UNIT')
    setPurchaseQuantity(String(Number(accessory.purchaseQuantity) || 1))
    setPurchaseCost(Number(accessory.purchaseCost) || 0)
    setStockQuantity(String(Number(accessory.stockQuantity) || 0))
    setMinStockAlert(accessory.minStockAlert != null ? String(Number(accessory.minStockAlert)) : '0')
  }

  const buildPayload = () => {
    const payload: {
      name: string
      categoryId?: string
      unitId?: string
      supplierId?: string
      purchaseMode: PurchaseModeOption
      purchaseQuantity: number
      purchaseCost: number
      stockQuantity?: number
      minStockAlert?: number
    } = {
      name: name.trim(),
      categoryId: categoryId || undefined,
      unitId: unitId || undefined,
      supplierId: supplierId || undefined,
      purchaseMode,
      purchaseQuantity: Math.max(0.001, Number(purchaseQuantity) || 0.001),
      purchaseCost: Math.max(0, purchaseCost || 0),
    }

    const nextStockQuantity = parseOptionalNumber(stockQuantity)
    const nextMinStockAlert = parseOptionalNumber(minStockAlert)

    if (nextStockQuantity !== undefined) payload.stockQuantity = Math.max(0, nextStockQuantity)
    if (nextMinStockAlert !== undefined) payload.minStockAlert = Math.max(0, nextMinStockAlert)

    return payload
  }

  const save = useMutation({
    mutationFn: (payload: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      payload.id
        ? accessoriesService.update(payload.id, payload.data)
        : accessoriesService.create(payload.data),
    onSuccess: (_, payload) => {
      toast.success(payload.id ? 'Acessório atualizado' : 'Acessório criado')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao salvar acessório')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => accessoriesService.remove(id),
    onSuccess: () => {
      toast.success('Acessório removido')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao remover acessório')),
  })

  const canSubmit = !!name.trim() && Number.isFinite(Number(purchaseQuantity)) && Number(purchaseQuantity) > 0 && purchaseCost >= 0

  const submit = () => {
    if (!canSubmit) return
    save.mutate({ id: editingId ?? undefined, data: buildPayload() })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Acessórios</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>
            Cadastro e gestão de acessórios e insumos.
          </div>
        </div>

        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
              <th className="px-4 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Acessório</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Categoria</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Unidade</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Estoque</th>
              <th className="px-2 py-2 text-left font-medium" style={{ color: NEX.textDim }}>Custo / un</th>
              <th className="px-4 py-2 text-right font-medium" style={{ color: NEX.textDim }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>
                  Nenhum acessório cadastrado.
                </td>
              </tr>
            )}

            {list.map((accessory) => {
              const stock = Number(accessory.stockQuantity)
              const minStock = accessory.minStockAlert != null ? Number(accessory.minStockAlert) : 0
              const isLow = minStock > 0 && stock <= minStock

              return (
                <tr key={accessory.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{accessory.name}</div>
                    <div className="text-[11px]" style={{ color: NEX.textDim }}>
                      {accessory.supplier?.name ?? 'Sem fornecedor'}
                    </div>
                  </td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                    {accessory.category?.name ?? '—'}
                  </td>
                  <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                    {accessory.unit?.name ?? '—'}
                  </td>
                  <td className="px-2">
                    <div className="font-mono text-[11.5px]" style={{ color: isLow ? NEX.amber : NEX.textDim }}>
                      {stock.toFixed(3)}
                      {minStock > 0 && <span className="text-[10px]"> / min {minStock.toFixed(3)}</span>}
                    </div>
                  </td>
                  <td className="px-2 text-[11.5px]">
                    <Money value={Number(accessory.costPerUnit)} muted />
                  </td>
                  <td className="px-4 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button onClick={() => startEdit(accessory)} className="text-[11px]" style={{ color: NEX.cyan }}>Alterar</button>
                      <button onClick={() => setPendingDelete(accessory)} className="text-[11px]" style={{ color: NEX.red }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="text-[13px] font-semibold mb-3">{editingId ? 'Alterar acessório' : 'Novo acessório'}</div>

        <div className="space-y-3">
          <ResourceField label="Nome *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={resourceInputCls} placeholder="Ex.: Argola chaveiro 25mm" />
          </ResourceField>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Modo de compra *">
              <select value={purchaseMode} onChange={(e) => setPurchaseMode(e.target.value as PurchaseModeOption)} className={resourceInputCls}>
                {ACCESSORY_PURCHASE_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </ResourceField>
            <ResourceField label="Unidade">
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>
                ))}
              </select>
            </ResourceField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Categoria">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {accessoryCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </ResourceField>
            <ResourceField label="Fornecedor">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </ResourceField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Quantidade por compra *">
              <input type="number" min={0.001} step="0.001" value={purchaseQuantity} onChange={(e) => setPurchaseQuantity(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
            <ResourceField label="Custo da compra (R$) *">
              <DecimalRtlInput value={purchaseCost} onValueChange={setPurchaseCost} min={0} className={resourceInputCls + ' tabular-nums'} />
            </ResourceField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ResourceField label="Estoque inicial">
              <input type="number" min={0} step="0.001" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
            <ResourceField label="Alerta mínimo">
              <input type="number" min={0} step="0.001" value={minStockAlert} onChange={(e) => setMinStockAlert(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} />
            </ResourceField>
          </div>

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
              {editingId ? 'Salvar alterações' : 'Criar acessório'}
            </Btn>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Excluir acessório?"
        description={pendingDelete
          ? `Esta ação removerá permanentemente o acessório "${pendingDelete.name}".`
          : 'Esta ação removerá permanentemente o acessório selecionado.'}
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
