'use client';

import { useSync } from '@/contexts/sync-context';
import { environments } from '@/lib/environments';
import SyncInstance from './sync-instance';

export default function SyncManager() {
  const { state } = useSync();

  return (
    <div className="space-y-8">
      {state.syncs.map(sync => {
        const env = environments.find(e => e.id === sync.id);
        if (!env) return null;

        return (
          <SyncInstance
            key={sync.id}
            sync={sync}
            envName={env.name}
          />
        );
      })}
    </div>
  );
}
