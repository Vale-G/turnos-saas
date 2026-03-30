'use client'
import { Component, ReactNode } from 'react'

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[Turnly] Error no capturado:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-6xl font-black italic text-red-400">Oops</p>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">Algo salió mal</h1>
          <p className="text-slate-500 max-w-sm text-sm">Hubo un error inesperado. Por favor recargá la página.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-black font-black uppercase italic px-8 py-3 rounded-2xl hover:opacity-90 transition-opacity mt-2"
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
