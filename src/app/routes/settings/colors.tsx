import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Btn, Icons, Icon, NEX, nexAlpha } from '@/lib/nex'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { domainService } from '@/services/entities.service'
import type { Color } from '@/types/api.types'

const RAINBOW_BG = 'linear-gradient(135deg, #FF5C7A 0%, #FFB547 25%, #5EFF8A 50%, #00D9FF 75%, #B388FF 100%)'

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

export function ColorsPage() {
  const queryClient = useQueryClient()
  const { data: colors = [] } = useQuery({
    queryKey: ['domain', 'colors'],
    queryFn: () => domainService.getColors(),
  })

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingDeleteColor, setPendingDeleteColor] = useState<Color | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [hexCode, setHex] = useState('#00D9FF')
  const [isRainbow, setRainbow] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return colors
    return colors.filter((c: Color) => c.name.toLowerCase().includes(q))
  }, [colors, search])

  const openDrawer = () => {
    setName('')
    setHex('#00D9FF')
    setRainbow(false)
    setDrawerOpen(true)
  }

  const create = useMutation({
    mutationFn: () => domainService.createColor({ name, hexCode: isRainbow ? undefined : hexCode, isRainbow }),
    onSuccess: () => {
      toast.success('Cor criada')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['domain', 'colors'] })
    },
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
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 max-w-xs"
          style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
        >
          <Icon d={Icons.search} size={13} style={{ color: NEX.textMute }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cor..."
            className="bg-transparent flex-1 text-[12.5px] focus:outline-none"
            style={{ color: NEX.text }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: NEX.textMute }}>
              <Icon d={Icons.x} size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2" style={{ color: NEX.textMute }}>
          <span className="text-[11.5px]">{filtered.length} {filtered.length === 1 ? 'cor' : 'cores'}</span>
          <Btn kind="primary" size="md" icon={Icons.plus} onClick={openDrawer}>
            Nova cor
          </Btn>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ border: `1px dashed ${NEX.border}`, color: NEX.textMute }}
        >
          <Icon d={Icons.spool} size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p className="text-[13px]">
            {search ? `Nenhuma cor encontrada para "${search}"` : 'Nenhuma cor cadastrada.'}
          </p>
          {!search && (
            <Btn kind="ghost" size="sm" icon={Icons.plus} className="mt-4" onClick={openDrawer}>
              Adicionar primeira cor
            </Btn>
          )}
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {filtered.map((c: Color) => (
            <ColorCard
              key={c.id}
              color={c}
              onDelete={() => setPendingDeleteColor(c)}
            />
          ))}
        </div>
      )}

      {/* Drawer — Nova cor */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Nova cor"
      >
        <div className="space-y-4">
          {/* Preview */}
          <div
            className="w-full rounded-lg"
            style={{
              height: 80,
              background: isRainbow ? RAINBOW_BG : hexCode,
              border: `1px solid ${NEX.border}`,
              transition: 'background 0.2s',
            }}
          />

          <Field label="Nome *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Ex.: Branco Silk"
              autoFocus
            />
          </Field>

          {!isRainbow && (
            <Field label="Código hex">
              <div className="flex items-center gap-2 px-2">
                <input
                  type="color"
                  value={hexCode}
                  onChange={(e) => setHex(e.target.value)}
                  className="h-7 w-10 cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  value={hexCode}
                  onChange={(e) => setHex(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] font-mono focus:outline-none h-9"
                  style={{ color: NEX.text }}
                  placeholder="#000000"
                />
              </div>
            </Field>
          )}

          <label
            className="flex items-center gap-3 cursor-pointer select-none"
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: isRainbow ? nexAlpha('violet', 0.10) : NEX.surface2,
              border: `1px solid ${isRainbow ? nexAlpha('violet', 0.30) : NEX.border}`,
              transition: 'all 0.15s',
            }}
          >
            <input
              type="checkbox"
              checked={isRainbow}
              onChange={(e) => setRainbow(e.target.checked)}
              className="accent-current"
              style={{ accentColor: NEX.violet, width: 15, height: 15 }}
            />
            <div>
              <div className="text-[12.5px] font-medium" style={{ color: isRainbow ? NEX.violet : NEX.text }}>
                Rainbow / multicolor
              </div>
              <div className="text-[11px]" style={{ color: NEX.textMute }}>
                Exibe gradiente de múltiplas cores
              </div>
            </div>
          </label>

          <div className="pt-2 flex flex-col gap-2">
            <Btn
              kind="primary"
              size="md"
              icon={Icons.plus}
              className="w-full justify-center"
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Criar cor
            </Btn>
            <Btn
              kind="ghost"
              size="md"
              className="w-full justify-center"
              onClick={() => setDrawerOpen(false)}
            >
              Cancelar
            </Btn>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!pendingDeleteColor}
        onOpenChange={(open) => { if (!open) setPendingDeleteColor(null) }}
        title="Excluir cor?"
        description={pendingDeleteColor
          ? `Esta ação removerá permanentemente a cor "${pendingDeleteColor.name}".`
          : ''}
        confirmLabel="Excluir"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => { if (!pendingDeleteColor) return; remove.mutate(pendingDeleteColor.id) }}
      />
    </div>
  )
}

/* ─── Color Card ─────────────────────────────────────────── */
function ColorCard({ color, onDelete }: { color: Color; onDelete: () => void }) {
  return (
    <div
      className="rounded-xl overflow-hidden group"
      style={{ background: NEX.surface, border: `1px solid ${NEX.border}` }}
    >
      {/* Swatch */}
      <div
        className="w-full"
        style={{
          height: 72,
          background: color.isRainbow ? RAINBOW_BG : (color.hexCode ?? '#888'),
        }}
      />

      {/* Info */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium truncate" style={{ color: NEX.text }}>
            {color.name}
          </div>
          <div className="text-[10.5px] font-mono mt-0.5" style={{ color: NEX.textMute }}>
            {color.isRainbow ? 'Rainbow' : (color.hexCode ?? '—')}
          </div>
        </div>

        <button
          onClick={onDelete}
          className="flex-shrink-0 h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: nexAlpha('red', 0.12), color: NEX.red }}
          title="Excluir"
        >
          <Icon d={Icons.trash} size={11} />
        </button>
      </div>
    </div>
  )
}
