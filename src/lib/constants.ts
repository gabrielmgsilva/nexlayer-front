export const JOB_STATUS_LABELS: Record<string, string> = {
  QUOTED:          'Orçado',
  QUEUED:          'Na Fila',
  PRINTING:        'Imprimindo',
  POST_PROCESSING: 'Pós-processamento',
  QUALITY_CHECK:   'Qualidade',
  QC_APPROVED:     'QC Aprovado',
  QC_PARTIAL_APPROVED: 'QC Parcial',
  QC_REJECTED:     'QC Reprovado',
  PACKING:         'Embalando',
  READY:           'Pronto',
  DELIVERED:       'Entregue',
  CANCELLED:       'Cancelado',
}

export const JOB_STATUS_COLORS: Record<string, string> = {
  QUOTED:          '#8b5cf6',
  QUEUED:          '#6366f1',
  PRINTING:        '#0d9488',
  POST_PROCESSING: '#f59e0b',
  QUALITY_CHECK:   '#0ea5e9',
  QC_APPROVED:     '#22c55e',
  QC_PARTIAL_APPROVED: '#f59e0b',
  QC_REJECTED:     '#ef4444',
  PACKING:         '#8b5cf6',
  READY:           '#10b981',
  DELIVERED:       '#6b7280',
  CANCELLED:       '#ef4444',
}

export const JOB_STATUS_BG: Record<string, string> = {
  QUOTED:          'bg-violet-100 text-violet-700',
  QUEUED:          'bg-indigo-100 text-indigo-700',
  PRINTING:        'bg-teal-100 text-teal-700',
  POST_PROCESSING: 'bg-amber-100 text-amber-700',
  QUALITY_CHECK:   'bg-sky-100 text-sky-700',
  QC_APPROVED:     'bg-emerald-100 text-emerald-700',
  QC_PARTIAL_APPROVED: 'bg-amber-100 text-amber-700',
  QC_REJECTED:     'bg-red-100 text-red-700',
  PACKING:         'bg-violet-100 text-violet-700',
  READY:           'bg-emerald-100 text-emerald-700',
  DELIVERED:       'bg-gray-100 text-gray-600',
  CANCELLED:       'bg-red-100 text-red-700',
}

export const PRODUCTION_MODE_LABELS: Record<string, string> = {
  SINGLE_PIECE: 'Peça única',
  BATCH:        'Lote',
}

export const BATCH_STRATEGY_LABELS: Record<string, string> = {
  FULL_PRINTS:    'Impressões completas',
  EXACT_QUANTITY: 'Quantidade exata',
}

export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE:   'Disponível',
  PRINTING:    'Imprimindo',
  MAINTENANCE: 'Em manutenção',
  INACTIVE:    'Inativa',
}

export const MATERIAL_STOCK_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponível',
  IN_USE:    'Em uso',
  EMPTY:     'Vazio',
  RESERVED:  'Reservado',
}

export const PURCHASE_MODE_LABELS: Record<string, string> = {
  UNIT: 'Unitário',
  PACK: 'Pacote',
  BOX:  'Caixa',
  ROLL: 'Rolo',
  KG:   'Kg',
}

export const FAILURE_RATE_MODE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  AUTO:   'Automático',
  HYBRID: 'Híbrido',
}

export const ALLOWED_PRINT_FORMATS = ['3mf', 'slt']

export const SALE_STATUS_LABELS: Record<string, string> = {
  PENDING:   'Pendente',
  CONFIRMED: 'Finalizada',
  SHIPPED:   'Enviada',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
}

export const SALE_STATUS_COLORS: Record<string, string> = {
  PENDING:   '#f59e0b',
  CONFIRMED: '#0d9488',
  SHIPPED:   '#6366f1',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
}

export const SALE_STATUS_BG: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-teal-100 text-teal-700',
  SHIPPED:   'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export const SIDEBAR_NAV = [
  { label: 'Dashboard',    path: '/',              icon: 'LayoutDashboard' },
  { label: 'Produção',     path: '/production',    icon: 'Factory' },
  { label: 'Calculadora',  path: '/calculator',    icon: 'Calculator' },
  { label: 'Produtos',     path: '/products',      icon: 'Package' },
  { label: 'Materiais',    path: '/materials',     icon: 'Layers' },
  { label: 'Acessórios',   path: '/accessories',   icon: 'PuzzlePiece', lucide: 'Puzzle' },
  { label: 'Equipamentos', path: '/equipment',     icon: 'Printer' },
  { label: 'Clientes',     path: '/customers',     icon: 'Users' },
  { label: 'Fornecedores', path: '/suppliers',     icon: 'Truck' },
  { label: 'Config. Custo',path: '/cost-config',   icon: 'Settings2' },
]
