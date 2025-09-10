'use client';

import { useEffect, useState } from 'react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Environment, SyncSchedule } from '@/contexts/sync-context';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getStorage, ref } from 'firebase/storage';
import { Loader2 } from 'lucide-react';

const weekDays = [
  { id: 'sun', label: 'D' },
  { id: 'mon', label: 'S' },
  { id: 'tue', label: 'T' },
  { id: 'wed', label: 'Q' },
  { id: 'thu', label: 'Q' },
  { id: 'fri', label: 'S' },
  { id: 'sat', label: 'S' },
] as const;

const formSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  url: z.string().url('Por favor, insira uma URL válida.'),
  schedule: z.object({
    value: z.coerce.number().int().positive('O intervalo deve ser um número positivo.'),
    unit: z.enum(['seconds', 'minutes', 'hours']),
    days: z.array(z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])).default([]),
  }),
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

const defaultSchedule: SyncSchedule = {
  value: 30,
  unit: 'seconds',
  days: [],
};

export default function EnvironmentForm({
  isOpen,
  onOpenChange,
  onSave,
  environment,
}: EnvironmentFormProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const form = useForm<EnvironmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
      schedule: defaultSchedule,
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
    if (isOpen) {
      if (environment) {
        form.reset({
          name: environment.name,
          url: environment.url,
          schedule: environment.schedule,
          firebasePath: environment.firebasePath,
          firebaseConfig: environment.firebaseConfig,
        });
      } else {
        form.reset({
          name: '',
          url: '',
          schedule: defaultSchedule,
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
    }
  }, [environment, form, isOpen]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    const data = form.getValues();
    try {
      // 1. Test Source URL
      const sourceResponse = await fetch(data.url, { method: 'HEAD' }); // HEAD is lighter than GET
      if (!sourceResponse.ok) {
        throw new Error(`Falha ao acessar a URL de origem. Status: ${sourceResponse.statusText}`);
      }

      // 2. Test Firebase Connection
      if (!data.firebaseConfig || !data.firebaseConfig.projectId) {
          throw new Error('Configuração do Firebase incompleta.');
      }
      const appName = `firebase-test-${Date.now()}`;
      const app = initializeApp(data.firebaseConfig, appName);
      const storage = getStorage(app);
      ref(storage, data.firebasePath); // This doesn't upload, just creates a reference to validate path

      toast({
          title: "Teste Bem-Sucedido!",
          description: "A conexão com a URL de origem e o Firebase foi validada com sucesso.",
      });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Falha no Teste de Conexão",
            description: error.message || 'Ocorreu um erro desconhecido.',
        });
    } finally {
        setIsTesting(false);
    }
  };

  const onSubmit = (data: EnvironmentFormValues) => {
    onSave({
      id: environment?.id || '', // ID will be generated in reducer for new envs
      ...data,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{environment ? 'Editar Conexão' : 'Adicionar Nova Conexão'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da conexão, agendamento e credenciais do projeto Firebase de destino.
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

            <Separator className="my-6" />
            <h3 className="text-lg font-medium">Agendamento da Sincronização</h3>
             <div className="flex items-end gap-2">
                <FormField
                control={form.control}
                name="schedule.value"
                render={({ field }) => (
                    <FormItem className="flex-grow">
                    <FormLabel>Intervalo</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="schedule.unit"
                render={({ field }) => (
                    <FormItem>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Unidade" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="seconds">Segundos</SelectItem>
                        <SelectItem value="minutes">Minutos</SelectItem>
                        <SelectItem value="hours">Horas</SelectItem>
                        </SelectContent>
                    </Select>
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="schedule.days"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Dias da Semana</FormLabel>
                    <FormDescription>
                      Selecione os dias para executar a sincronização. Se nenhum for selecionado, ela rodará todos os dias.
                    </FormDescription>
                  </div>
                  <div className="flex items-center justify-around rounded-lg border p-2">
                    {weekDays.map((day) => (
                      <FormField
                        key={day.id}
                        control={form.control}
                        name="schedule.days"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={day.id}
                              className="flex flex-col items-center space-y-2"
                            >
                              <FormLabel className='font-normal'>{day.label}</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(day.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), day.id])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value !== day.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-6" />
            <h3 className="text-lg font-medium">Configuração do Firebase (Destino)</h3>
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
              name="firebasePath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caminho no Storage</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: backups/clientes/" {...field} />
                  </FormControl>
                  <FormDescription>
                    Define a pasta onde os arquivos serão salvos. Ex: 'backups/clientes/'.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className='gap-2 sm:justify-end'>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                </Button>
                <Button type="button" variant="secondary" onClick={handleTestConnection} disabled={isTesting}>
                    {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Testar Conexão
                </Button>
                <Button type="submit">Salvar Conexão</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
