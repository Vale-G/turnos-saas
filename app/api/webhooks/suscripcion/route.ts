import { NextResponse } from 'next/server'

// Activation requires a sandbox-verified adapter for recurring invoices.
// The previous one-time Checkout notification must never grant SaaS access.
export function POST() {
  return NextResponse.json({ error: 'Facturación recurrente deshabilitada' }, { status: 503 })
}
