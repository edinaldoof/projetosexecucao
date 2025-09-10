'use client';

import { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';

// Types
export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export type LogEntry = {
  id: number;
  message: string;
  status: 'success' | 'error';
  timestamp: string;
};

export type FirebaseConfig = {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
};

export type Environment = {
  id: string;
  name: string;
  url: string;
  syncInterval: number;
  firebaseConfig: FirebaseConfig;
  firebasePath: string; // Path within the storage bucket
};

export type SyncInstance = {
  id: string; // Corresponds to Environment id
  isPaused: boolean;
  syncState: SyncState;
  lastSync?: Date;
  syncProgress: number;
  logs: LogEntry[];
};

type State = {
  environments: Environment[];
  syncs: SyncInstance[];
};

type Action =
  | { type: 'INITIALIZE_STATE'; payload: State }
  | { type: 'TOGGLE_PAUSE'; id: string }
  | { type: 'START_SYNC'; id: string }
  | { type: 'SYNC_SUCCESS'; id: string }
  | { type: 'SYNC_ERROR'; id: string; error: string }
  | { type: 'UPDATE_PROGRESS'; id: string; progress: number }
  | { type: 'ADD_ENVIRONMENT'; environment: Omit<Environment, 'id'> }
  | { type: 'UPDATE_ENVIRONMENT'; environment: Environment }
  | { type: 'REMOVE_ENVIRONMENT'; id: string };

const initialState: State = {
  environments: [],
  syncs: [],
};

// Default values are for example purposes only.
const defaultEnvironments: Environment[] = [
  {
    id: '1',
    name: 'Produção DB (Exemplo)',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    syncInterval: 30000,
    firebaseConfig: {
      projectId: "prod-project-123",
      appId: "1:prod:web:123",
      storageBucket: "prod-project-123.appspot.com",
      apiKey: "prod-key-123",
      authDomain: "prod-project-123.firebaseapp.com",
      messagingSenderId: "12345",
    },
    firebasePath: 'storage/producao/',
  },
  {
    id: '2',
    name: 'Desenvolvimento DB (Exemplo)',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    syncInterval: 60000,
     firebaseConfig: {
      projectId: "dev-project-456",
      appId: "1:dev:web:456",
      storageBucket: "dev-project-456.appspot.com",
      apiKey: "dev-key-456",
      authDomain: "dev-project-456.firebaseapp.com",
      messagingSenderId: "67890",
    },
    firebasePath: 'storage/desenvolvimento/',
  },
];

function syncReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INITIALIZE_STATE':
        return action.payload;

    case 'TOGGLE_PAUSE':
      return {
        ...state,
        syncs: state.syncs.map(sync =>
          sync.id === action.id ? { ...sync, isPaused: !sync.isPaused, syncState: 'idle' } : sync
        ),
      };

    case 'START_SYNC':
      return {
        ...state,
        syncs: state.syncs.map(sync =>
          sync.id === action.id ? { ...sync, syncState: 'syncing', syncProgress: 0 } : sync
        ),
      };

    case 'SYNC_SUCCESS':
      return {
        ...state,
        syncs: state.syncs.map(sync =>
          sync.id === action.id
            ? {
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
              }
            : sync
        ),
      };

    case 'SYNC_ERROR':
      return {
        ...state,
        syncs: state.syncs.map(sync =>
          sync.id === action.id
            ? {
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
              }
            : sync
        ),
      };
      
    case 'UPDATE_PROGRESS':
        return {
          ...state,
          syncs: state.syncs.map(sync =>
            sync.id === action.id ? { ...sync, syncProgress: action.progress } : sync
          ),
        };

    case 'ADD_ENVIRONMENT': {
      const newId = uuidv4();
      const newEnvironment: Environment = { ...action.environment, id: newId };
      const newSyncInstance: SyncInstance = {
        id: newId,
        isPaused: true,
        syncState: 'idle',
        syncProgress: 0,
        logs: [],
      };
      return {
        ...state,
        environments: [...state.environments, newEnvironment],
        syncs: [...state.syncs, newSyncInstance],
      };
    }

    case 'UPDATE_ENVIRONMENT': {
      return {
        ...state,
        environments: state.environments.map(env =>
          env.id === action.environment.id ? action.environment : env
        ),
      };
    }

    case 'REMOVE_ENVIRONMENT': {
      return {
        ...state,
        environments: state.environments.filter(env => env.id !== action.id),
        syncs: state.syncs.filter(sync => sync.id !== action.id),
      };
    }

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

  useEffect(() => {
    try {
      const storedState = localStorage.getItem('syncAppState');
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        parsedState.syncs.forEach((sync: SyncInstance) => {
          if (sync.logs.length > 50) {
            sync.logs = sync.logs.slice(0, 50);
          }
        });
        dispatch({ type: 'INITIALIZE_STATE', payload: parsedState });
      } else {
         const initialSyncs: SyncInstance[] = defaultEnvironments.map(env => ({
            id: env.id,
            isPaused: true,
            syncState: 'idle',
            syncProgress: 0,
            logs: [],
        }));
        dispatch({ type: 'INITIALIZE_STATE', payload: { environments: defaultEnvironments, syncs: initialSyncs } });
      }
    } catch (error) {
      console.error("Failed to parse state from localStorage", error);
       const initialSyncs: SyncInstance[] = defaultEnvironments.map(env => ({
        id: env.id,
        isPaused: true,
        syncState: 'idle',
        syncProgress: 0,
        logs: [],
    }));
    dispatch({ type: 'INITIALIZE_STATE', payload: { environments: defaultEnvironments, syncs: initialSyncs } });
    }
  }, []);

  useEffect(() => {
    try {
      if (state.environments.length > 0 || state.syncs.length > 0) {
        localStorage.setItem('syncAppState', JSON.stringify(state));
      }
    } catch (error) {
        console.error("Failed to save state to localStorage", error);
    }
  }, [state]);


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
