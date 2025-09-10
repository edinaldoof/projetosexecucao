'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Environment } from '@/contexts/sync-context';

const formSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  url: z.string().url('Por favor, insira uma URL válida.'),
  firebaseTarget: z.string().min(1, 'O destino no Firebase é obrigatório.'),
  syncInterval: z.coerce.number().int().positive('O intervalo deve ser um número positivo de segundos.'),
});

type EnvironmentFormValues = z.infer<typeof formSchema>;

type EnvironmentFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (environment: Environment) => void;
  environment: Environment | null;
};

export default function EnvironmentForm({
  isOpen,
  onOpenChange,
  onSave,
  environment,
}: EnvironmentFormProps) {
  const form = useForm<EnvironmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
      firebaseTarget: '',
      syncInterval: 30,
    },
  });

  useEffect(() => {
    if (environment) {
      form.reset({
        name: environment.name,
        url: environment.url,
        firebaseTarget: environment.firebaseTarget,
        syncInterval: environment.syncInterval / 1000, // Convert ms to seconds for display
      });
    } else {
      form.reset({
        name: '',
        url: '',
        firebaseTarget: '',
        syncInterval: 30,
      });
    }
  }, [environment, form, isOpen]);

  const onSubmit = (data: EnvironmentFormValues) => {
    onSave({
      id: environment?.id || '', // ID will be generated in reducer for new envs
      ...data,
      syncInterval: data.syncInterval * 1000, // Convert seconds to ms for storage
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{environment ? 'Editar Conexão' : 'Adicionar Nova Conexão'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da conexão de sincronização.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conexão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Banco de Dados de Produção" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem (URL de Consulta)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://sua-api.com/dados" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firebaseTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino no Firebase</FormLabel>
                  <FormControl>
                    <Input placeholder="storage/producao/" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="syncInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo de Sincronização (segundos)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                </Button>
                <Button type="submit">Salvar Conexão</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
