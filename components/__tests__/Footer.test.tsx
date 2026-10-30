import { render, screen } from '@testing-library/react'
import { Footer } from '../Footer'

import { NextIntlClientProvider } from 'next-intl'
import messages from '../../messages/es.json'

describe('Footer', () => {
  it('renders the footer with the copyright text', () => {
    render(<NextIntlClientProvider locale="es" messages={messages}><Footer /></NextIntlClientProvider>)

    // Usamos una expresión regular para buscar el texto, ignorando mayúsculas/minúsculas
    // y posibles espacios extra alrededor del año.
    const copyrightText = screen.getByText(/Todos los derechos reservados/i)

    expect(copyrightText).toBeInTheDocument()
  })
})
