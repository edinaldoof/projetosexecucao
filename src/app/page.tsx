import Link from 'next/link';
import SyncManager from '@/components/sync-manager';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex justify-between items-center text-left">
          <div>
            <h1 className="text-4xl font-headline font-bold tracking-tight text-primary">
              Firebase Syncer
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Painel de Sincronização de Dados
            </p>
          </div>
          <Button asChild variant="outline" size="icon">
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Configurações</span>
            </Link>
          </Button>
        </header>
        <SyncManager />
      </div>
    </main>
  );
}
