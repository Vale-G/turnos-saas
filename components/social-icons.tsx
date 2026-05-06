import { siteConfig } from '@/config/site';
import { Instagram } from 'lucide-react';
import Link from 'next/link';

const iconMap = {
  instagram: Instagram,
};

export function SocialIcons() {
  return (
    <div className="flex items-center gap-4">
      {Object.entries(siteConfig.links).map(([name, href]) => {
        const Icon = iconMap[name as keyof typeof iconMap];
        if (!Icon) return null;

        return (
          <Link key={name} href={href} target="_blank" rel="noopener noreferrer">
            <Icon className="h-6 w-6 text-slate-400 transition-colors hover:text-white" />
            <span className="sr-only">{name}</span>
          </Link>
        );
      })}
    </div>
  );
}
