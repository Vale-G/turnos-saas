
import LegalPageLayout from '../LegalPageLayout';
import legalContent from '@/es.json'; // Navegamos a la raíz

export default function TerminosPage() {
  const { title, content } = legalContent.legal.terms;
  return <LegalPageLayout title={title} content={content} />;
}
