// This file is no longer the single source of truth and is only used for initializing the state if localStorage is empty.
// The management of environments is now handled dynamically in SyncContext.

export type ApiEnvironment = {
  id: string;
  name: string;
  url: string;
  firebaseTarget: string;
  syncInterval: number;
};

// This is now empty, as we want the user to start with a clean slate in a production-like environment.
export const environments: ApiEnvironment[] = [];
