import SyncManager from '@/components/sync-manager';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-background">
      <div className="w-full max-w-2xl space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-primary">
            Firebase Syncer
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Sincronizador de Dados para Firebase
          </p>
          <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
            Esta aplicação busca dados de uma API local a cada 30 segundos e os
            envia para o Firebase Storage.
          </p>
        </header>
        <SyncManager />
      </div>
    </main>
  );
}
