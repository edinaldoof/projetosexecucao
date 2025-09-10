'use client';

import { environments } from "@/lib/environments";
import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";

export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export type LogEntry = {
  id: number;
  message: string;
  status: 'success' | 'error';
  timestamp: string;
};

export type SyncInstance = {
  id: string;
  isPaused: boolean;
  syncState: SyncState;
  syncInterval: number;
  lastSync?: Date;
  syncProgress: number;
  logs: LogEntry[];
  apiUrl: string;
  firebaseTarget: string;
};

type State = {
  syncs: SyncInstance[];
};

type Action =
  | { type: 'TOGGLE_PAUSE'; id: string }
  | { type: 'START_SYNC'; id: string }
  | { type: 'SYNC_SUCCESS'; id: string }
  | { type: 'SYNC_ERROR'; id: string; error: string }
  | { type: 'UPDATE_PROGRESS'; id: string; progress: number }
  | { type: 'SET_INTERVAL'; id: string; interval: number };

const initialState: State = {
  syncs: environments.map(env => ({
    id: env.id,
    isPaused: true,
    syncState: 'idle',
    syncInterval: 30000,
    syncProgress: 0,
    logs: [],
    apiUrl: env.url,
    firebaseTarget: env.firebaseTarget,
  })),
};

function syncReducer(state: State, action: Action): State {
  return {
    ...state,
    syncs: state.syncs.map(sync => {
      if (sync.id !== action.id) {
        return sync;
      }

      switch (action.type) {
        case 'TOGGLE_PAUSE':
          return { ...sync, isPaused: !sync.isPaused, syncState: sync.isPaused ? 'idle' : 'idle' };
        case 'START_SYNC':
          return { ...sync, syncState: 'syncing', syncProgress: 0 };
        case 'SYNC_SUCCESS':
          return {
            ...sync,
            syncState: 'success',
            lastSync: new Date(),
            syncProgress: 100,
            logs: [
              {
                id: Date.now(),
                message: 'Sincronização concluída com sucesso.',
                status: 'success',
                timestamp: new Date().toLocaleTimeString(),
              },
              ...sync.logs,
            ],
          };
        case 'SYNC_ERROR':
          return {
            ...sync,
            syncState: 'error',
            logs: [
              {
                id: Date.now(),
                message: `Falha na sincronização: ${action.error}`,
                status: 'error',
                timestamp: new Date().toLocaleTimeString(),
              },
              ...sync.logs,
            ],
          };
        case 'UPDATE_PROGRESS':
          return { ...sync, syncProgress: action.progress };
        case 'SET_INTERVAL':
          return { ...sync, syncInterval: action.interval };
        default:
          return sync;
      }
    }),
  };
}

type SyncContextType = {
  state: State;
  dispatch: Dispatch<Action>;
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(syncReducer, initialState);

  return (
    <SyncContext.Provider value={{ state, dispatch }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
