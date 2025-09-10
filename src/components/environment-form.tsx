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
import { Separator } from './ui/separator';

const formSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  url: z.string().url('Por favor, insira uma URL válida.'),
  syncInterval: z.coerce.number().int().positive('O intervalo deve ser um número positivo de segundos.'),
  firebasePath: z.string().min(1, 'O caminho de destino no Storage é obrigatório.'),
  firebaseConfig: z.object({
      apiKey: z.string().min(1, "API Key é obrigatória."),
      authDomain: z.string().min(1, "Auth Domain é obrigatório."),
      projectId: z.string().min(1, "Project ID é obrigatório."),
      storageBucket: z.string().min(1, "Storage Bucket é obrigatório."),
      messagingSenderId: z.string().min(1, "Messaging Sender ID é obrigatório."),
      appId: z.string().min(1, "App ID é obrigatório."),
  })
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
      syncInterval: 30,
      firebasePath: 'storage/data/',
      firebaseConfig: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      }
    },
  });

  useEffect(() => {
    if (environment) {
      form.reset({
        name: environment.name,
        url: environment.url,
        syncInterval: environment.syncInterval / 1000,
        firebasePath: environment.firebasePath,
        firebaseConfig: environment.firebaseConfig,
      });
    } else {
      form.reset({
        name: '',
        url: '',
        syncInterval: 30,
        firebasePath: 'storage/data/',
        firebaseConfig: {
            apiKey: '',
            authDomain: '',
            projectId: '',
            storageBucket: '',
            messagingSenderId: '',
            appId: '',
        }
      });
    }
  }, [environment, form, isOpen]);

  const onSubmit = (data: EnvironmentFormValues) => {
    onSave({
      id: environment?.id || '', // ID will be generated in reducer for new envs
      ...data,
      syncInterval: data.syncInterval * 1000, // Convert seconds to ms
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{environment ? 'Editar Conexão' : 'Adicionar Nova Conexão'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da conexão de sincronização, incluindo as credenciais do projeto Firebase de destino.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <h3 className="text-lg font-medium">Configuração da Origem</h3>
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

            <Separator className="my-6" />
            <h3 className="text-lg font-medium">Configuração do Firebase (Destino)</h3>
             <FormField
              control={form.control}
              name="firebasePath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caminho no Storage</FormLabel>
                  <FormControl>
                    <Input placeholder="caminho/para/salvar/dados.json" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firebaseConfig.projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firebaseConfig.appId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firebaseConfig.storageBucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Bucket</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="firebaseConfig.apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="firebaseConfig.authDomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auth Domain</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="firebaseConfig.messagingSenderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaging Sender ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
