import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RefreshCw, Unplug, Package, ShoppingCart, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { shopeeAuthService, shopeeOrdersService, shopeeProductsService } from '@/services/shopee.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { ShopeeConnectionStatus, ShopeeOrderMapping, ShopeeProductMapping, PaginatedResult } from '@/types/api.types'

export function ShopeeTab() {
  const [tab, setTab] = useState('connection')

  const { data: status, isLoading: statusLoading } = useQuery<ShopeeConnectionStatus>({
    queryKey: ['shopee', 'status'],
    queryFn: () => shopeeAuthService.getStatus(),
  })

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <ConnectionCard status={status} isLoading={statusLoading} />

      {status?.isConnected && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="connection">
              <span className="flex items-center gap-1.5"><Unplug size={14} /> Conexão</span>
            </TabsTrigger>
            <TabsTrigger value="orders">
              <span className="flex items-center gap-1.5"><ShoppingCart size={14} /> Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="products">
              <span className="flex items-center gap-1.5"><Package size={14} /> Produtos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="mt-4">
            <ConnectionDetails status={status} />
          </TabsContent>
          <TabsContent value="orders" className="mt-4">
            <ShopeeOrders />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <ShopeeProducts />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// ── Connection Card ─────────────────────────────────────────────

function ConnectionCard({ status, isLoading }: { status?: ShopeeConnectionStatus; isLoading: boolean }) {
  const qc = useQueryClient()
  const [showDisconnect, setShowDisconnect] = useState(false)

  const connectMutation = useMutation({
    mutationFn: () => shopeeAuthService.getAuthUrl(),
    onSuccess: (data) => {
      window.location.href = data.url
    },
    onError: () => toast.error('Erro ao gerar URL de autenticação'),
  })

  const disconnectMutation = useMutation({
    mutationFn: () => shopeeAuthService.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopee'] })
      toast.success('Shopee desconectado')
      setShowDisconnect(false)
    },
    onError: () => toast.error('Erro ao desconectar'),
  })

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </Card>
    )
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Shopee</h3>
              <p className="text-sm text-zinc-500">
                {status?.isConnected
                  ? `Conectado — Shop ID: ${status.shopId}`
                  : 'Não conectado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.isConnected ? (
              <>
                <Badge variant={status.isConnected ? 'success' : 'default'}>Conectado</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnect(true)}
                >
                  <Unplug size={14} className="mr-1" />
                  Desconectar
                </Button>
              </>
            ) : (
              <Button
                onClick={() => connectMutation.mutate()}
                loading={connectMutation.isPending}
              >
                <ExternalLink size={14} className="mr-1" />
                Conectar com Shopee
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={showDisconnect}
        onOpenChange={setShowDisconnect}
        title="Desconectar Shopee?"
        description="Esta ação removerá as credenciais de acesso da Shopee. Os mapeamentos de pedidos e produtos serão mantidos."
        confirmLabel="Desconectar"
        variant="danger"
        onConfirm={() => disconnectMutation.mutate()}
        loading={disconnectMutation.isPending}
      />
    </>
  )
}

// ── Connection Details ──────────────────────────────────────────

function ConnectionDetails({ status }: { status: ShopeeConnectionStatus }) {
  return (
    <Card className="p-6">
      <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-4">Detalhes da Conexão</h4>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-zinc-500">Shop ID</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{status.shopId ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500">Token Expira</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {status.tokenExpiresAt
              ? new Date(status.tokenExpiresAt).toLocaleString('pt-BR')
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500">Chaves Configuradas</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {status.configKeys.length > 0 ? status.configKeys.join(', ') : '—'}
          </dd>
        </div>
      </dl>
    </Card>
  )
}

// ── Shopee Orders ───────────────────────────────────────────────

function ShopeeOrders() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<PaginatedResult<ShopeeOrderMapping>>({
    queryKey: ['shopee', 'orders'],
    queryFn: () => shopeeOrdersService.getMappings(),
  })

  const syncMutation = useMutation({
    mutationFn: () => shopeeOrdersService.sync(),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['shopee', 'orders'] })
      toast.success(`Sincronizado: ${result.imported} importados, ${result.skipped} já existentes`)
    },
    onError: () => toast.error('Erro ao sincronizar pedidos'),
  })

  const orders = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Pedidos Shopee</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          loading={syncMutation.isPending}
        >
          <RefreshCw size={14} className="mr-1" />
          Sincronizar Agora
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido Shopee</TableHead>
                <TableHead>Pedido Local</TableHead>
                <TableHead>Status Shopee</TableHead>
                <TableHead>Status Local</TableHead>
                <TableHead>Última Sinc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableEmpty colSpan={5} message="Nenhum pedido importado" />
              ) : (
                orders.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-sm">{m.shopeeOrderSn}</TableCell>
                    <TableCell>{m.saleOrder?.orderNumber ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="default">{m.shopeeStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{m.saleOrder?.status ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {new Date(m.lastSyncedAt).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ── Shopee Products ─────────────────────────────────────────────

function ShopeeProducts() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<PaginatedResult<ShopeeProductMapping>>({
    queryKey: ['shopee', 'products'],
    queryFn: () => shopeeProductsService.getMappings(),
  })

  const syncAllStockMutation = useMutation({
    mutationFn: () => shopeeProductsService.syncAllStock(),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['shopee', 'products'] })
      toast.success(`Estoque atualizado: ${result.synced}/${result.total}`)
    },
    onError: () => toast.error('Erro ao sincronizar estoque'),
  })

  const products = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Produtos no Shopee</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncAllStockMutation.mutate()}
          loading={syncAllStockMutation.isPending}
        >
          <Truck size={14} className="mr-1" />
          Atualizar Estoque
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Shopee Item ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Última Sinc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableEmpty colSpan={6} message="Nenhum produto publicado" />
              ) : (
                products.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.product?.name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{m.product?.sku ?? '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{m.shopeeItemId}</TableCell>
                    <TableCell>
                      <Badge variant={m.shopeeStatus === 'NORMAL' ? 'success' : 'default'}>
                        {m.shopeeStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.product?.stockQuantity ?? 0}</TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {new Date(m.lastSyncedAt).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
