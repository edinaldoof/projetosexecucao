'use client';

import { useSync } from '@/contexts/sync-context';
import SyncInstance from './sync-instance';

export default function SyncManager() {
  const { state } = useSync();

  return (
    <div className="space-y-8">
       {state.environments.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold">Bem-vindo ao Firebase Fadex!</h3>
          <p className="text-muted-foreground mt-2">
            Nenhuma conexão de sincronização foi configurada ainda.
            <br />
            Vá para a página de <span className="font-bold text-primary">Configurações</span> para adicionar sua primeira conexão.
          </p>
        </div>
      )}
      {state.environments.map(env => {
        const sync = state.syncs.find(s => s.id === env.id);
        if (!sync) return null;

        return (
          <SyncInstance
            key={sync.id}
            sync={sync}
            env={env}
          />
        );
      })}
    </div>
  );
}
