const currencyLocaleFallback: Record<string, string> = {
  ARS: 'es-AR',
  USD: 'es-US',
  EUR: 'es-ES',
  BRL: 'pt-BR',
  MXN: 'es-MX',
  CLP: 'es-CL',
  COP: 'es-CO',
  PEN: 'es-PE',
}

export function formatCurrency(
  amount: number,
  currencyCode = 'ARS',
  locale?: string
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const safeCurrency = (currencyCode || 'ARS').toUpperCase()
  const safeLocale = locale || currencyLocaleFallback[safeCurrency] || 'es-AR'
  const hasDecimals = Math.abs(safeAmount % 1) > 0

  return new Intl.NumberFormat(safeLocale, {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(safeAmount)
}
