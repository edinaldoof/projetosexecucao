// This file is no longer the single source of truth and is only used for initializing the state if localStorage is empty.
// The management of environments is now handled dynamically in SyncContext.

export type ApiEnvironment = {
  id: string;
  name: string;
  url: string;
  firebaseTarget: string;
  syncInterval: number;
};

export const environments: ApiEnvironment[] = [
  {
    id: '1',
    name: 'Produção DB (Exemplo)',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    firebaseTarget: 'storage/producao/',
    syncInterval: 30000,
  },
  {
    id: '2',
    name: 'Desenvolvimento DB (Exemplo)',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    firebaseTarget: 'storage/desenvolvimento/',
    syncInterval: 60000,
  },
  {
    id: '3',
    name: 'API de Teste (Falha)',
    url: 'https://api.example.com/invalid-endpoint',
    firebaseTarget: 'storage/testes_falha/',
    syncInterval: 30000,
  },
];
