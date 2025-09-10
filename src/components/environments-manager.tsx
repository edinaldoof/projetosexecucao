'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { useSync, Environment } from '@/contexts/sync-context';
import { PlusCircle, Edit, Trash2, Settings2 } from 'lucide-react';
import EnvironmentForm from './environment-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const getScheduleText = (env: Environment) => {
  const { value, unit, days } = env.schedule;
  let unitText = '';
  switch(unit) {
    case 'seconds': unitText = value === 1 ? 'segundo' : 'segundos'; break;
    case 'minutes': unitText = value === 1 ? 'minuto' : 'minutos'; break;
    case 'hours': unitText = value === 1 ? 'hora' : 'horas'; break;
  }
  const daysText = days.length > 0 ? ` (${days.join(', ')})` : '';
  return `A cada ${value} ${unitText}${daysText}`;
}

export default function EnvironmentsManager() {
  const { state, dispatch } = useSync();
  const { toast } = useToast();
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAdd = () => {
    setEditingEnvironment(null);
    setIsFormOpen(true);
  };

  const handleEdit = (env: Environment) => {
    setEditingEnvironment(env);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'REMOVE_ENVIRONMENT', id });
    toast({
        title: "Conexão Removida",
        description: "A conexão foi removida com sucesso.",
    });
  };

  const handleFormSave = (env: Environment) => {
    if (editingEnvironment) {
      dispatch({ type: 'UPDATE_ENVIRONMENT', environment: { ...env, id: editingEnvironment.id } });
    } else {
      dispatch({ type: 'ADD_ENVIRONMENT', environment: env });
    }
    setIsFormOpen(false);
    toast({
        title: "Conexão Salva!",
        description: "Suas configurações de conexão foram salvas com sucesso.",
    });
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-primary" />
              <span>Gerenciador de Conexões</span>
            </CardTitle>
            <CardDescription>
              Adicione, edite ou remova suas conexões de sincronização. Cada conexão pode usar um projeto Firebase diferente.
            </CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <PlusCircle />
            Adicionar Conexão
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Conexão</TableHead>
                <TableHead>Firebase Project ID</TableHead>
                <TableHead>Agendamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.environments.map((env) => (
                <TableRow key={env.id}>
                  <TableCell className="font-medium">{env.name}</TableCell>
                  <TableCell className="font-mono text-sm">{env.firebaseConfig?.projectId || 'N/A'}</TableCell>
                  <TableCell>{getScheduleText(env)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(env)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remover</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Essa ação não pode ser desfeita. Isso irá remover permanentemente a conexão
                             e todos os seus dados de sincronização associados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(env.id)}>
                            Continuar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {state.environments.length === 0 && (
            <p className="text-center text-muted-foreground mt-4">
              Nenhuma conexão configurada. Adicione uma para começar.
            </p>
          )}
        </CardContent>
      </Card>
      <EnvironmentForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleFormSave}
        environment={editingEnvironment}
      />
    </>
  );
}
