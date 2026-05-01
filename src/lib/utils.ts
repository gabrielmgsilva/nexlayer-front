import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatWeight(grams: number | string | null | undefined): string {
  const g = Number(grams ?? 0)
  if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`
  return `${g} g`
}

export function formatPercent(value: number | string | null | undefined): string {
  return `${Number(value ?? 0).toFixed(1)}%`
}

export function formatCurrencyCompact(value: number | string | null | undefined): string {
  const num = Number(value ?? 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}
