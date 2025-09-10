'use client';

import { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';

// Types
export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export type LogEntry = {
  id: string; // Changed to string to accommodate UUID
  message: string;
  status: 'success' | 'error' | 'info';
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

export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type SyncSchedule = {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours';
  days: DayOfWeek[];
};

export type Environment = {
  id: string;
  name: string;
  url: string;
  schedule: SyncSchedule;
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
  | { type: 'ADD_LOG'; id: string; log: Omit<LogEntry, 'id' | 'timestamp'> }
  | { type: 'ADD_ENVIRONMENT'; environment: Omit<Environment, 'id'> & { id?: string } }
  | { type: 'UPDATE_ENVIRONMENT'; environment: Environment }
  | { type: 'REMOVE_ENVIRONMENT'; id: string };

const initialState: State = {
  environments: [],
  syncs: [],
};

const emptyFirebaseConfig: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Default values are for example purposes only.
const defaultEnvironments: Environment[] = [];

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
          sync.id === action.id ? { ...sync, syncState: 'syncing', syncProgress: 0, logs: [] } : sync
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
                  ...sync.logs,
                  {
                    id: uuidv4(),
                    message: 'Sincronização concluída com sucesso.',
                    status: 'success',
                    timestamp: new Date().toLocaleTimeString(),
                  },
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
                  ...sync.logs,
                  {
                    id: uuidv4(),
                    message: `Falha na sincronização: ${action.error}`,
                    status: 'error',
                    timestamp: new Date().toLocaleTimeString(),
                  },
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
    
    case 'ADD_LOG':
        return {
            ...state,
            syncs: state.syncs.map(sync =>
            sync.id === action.id
                ? {
                    ...sync,
                    logs: [
                        ...sync.logs,
                        {
                            ...action.log,
                            id: uuidv4(),
                            timestamp: new Date().toLocaleTimeString(),
                        },
                    ],
                }
                : sync
            ),
        };

    case 'ADD_ENVIRONMENT': {
      const newId = uuidv4();
      const newEnvironment: Environment = { 
        id: newId, 
        ...action.environment,
        firebaseConfig: action.environment.firebaseConfig || emptyFirebaseConfig,
        schedule: action.environment.schedule || { value: 30, unit: 'seconds', days: [] },
      };
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

const loadState = (): State => {
    try {
        const storedState = localStorage.getItem('syncAppState');
        if (!storedState) {
          const initialSyncs: SyncInstance[] = defaultEnvironments.map(env => ({
              id: env.id,
              isPaused: true,
              syncState: 'idle',
              syncProgress: 0,
              logs: [],
          }));
          return { environments: defaultEnvironments, syncs: initialSyncs };
        }
        
        const parsedState = JSON.parse(storedState);

        // Basic validation to check if the loaded state is plausible
        if (!Array.isArray(parsedState.environments) || !Array.isArray(parsedState.syncs)) {
          throw new Error("Invalid state structure");
        }

        // Data migration and validation
        parsedState.environments = parsedState.environments.map((env: any) => ({
            ...env,
            id: env.id || uuidv4(),
            name: env.name || 'Untitled Connection',
            url: env.url || '',
            firebasePath: env.firebasePath || 'storage/data/',
            firebaseConfig: env.firebaseConfig || emptyFirebaseConfig,
            schedule: env.schedule || { value: 30, unit: 'seconds', days: [] },
        }));
        
        // Ensure syncs and environments are aligned
        const envIds = new Set(parsedState.environments.map((e: Environment) => e.id));
        parsedState.syncs = parsedState.syncs.filter((s: SyncInstance) => envIds.has(s.id));
        
        parsedState.environments.forEach((env: Environment) => {
            const syncExists = parsedState.syncs.some((s: SyncInstance) => s.id === env.id);
            if (!syncExists) {
                parsedState.syncs.push({
                    id: env.id,
                    isPaused: true,
                    syncState: 'idle',
                    syncProgress: 0,
                    logs: [],
                });
            }
        });

        parsedState.syncs.forEach((sync: SyncInstance) => {
          if (sync.logs && sync.logs.length > 50) {
            sync.logs = sync.logs.slice(0, 50);
          }
        });

        return parsedState;

    } catch (error) {
        console.error("Failed to parse state from localStorage, loading default state.", error);
        const initialSyncs: SyncInstance[] = defaultEnvironments.map(env => ({
            id: env.id,
            isPaused: true,
            syncState: 'idle',
            syncProgress: 0,
            logs: [],
        }));
        return { environments: defaultEnvironments, syncs: initialSyncs };
    }
};


export function SyncProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(syncReducer, initialState);

  useEffect(() => {
    const loadedState = loadState();
    dispatch({ type: 'INITIALIZE_STATE', payload: loadedState });
  }, []);

  useEffect(() => {
    try {
      if (state !== initialState) { // Avoid saving the initial empty state
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
