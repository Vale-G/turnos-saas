import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Dejamos pasar a todo el mundo. 
  // La seguridad la maneja el Dashboard internamente.
  return NextResponse.next()
}

export const config = {
  matcher: [], // No bloqueamos ninguna ruta
}