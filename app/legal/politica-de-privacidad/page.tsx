
import LegalPageLayout from '../LegalPageLayout';
import legalContent from '@/es.json'; // Corregido: apuntar a la raíz del proyecto

export default function PoliticaPrivacidadPage() {
  const { title, content } = legalContent.legal.privacy;
  return <LegalPageLayout title={title} content={content} />;
}
