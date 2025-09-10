'use client';

import { environments } from "@/lib/environments";
import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

type LogEntry = {
  id: number;
  message: string;
  status: 'success' | 'error';
  timestamp: string;
};

type State = {
  isPaused: boolean;
  syncState: SyncState;
  syncInterval: number;
  lastSync?: Date;
  syncProgress: number;
  logs: LogEntry[];
  apiUrl: string;
  currentEnvironmentId: string;
};

type Action =
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'START_SYNC' }
  | { type: 'SYNC_SUCCESS' }
  | { type: 'SYNC_ERROR'; error: string }
  | { type: 'UPDATE_PROGRESS'; progress: number }
  | { type: 'SET_INTERVAL'; interval: number }
  | { type: 'SET_API_URL'; url: string }
  | { type: 'SET_ENVIRONMENT'; id: string };

const initialState: State = {
  isPaused: false,
  syncState: 'idle',
  syncInterval: 30000,
  syncProgress: 0,
  logs: [],
  apiUrl: environments.find(e => e.id === '1')?.url || '',
  currentEnvironmentId: '1',
};

function syncReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TOGGLE_PAUSE':
      return { ...state, isPaused: !state.isPaused, syncState: state.isPaused ? 'idle' : 'idle' };
    case 'START_SYNC':
      return { ...state, syncState: 'syncing', syncProgress: 0 };
    case 'SYNC_SUCCESS':
      return {
        ...state,
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
          ...state.logs,
        ],
      };
    case 'SYNC_ERROR':
      return {
        ...state,
        syncState: 'error',
        logs: [
          {
            id: Date.now(),
            message: `Falha na sincronização: ${action.error}`,
            status: 'error',
            timestamp: new Date().toLocaleTimeString(),
          },
          ...state.logs,
        ],
      };
    case 'UPDATE_PROGRESS':
      return { ...state, syncProgress: action.progress };
    case 'SET_INTERVAL':
      return { ...state, syncInterval: action.interval };
    case 'SET_API_URL':
      return { ...state, apiUrl: action.url };
    case 'SET_ENVIRONMENT':
      const newEnv = environments.find(e => e.id === action.id);
      return {
        ...state,
        currentEnvironmentId: action.id,
        apiUrl: newEnv?.url || state.apiUrl,
      };
    default:
      return state;
  }
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
