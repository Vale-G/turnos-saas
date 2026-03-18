import { NextResponse } from 'next/server'

export function middleware() {
  // Dejamos pasar a todo el mundo.
  // La seguridad la maneja el Dashboard internamente.
  return NextResponse.next()
}

export const config = {
  matcher: [], // No bloqueamos ninguna ruta
}