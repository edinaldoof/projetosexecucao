'use client';

import { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';

// Types
export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export type LogEntry = {
  id: string;
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
  firestoreCollection: string; // Path to the Firestore collection
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
  isInitialized: boolean;
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
  isInitialized: false,
};

const emptyFirebaseConfig: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Reducer
function syncReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INITIALIZE_STATE':
      return { ...action.payload, isInitialized: true };

    case 'TOGGLE_PAUSE':
      return {
        ...state,
        syncs: state.syncs.map(sync =>
          sync.id === action.id ? { ...sync, isPaused: !sync.isPaused, syncState: sync.syncState === 'syncing' ? 'idle' : sync.syncState } : sync
        ),
      };

    case 'START_SYNC':
      return {
        ...state,
        syncs: state.syncs.map(sync =>
          sync.id === action.id ? { ...sync, syncState: 'syncing', syncProgress: 0, logs: sync.logs.length > 20 ? [] : sync.logs } : sync
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
                    id: uuidv4(),
                    message: `Falha na sincronização: ${action.error}`,
                    status: 'error',
                    timestamp: new Date().toLocaleTimeString(),
                  },
                  ...sync.logs
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
                  {
                    ...action.log,
                    id: uuidv4(),
                    timestamp: new Date().toLocaleTimeString(),
                  },
                  ...sync.logs, // Add new logs to the top
                ].slice(0, 50), // Keep only the last 50 logs
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
        firestoreCollection: action.environment.firestoreCollection || 'sincronizacao-dados',
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

// API functions to interact with the server-side JSON file
const loadStateFromFile = async (): Promise<State> => {
    try {
        const response = await fetch('/api/environments');
        if (!response.ok) {
            throw new Error('Failed to fetch environments config');
        }
        const environments = await response.json();

        // Create sync instances based on loaded environments
        const syncs: SyncInstance[] = environments.map((env: Environment) => ({
            id: env.id,
            isPaused: true,
            syncState: 'idle',
            syncProgress: 0,
            logs: [],
        }));

        return { environments, syncs, isInitialized: true };
    } catch (error) {
        console.error("Failed to load state from file, using initial state.", error);
        return { ...initialState, isInitialized: true };
    }
};

const saveStateToFile = async (state: State) => {
    try {
        await fetch('/api/environments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(state.environments), // Only save environments
        });
    } catch (error) {
        console.error("Failed to save state to file", error);
    }
};


type SyncContextType = {
  state: State;
  dispatch: Dispatch<Action>;
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(syncReducer, initialState);

  // Load initial state from the file
  useEffect(() => {
    const initState = async () => {
        const loadedState = await loadStateFromFile();
        dispatch({ type: 'INITIALIZE_STATE', payload: loadedState });
    }
    initState();
  }, []);

  // Save state to file whenever environments change
  useEffect(() => {
    if (state.isInitialized) {
      saveStateToFile(state);
    }
  }, [state.environments, state.isInitialized]);


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

    