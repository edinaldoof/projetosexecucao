'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { environments } from '@/lib/environments';
import { Link2, Database, Settings2 } from 'lucide-react';

export default function EnvironmentsManager() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" />
          <span>Gerenciador de Conexões</span>
        </CardTitle>
        <CardDescription>
          Visualize suas conexões de sincronização. Para adicionar, remover ou editar, modifique o arquivo <code className="font-mono bg-muted px-1 py-0.5 rounded">src/lib/environments.ts</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Conexão</TableHead>
              <TableHead className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Origem (URL de Consulta)
              </TableHead>
              <TableHead className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Destino (Firebase)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {environments.map((env) => (
              <TableRow key={env.id}>
                <TableCell className="font-medium">{env.name}</TableCell>
                <TableCell className="font-mono text-sm">{env.url}</TableCell>
                <TableCell className="font-mono text-sm">{env.firebaseTarget}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
