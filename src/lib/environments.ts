
export type ApiEnvironment = {
  id: string;
  name: string;
  url: string;
};

// Este é um arquivo de exemplo.
// Você pode adicionar, remover ou editar os ambientes de API conforme sua necessidade.
export const environments: ApiEnvironment[] = [
  {
    id: '1',
    name: 'Produção DB (Exemplo)',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
  },
  {
    id: '2',
    name: 'Desenvolvimento DB (Exemplo)',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
  },
  {
    id: '3',
    name: 'API de Teste (Falha)',
    url: 'https://api.example.com/invalid-endpoint',
  },
];
