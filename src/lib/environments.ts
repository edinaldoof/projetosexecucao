
export type ApiEnvironment = {
  id: string;
  name: string;
  url: string;
  firebaseTarget: string; // Novo campo para o destino no Firebase
};

// Este é um arquivo de exemplo.
// Você pode adicionar, remover ou editar os ambientes de API conforme sua necessidade.
export const environments: ApiEnvironment[] = [
  {
    id: '1',
    name: 'Produção DB (Exemplo)',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    firebaseTarget: 'storage/producao/',
  },
  {
    id: '2',
    name: 'Desenvolvimento DB (Exemplo)',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    firebaseTarget: 'storage/desenvolvimento/',
  },
  {
    id: '3',
    name: 'API de Teste (Falha)',
    url: 'https://api.example.com/invalid-endpoint',
    firebaseTarget: 'storage/testes_falha/',
  },
];
