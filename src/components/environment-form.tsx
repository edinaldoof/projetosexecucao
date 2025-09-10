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
import { getApp, initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from './ui/alert-dialog';

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
  firestoreCollection: z.string().min(1, 'O nome da coleção no Firestore é obrigatório.'),
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

type TestResult = {
  status: 'success' | 'error' | 'idle';
  message: string;
};

export default function EnvironmentForm({
  isOpen,
  onOpenChange,
  onSave,
  environment,
}: EnvironmentFormProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isTestResultOpen, setIsTestResultOpen] = useState(false);
  const [sourceTest, setSourceTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [firebaseTest, setFirebaseTest] = useState<TestResult>({ status: 'idle', message: '' });

  const form = useForm<EnvironmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
      schedule: defaultSchedule,
      firestoreCollection: 'sincronizacao-dados',
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
          firestoreCollection: environment.firestoreCollection,
          firebaseConfig: environment.firebaseConfig,
        });
      } else {
        form.reset({
          name: '',
          url: '',
          schedule: defaultSchedule,
          firestoreCollection: 'sincronizacao-dados',
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
    setSourceTest({ status: 'idle', message: '' });
    setFirebaseTest({ status: 'idle', message: '' });

    const data = form.getValues();
    const appName = `firebase-test-${Date.now()}`;

    // 1. Test Source URL
    try {
      const sourceResponse = await fetch(data.url, { method: 'HEAD' });
      if (!sourceResponse.ok) {
        throw new Error(`A resposta da API não foi 'ok' (Status: ${sourceResponse.statusText}). Verifique a URL e a configuração de CORS no servidor de origem.`);
      }
      setSourceTest({ status: 'success', message: 'Conexão com a API de origem estabelecida com sucesso.' });
    } catch (error: any) {
      setSourceTest({ status: 'error', message: `Falha ao conectar com a API de origem: ${error.message}` });
    }

    // 2. Test Firebase Connection
    let testApp;
    try {
      if (!data.firebaseConfig || !data.firebaseConfig.projectId) {
        throw new Error('Configuração do Firebase (Project ID) está incompleta.');
      }
      testApp = initializeApp(data.firebaseConfig, appName);
      const db = getFirestore(testApp);
      // We test by trying to get a non-existent document. This requires a valid authenticated connection.
      const docRef = doc(db, data.firestoreCollection, 'connection-test');
      await getDoc(docRef);
      setFirebaseTest({ status: 'success', message: 'Conexão com o Firestore estabelecida com sucesso.' });
    } catch (error: any) {
      setFirebaseTest({ status: 'error', message: `Falha na conexão com o Firestore: ${error.message}` });
    } finally {
        if (testApp) {
            await deleteApp(testApp);
        }
        setIsTesting(false);
        setIsTestResultOpen(true);
    }
  };

  const onSubmit = (data: EnvironmentFormValues) => {
    onSave({
      id: environment?.id || '', // ID will be generated in reducer for new envs
      ...data,
    });
  };

  const TestResultItem = ({ title, result }: { title: string, result: TestResult }) => (
    <div className="flex items-start gap-4 p-3 border rounded-lg bg-secondary/30">
      {result.status === 'success' && <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />}
      {result.status === 'error' && <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />}
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{result.message}</p>
      </div>
    </div>
  );

  return (
    <>
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
                name="firestoreCollection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Coleção Principal</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: usuarios" {...field} />
                    </FormControl>
                    <FormDescription>
                      Define a coleção no Firestore onde os dados serão salvos.
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
      
      <AlertDialog open={isTestResultOpen} onOpenChange={setIsTestResultOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Resultados do Teste de Conexão</AlertDialogTitle>
                <AlertDialogDescription>
                    Abaixo estão os resultados da verificação da API de origem e do destino no Firebase.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 my-4">
                <TestResultItem title="API de Origem" result={sourceTest} />
                <TestResultItem title="Destino Firebase" result={firebaseTest} />
            </div>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setIsTestResultOpen(false)}>Fechar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
