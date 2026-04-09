import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { brandConfig } from '@/config/brand'

type ReservationConfirmationEmailProps = {
  clienteNombre: string
  negocioNombre: string
  fecha: string
  hora: string
  servicio: string
  precio: string
}

export function ReservationConfirmationEmail({
  clienteNombre,
  negocioNombre,
  fecha,
  hora,
  servicio,
  precio,
}: ReservationConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu reserva en {negocioNombre} está confirmada</Preview>
      <Body style={{ backgroundColor: '#f1f5f9', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '18px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <Section style={{ backgroundColor: '#020617', padding: '28px 30px' }}>
            <Heading style={{ margin: 0, color: '#ffffff', fontSize: '24px', fontStyle: 'italic' }}>
              ✅ Reserva confirmada
            </Heading>
            <Text style={{ margin: '10px 0 0', color: '#94a3b8', fontSize: '14px' }}>
              Gracias por reservar con {brandConfig.appName}.
            </Text>
          </Section>

          <Section style={{ padding: '28px 30px' }}>
            <Text style={{ margin: 0, color: '#0f172a', fontSize: '15px' }}>
              Hola <strong>{clienteNombre}</strong>, este es tu comprobante digital:
            </Text>

            <Section style={{ marginTop: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
              <Text style={{ margin: '0 0 8px', fontSize: '14px' }}><strong>Negocio:</strong> {negocioNombre}</Text>
              <Text style={{ margin: '0 0 8px', fontSize: '14px' }}><strong>Servicio:</strong> {servicio}</Text>
              <Text style={{ margin: '0 0 8px', fontSize: '14px' }}><strong>Fecha:</strong> {fecha}</Text>
              <Text style={{ margin: '0 0 8px', fontSize: '14px' }}><strong>Hora:</strong> {hora}</Text>
              <Text style={{ margin: 0, fontSize: '14px' }}><strong>Precio:</strong> {precio}</Text>
            </Section>

            <Text style={{ marginTop: '20px', color: '#64748b', fontSize: '12px', lineHeight: '20px' }}>
              Este email fue generado automáticamente por {brandConfig.appName}. Si necesitás cambiar o cancelar tu turno,
              contactá directamente al negocio.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
