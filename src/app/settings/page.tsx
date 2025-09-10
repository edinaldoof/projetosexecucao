import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SettingsManager from '@/components/settings-manager';

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen flex-col p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full space-y-6">
        <header className="flex justify-between items-center text-left mb-6">
          <div className="flex items-center gap-4">
             <Button asChild variant="outline" size="icon">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
            <div>
                <h1 className="text-4xl font-headline font-bold tracking-tight text-primary">
                Configurações Globais
                </h1>
                <p className="mt-3 text-lg text-muted-foreground">
                Visualize as informações da sua conexão com o Firebase.
                </p>
            </div>
          </div>
        </header>
        <SettingsManager />
      </div>
    </main>
  );
}
