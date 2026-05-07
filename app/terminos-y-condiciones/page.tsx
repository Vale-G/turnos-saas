
import Link from "next/link";
import messages from "@/messages/es.json"; // Asegúrate de que la ruta sea correcta

export default function TermsPage() {
    const t = messages.TermsPage;
    const appName = "Turnly"; // Puedes obtener esto de una variable de entorno si quieres

    return (
        <div className="min-h-screen bg-[#020617] text-white font-sans">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
                <Link href="/" className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-8 inline-block hover:text-white transition-colors">
                    {t.backToHome}
                </Link>
                <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-4">
                    {t.title}
                </h1>
                <p className="text-sm text-slate-500 mb-12">
                    {t.lastUpdated.replace('{updatedAt}', new Date().toLocaleDateString('es-ES'))}
                </p>

                <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-white prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-a:text-emerald-400 hover:prose-a:text-emerald-300">
                    <h2>{t.sections.serviceObject.title}</h2>
                    <p>{t.sections.serviceObject.content.replace('{appName}', appName)}</p>

                    <h2>{t.sections.accountRegistration.title}</h2>
                    <p>{t.sections.accountRegistration.content}</p>

                    <h2>{t.sections.billing.title}</h2>
                    <p>{t.sections.billing.content.replace('{appName}', appName)}</p>

                    <h2>{t.sections.acceptableUse.title}</h2>
                    <p>{t.sections.acceptableUse.content.replace('{appName}', appName)}</p>

                    <h2>{t.sections.liabilityLimitation.title}</h2>
                    <p>{t.sections.liabilityLimitation.content.replace('{appName}', appName)}</p>

                    <h2>{t.sections.intellectualProperty.title}</h2>
                    <p>{t.sections.intellectualProperty.content.replace('{appName}', appName)}</p>
                </div>
            </div>
        </div>
    );
}
