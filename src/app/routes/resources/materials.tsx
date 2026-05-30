import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Pill, Icons, Money, NEX, Btn } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DecimalRtlInput } from '@/components/ui/decimal-rtl-input'
import { materialsService, domainService } from '@/services/entities.service'
import type { Material, MaterialStock, FilamentType, Brand, MaterialCategory, Color } from '@/types/api.types'
import { ResourceField, resourceInputCls, getApiMessage } from './_shared'

export function MaterialsPage() {
  const [searchParams] = useSearchParams()
  const focusMaterialId = searchParams.get('materialId') ?? undefined

  const queryClient = useQueryClient()
  const { data: res } = useQuery({ queryKey: ['materials', 'list', 'full'], queryFn: () => materialsService.findAll({ limit: 200 }) })
  const materials: Material[] = res?.data ?? []

  const [materialType, setMaterialType] = useState<MaterialCategory>('FILAMENT')

  const { data: materialTypesRes = [] } = useQuery({ queryKey: ['domain', 'filament-types', materialType], queryFn: () => domainService.getFilamentTypes(materialType) })
  const materialTypes: FilamentType[] = materialTypesRes

  const { data: brandsRes = [] } = useQuery({ queryKey: ['domain', 'brands'], queryFn: () => domainService.getBrands() })
  const brands: Brand[] = brandsRes

  const { data: colorsRes = [] } = useQuery({ queryKey: ['domain', 'colors', 'material-stocks'], queryFn: () => domainService.getColors() })
  const colors: Color[] = colorsRes.filter((c) => c.isActive)

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
  const [color1Id, setColor1Id] = useState('')
  const [color2Id, setColor2Id] = useState('')
  const [color3Id, setColor3Id] = useState('')

  useEffect(() => {
    if (!filamentTypeId) return
    const exists = materialTypes.some((item) => item.id === filamentTypeId)
    if (!exists) setFilamentTypeId('')
  }, [materialTypes, filamentTypeId])

  const parseOptionalNumber = (value: string) => {
    if (!value.trim()) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  const parseOptionalInt = (value: string) => {
    const n = parseOptionalNumber(value)
    return n !== undefined ? Math.trunc(n) : undefined
  }

  const selectedStockMaterial = materials.find((m) => m.id === stockMaterialId) ?? null
  const pendingCloseMaterial = pendingCloseStock ? (materials.find((m) => m.id === pendingCloseStock.materialId) ?? null) : null

  const getDefaultWeight = (material?: Material | null) => {
    if (!material) return 1000
    if (material.materialType === 'FILAMENT') return Math.max(1, Math.trunc(Number(material.spoolWeightG) || 1000))
    return 1000
  }

  const resetStockForm = (material?: Material | null) => {
    const w = String(getDefaultWeight(material))
    setEditingStockId(null); setLotNumber(''); setInitialWeightG(w); setCurrentWeightG(w)
    setCostPerKg(0); setStockStatus('SEALED'); setPurchaseDate(new Date().toISOString().slice(0, 10))
    setOpenedDate(''); setColor1Id(''); setColor2Id(''); setColor3Id('')
  }

  const selectStockMaterial = (material: Material) => { setStockMaterialId(material.id); resetStockForm(material) }

  useEffect(() => {
    if (!stockMaterialId) return
    if (!materials.some((m) => m.id === stockMaterialId)) { setStockMaterialId(null); resetStockForm(null) }
  }, [materials, stockMaterialId])

  const resetForm = () => {
    setEditingId(null); setMaterialType('FILAMENT'); setFilamentTypeId('')
    setBrandId(''); setDiameterMm('1.75'); setSpoolWeightG('1000'); setDensityKgM3('1100'); setNotes('')
  }

  const startEdit = (material: Material) => {
    setEditingId(material.id); setMaterialType(material.materialType)
    setFilamentTypeId(material.filamentTypeId ?? ''); setBrandId(material.brandId ?? '')
    setDiameterMm(material.diameterMm != null ? String(material.diameterMm) : '')
    setSpoolWeightG(material.spoolWeightG != null ? String(material.spoolWeightG) : '')
    setDensityKgM3(material.densityKgM3 != null ? String(material.densityKgM3) : '')
    setNotes(material.notes ?? '')
  }

  useEffect(() => {
    if (!focusMaterialId || materials.length === 0 || editingId === focusMaterialId) return
    const target = materials.find((m) => m.id === focusMaterialId)
    if (target) startEdit(target)
  }, [focusMaterialId, materials, editingId])

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
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
    mutationFn: (p: { id?: string; data: ReturnType<typeof buildPayload> }) =>
      p.id ? materialsService.update(p.id, p.data) : materialsService.create(p.data),
    onSuccess: (_, p) => {
      toast.success(p.id ? 'Matéria-prima atualizada' : 'Matéria-prima criada')
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

  const { data: stocksRes } = useQuery({
    queryKey: ['materials', stockMaterialId, 'stocks', 'full'],
    queryFn: () => materialsService.getStocks(stockMaterialId as string, { limit: 200 }),
    enabled: !!stockMaterialId,
  })
  const stocks: MaterialStock[] = stocksRes?.data ?? []

  const startEditStock = (stock: MaterialStock) => {
    setEditingStockId(stock.id); setLotNumber(stock.lotNumber ?? '')
    setInitialWeightG(String(Math.trunc(Number(stock.initialWeightG) || 0)))
    setCurrentWeightG(String(Math.trunc(Number(stock.currentWeightG) || 0)))
    setCostPerKg(Number(stock.costPerKg) || 0); setStockStatus(stock.status)
    setOpenedDate(stock.openedDate ? stock.openedDate.slice(0, 10) : '')
    setPurchaseDate(new Date().toISOString().slice(0, 10))
    setColor1Id(stock.color1Id ?? ''); setColor2Id(stock.color2Id ?? ''); setColor3Id(stock.color3Id ?? '')
  }

  const buildCreateStockPayload = () => {
    const payload: Record<string, unknown> = {
      initialWeightG: Math.max(1, parseOptionalInt(initialWeightG) ?? 1),
      costPerKg: Math.max(0, costPerKg || 0),
      lotNumber: lotNumber.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      openedDate: openedDate || undefined,
      status: stockStatus,
    }
    if (selectedStockMaterial?.materialType === 'FILAMENT') {
      payload.color1Id = color1Id || undefined
      payload.color2Id = color2Id || undefined
      payload.color3Id = color3Id || undefined
    }
    return payload
  }

  const buildUpdateStockPayload = () => {
    const payload: Record<string, unknown> = {
      status: stockStatus,
      currentWeightG: Math.max(0, parseOptionalInt(currentWeightG) ?? 0),
      costPerKg: Math.max(0, costPerKg || 0),
    }
    if (lotNumber.trim()) payload.lotNumber = lotNumber.trim()
    if (openedDate) payload.openedDate = openedDate
    if (selectedStockMaterial?.materialType === 'FILAMENT') {
      payload.color1Id = color1Id || null
      payload.color2Id = color2Id || null
      payload.color3Id = color3Id || null
    }
    return payload
  }

  const saveStock = useMutation({
    mutationFn: (p: { materialId: string; stockId?: string }) =>
      p.stockId
        ? materialsService.updateStock(p.stockId, buildUpdateStockPayload())
        : materialsService.addStock(p.materialId, buildCreateStockPayload()),
    onSuccess: (_, p) => {
      const label = selectedStockMaterial?.materialType === 'FILAMENT' ? 'Bobina adicionada' : 'Pote de resina adicionado'
      toast.success(p.stockId ? 'Recipiente atualizado' : label)
      if (p.materialId) queryClient.invalidateQueries({ queryKey: ['materials', p.materialId, 'stocks'] })
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
      if (stockMaterialId) queryClient.invalidateQueries({ queryKey: ['materials', stockMaterialId, 'stocks'] })
    },
    onError: (err) => toast.error(getApiMessage(err, 'Falha ao encerrar recipiente')),
  })

  const selectedStockColorIds = [color1Id, color2Id, color3Id].filter((id): id is string => !!id)
  const hasDuplicateStockColors = new Set(selectedStockColorIds).size !== selectedStockColorIds.length
  const canSubmitStock = !!stockMaterialId && (
    editingStockId
      ? Number.isFinite(Number(currentWeightG)) && Number(currentWeightG) >= 0
      : Number.isFinite(Number(initialWeightG)) && Number(initialWeightG) > 0
  ) && (selectedStockMaterial?.materialType !== 'FILAMENT' || (!!color1Id && !hasDuplicateStockColors))

  const submitStock = () => {
    if (!stockMaterialId || !canSubmitStock) return
    if (selectedStockMaterial?.materialType === 'FILAMENT' && !color1Id) { toast.error('Selecione a cor principal da bobina.'); return }
    if (selectedStockMaterial?.materialType === 'FILAMENT' && hasDuplicateStockColors) { toast.error('As cores da bobina devem ser diferentes entre si.'); return }
    saveStock.mutate({ materialId: stockMaterialId, stockId: editingStockId ?? undefined })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padding={false}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${NEX.border}` }}>
          <div className="text-[13px] font-semibold">Matéria-prima</div>
          <div className="text-[11px]" style={{ color: NEX.textDim }}>Cadastro e gestão dos materiais de impressão, em filamento ou resina.</div>
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
              {['Matéria-prima', 'Tipo', 'Diâmetro', 'Bobina / Densidade', 'Recipientes', 'Observações', ''].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: NEX.textDim }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-[12px]" style={{ color: NEX.textMute }}>Nenhuma matéria-prima cadastrada.</td></tr>}
            {materials.map((material) => (
              <tr key={material.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                <td className="px-4 py-3">
                  <div className="font-medium">{material.filamentType?.name ?? 'Sem tipo'}</div>
                  <div className="text-[11px]" style={{ color: NEX.textDim }}>{material.brand?.name ?? 'Sem marca'}</div>
                </td>
                <td className="px-2"><Pill tone={material.materialType === 'FILAMENT' ? 'cyan' : 'default'}>{material.materialType === 'FILAMENT' ? 'Filamento' : 'Resina'}</Pill></td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {material.materialType === 'FILAMENT' ? (material.diameterMm ? `${Number(material.diameterMm).toFixed(2)} mm` : '—') : '—'}
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>
                  {material.materialType === 'FILAMENT' ? (material.spoolWeightG ? `${Math.trunc(Number(material.spoolWeightG))} g` : '—') : (material.densityKgM3 ? `${Number(material.densityKgM3).toFixed(0)} kg/m3` : '—')}
                </td>
                <td className="px-2">
                  <button onClick={() => selectStockMaterial(material)} className="text-[11px]" style={{ color: stockMaterialId === material.id ? NEX.green : NEX.cyan }}>
                    {material.materialType === 'FILAMENT' ? 'Gerir bobinas' : 'Gerir potes'}
                  </button>
                </td>
                <td className="px-2 text-[11.5px]" style={{ color: NEX.textDim }}>{material.notes?.trim() || '—'}</td>
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
              {(['FILAMENT', 'RESIN'] as const).map((t) => (
                <button key={t} type="button" className="h-9 rounded text-[12px] font-medium"
                  style={{ background: materialType === t ? NEX.cyanDim : NEX.surface2, color: materialType === t ? NEX.cyan : NEX.textDim, border: `1px solid ${NEX.border}` }}
                  onClick={() => setMaterialType(t)}>
                  {t === 'FILAMENT' ? 'Filamento' : 'Resina'}
                </button>
              ))}
            </div>
            <ResourceField label="Tipo específico">
              <select value={filamentTypeId} onChange={(e) => setFilamentTypeId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {materialTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </ResourceField>
            <ResourceField label="Marca">
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={resourceInputCls}>
                <option value="">Selecione (opcional)</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </ResourceField>
            {materialType === 'FILAMENT' ? (
              <div className="grid grid-cols-2 gap-2">
                <ResourceField label="Diâmetro (mm)"><input type="number" min={0.1} step="0.01" value={diameterMm} onChange={(e) => setDiameterMm(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
                <ResourceField label="Peso da bobina (g)"><input type="number" min={1} step="1" value={spoolWeightG} onChange={(e) => setSpoolWeightG(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
              </div>
            ) : (
              <ResourceField label="Densidade (kg/m3)"><input type="number" min={1} step="1" value={densityKgM3} onChange={(e) => setDensityKgM3(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
            )}
            <ResourceField label="Observações"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[68px] px-3 py-2 bg-transparent text-[13px] focus:outline-none resize-y" /></ResourceField>
            <div className="flex gap-2">
              {editingId && <Btn kind="ghost" size="md" className="flex-1 justify-center" onClick={resetForm}>Cancelar alteração</Btn>}
              <Btn kind="primary" size="md" icon={editingId ? Icons.check : Icons.plus} className={(editingId ? 'flex-1' : 'w-full') + ' justify-center'} disabled={!canSubmit || save.isPending} onClick={() => { if (canSubmit) save.mutate({ id: editingId ?? undefined, data: buildPayload() }) }}>
                {editingId ? 'Salvar alterações' : 'Criar matéria-prima'}
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-[13px] font-semibold mb-1">Gestão de bobinas e potes</div>
          {!selectedStockMaterial ? (
            <div className="text-[11px]" style={{ color: NEX.textDim }}>Selecione uma matéria-prima na tabela e clique em Gerir bobinas ou Gerir potes.</div>
          ) : (
            <>
              <div className="text-[11px] mb-3" style={{ color: NEX.textDim }}>
                Gerenciando {selectedStockMaterial.materialType === 'FILAMENT' ? 'bobinas' : 'potes de resina'} de {selectedStockMaterial.filamentType?.name ?? 'matéria-prima sem tipo'}.
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <ResourceField label="Lote / identificação"><input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className={resourceInputCls} /></ResourceField>
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
                    <ResourceField label="Peso inicial (g)"><input value={initialWeightG} className={resourceInputCls + ' text-right tabular-nums opacity-60'} disabled /></ResourceField>
                    <ResourceField label="Peso atual (g) *"><input type="number" min={0} step="1" value={currentWeightG} onChange={(e) => setCurrentWeightG(e.target.value)} className={resourceInputCls + ' text-right tabular-nums'} /></ResourceField>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <ResourceField label={selectedStockMaterial.materialType === 'FILAMENT' ? 'Peso da bobina (g) *' : 'Peso do pote (g) *'}>
                      <input type="number" min={1} step="1" value={initialWeightG} onChange={(e) => { setInitialWeightG(e.target.value); setCurrentWeightG(e.target.value) }} className={resourceInputCls + ' text-right tabular-nums'} />
                    </ResourceField>
                    <ResourceField label="Data da compra"><input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={resourceInputCls} /></ResourceField>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <ResourceField label="Custo por kg (R$)"><DecimalRtlInput value={costPerKg} onValueChange={setCostPerKg} min={0} className={resourceInputCls + ' tabular-nums'} /></ResourceField>
                  <ResourceField label="Data de abertura"><input type="date" value={openedDate} onChange={(e) => setOpenedDate(e.target.value)} className={resourceInputCls} /></ResourceField>
                </div>
                {selectedStockMaterial.materialType === 'FILAMENT' && (
                  <>
                    <div className="text-[11px]" style={{ color: NEX.textDim }}>Cores da bobina</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Cor principal *', 'Cor secundária', 'Cor terciária'] as const).map((label, i) => {
                        const vals = [color1Id, color2Id, color3Id]
                        const setters = [setColor1Id, setColor2Id, setColor3Id]
                        const val = vals[i]
                        const set = setters[i]
                        const others = vals.filter((_, j) => j !== i)
                        return (
                          <ResourceField key={label} label={label}>
                            <select value={val} onChange={(e) => set(e.target.value)} className={resourceInputCls}>
                              <option value="">{i === 0 ? 'Selecione...' : 'Opcional'}</option>
                              {colors.map((c) => (
                                <option key={c.id} value={c.id} disabled={c.id !== val && others.includes(c.id)}>{c.name}</option>
                              ))}
                            </select>
                          </ResourceField>
                        )
                      })}
                    </div>
                    {hasDuplicateStockColors && <div className="text-[11px]" style={{ color: NEX.red }}>Não repita a mesma cor entre principal, secundária e terciária.</div>}
                  </>
                )}
                <div className="flex gap-2">
                  {editingStockId && <Btn kind="ghost" size="md" className="flex-1 justify-center" onClick={() => resetStockForm(selectedStockMaterial)}>Cancelar alteração</Btn>}
                  <Btn kind="primary" size="md" icon={editingStockId ? Icons.check : Icons.plus} className={(editingStockId ? 'flex-1' : 'w-full') + ' justify-center'} disabled={!canSubmitStock || saveStock.isPending} onClick={submitStock}>
                    {editingStockId ? 'Salvar recipiente' : (selectedStockMaterial.materialType === 'FILAMENT' ? 'Adicionar bobina' : 'Adicionar pote')}
                  </Btn>
                </div>
                <div style={{ borderTop: `1px solid ${NEX.border}` }}>
                  <div className="text-[11px] py-2" style={{ color: NEX.textDim }}>Recipientes cadastrados: {stocks.length}</div>
                  {stocks.length === 0 ? (
                    <div className="pb-2 text-[11px]" style={{ color: NEX.textMute }}>Nenhum {selectedStockMaterial.materialType === 'FILAMENT' ? 'bobina' : 'pote'} cadastrado.</div>
                  ) : (
                    <table className="w-full text-[11.5px]">
                      <thead>
                        <tr style={{ borderTop: `1px solid ${NEX.border}` }}>
                          {['Recipiente', ...(selectedStockMaterial.materialType === 'FILAMENT' ? ['Cor(es)'] : []), 'Status', 'Peso / nível', 'Custo/kg', ''].map((h) => (
                            <th key={h} className="py-2 text-left font-medium" style={{ color: NEX.textDim }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stocks.map((stock) => {
                          const current = Math.max(0, Number(stock.currentWeightG) || 0)
                          const initial = Math.max(0, Number(stock.initialWeightG) || 0)
                          const pct = initial > 0 ? Math.min(100, Math.round((current / initial) * 100)) : 0
                          const isCritical = stock.status !== 'EMPTY' && pct <= 20
                          const levelTone = stock.status === 'EMPTY' ? 'red' : isCritical ? 'amber' : 'cyan'
                          const levelLabel = stock.status === 'EMPTY' ? 'Sem saldo' : isCritical ? 'Crítico' : 'Estável'
                          return (
                            <tr key={stock.id} style={{ borderTop: `1px solid ${NEX.border}` }}>
                              <td className="py-2">{stock.lotNumber ?? `${selectedStockMaterial.materialType === 'FILAMENT' ? 'Bobina' : 'Pote'} ${stock.id.slice(0, 8)}`}</td>
                              {selectedStockMaterial.materialType === 'FILAMENT' && (
                                <td className="py-2">
                                  <div className="flex flex-wrap items-center gap-1">
                                    {[stock.color1, stock.color2, stock.color3].filter((c): c is NonNullable<typeof c> => !!c).map((c) => (
                                      <span key={c.id} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px]" style={{ background: NEX.surface2, border: `1px solid ${NEX.border}`, color: NEX.textDim }}>
                                        <span className="h-2 w-2 rounded-full" style={{ background: c.isRainbow ? 'linear-gradient(90deg,#ff5c7a,#ffb547,#5eff8a,#00d9ff,#a78bfa)' : (c.hexCode || NEX.borderHi) }} />
                                        {c.name}
                                      </span>
                                    ))}
                                    {!stock.color1 && !stock.color2 && !stock.color3 && <span style={{ color: NEX.textMute }}>—</span>}
                                  </div>
                                </td>
                              )}
                              <td className="py-2">
                                <div className="flex items-center gap-1">
                                  <Pill tone={stock.status === 'IN_USE' ? 'cyan' : stock.status === 'EMPTY' ? 'red' : 'default'}>
                                    {stock.status === 'SEALED' && 'Lacrado'}{stock.status === 'IN_USE' && 'Em uso'}{stock.status === 'EMPTY' && 'Vazio'}{stock.status === 'EXPIRED' && 'Expirado'}
                                  </Pill>
                                  <Pill tone={levelTone}>{levelLabel}</Pill>
                                </div>
                              </td>
                              <td className="py-2">
                                <div className="w-[120px]">
                                  <div className="mb-1 flex items-center justify-between text-[10.5px]" style={{ color: NEX.textDim }}>
                                    <span>{Math.trunc(current)} g</span><span>{pct}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full" style={{ background: NEX.surface2 }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: stock.status === 'EMPTY' ? NEX.red : isCritical ? NEX.amber : NEX.cyan }} />
                                  </div>
                                </div>
                              </td>
                              <td className="py-2"><Money value={Number(stock.costPerKg)} muted /></td>
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

      <ConfirmDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null) }} title="Excluir matéria-prima?"
        description={pendingDelete ? `Esta ação removerá permanentemente a matéria-prima "${pendingDelete.filamentType?.name ?? pendingDelete.id.slice(0, 8)}".` : 'Esta ação removerá permanentemente a matéria-prima selecionada.'}
        confirmLabel="Excluir" variant="danger" loading={remove.isPending} onConfirm={() => { if (!pendingDelete) return; remove.mutate(pendingDelete.id) }} />

      <ConfirmDialog open={!!pendingCloseStock} onOpenChange={(open) => { if (!open) setPendingCloseStock(null) }}
        title={pendingCloseMaterial?.materialType === 'FILAMENT' ? 'Encerrar bobina?' : 'Encerrar pote de resina?'}
        description={pendingCloseStock ? `Esta ação marca o recipiente "${pendingCloseStock.lotNumber ?? pendingCloseStock.id.slice(0, 8)}" como vazio e ajusta o peso para zero.` : 'Esta ação encerrará o recipiente selecionado.'}
        confirmLabel="Encerrar" variant="danger" loading={closeStock.isPending} onConfirm={() => { if (!pendingCloseStock) return; closeStock.mutate(pendingCloseStock.id) }} />
    </div>
  )
}
