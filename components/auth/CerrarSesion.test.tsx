import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CerrarSesion from './CerrarSesion'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('CerrarSesion', () => {
  beforeEach(() => {
    mockPush.mockClear()
    global.fetch = jest.fn(() => Promise.resolve({ ok: true })) as jest.Mock
  })

  it('debe renderizar el botón de cerrar sesión', () => {
    render(<CerrarSesion />)
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument()
  })

  it('debe llamar a la API de logout y redirigir al hacer clic', async () => {
    render(<CerrarSesion />)

    fireEvent.click(screen.getByText('Cerrar sesión'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
