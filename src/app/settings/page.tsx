import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SettingsManager from '@/components/settings-manager';

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-background">
      <div className="w-full max-w-2xl space-y-6">
        <header className="flex justify-between items-center text-left">
          <div className="flex items-center gap-4">
             <Button asChild variant="outline" size="icon">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
            <div>
                <h1 className="text-4xl font-headline font-bold tracking-tight text-primary">
                Configurações
                </h1>
                <p className="mt-3 text-lg text-muted-foreground">
                Gerencie suas fontes de dados e conexões.
                </p>
            </div>
          </div>
        </header>
        <SettingsManager />
      </div>
    </main>
  );
}
