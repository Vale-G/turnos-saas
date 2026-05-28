
interface LegalPageProps {
  title: string;
  content: { heading: string; body: string }[];
}

export default function LegalPageLayout({ title, content }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">{title}</h1>
        <div className="prose prose-invert prose-lg max-w-none bg-gray-800/50 rounded-lg p-6 md:p-8 space-y-6">
          {content.map((section, index) => (
            <div key={index}>
              <h2 className="font-semibold text-2xl">{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
