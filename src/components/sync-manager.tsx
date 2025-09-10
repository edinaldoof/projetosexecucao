
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  CheckCircle,
  Clock,
  Cloud,
  HardDrive,
  PauseCircle,
  PlayCircle,
  Power,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { environments, type ApiEnvironment } from '@/lib/environments';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

type LogEntry = {
  id: number;
  message: string;
  status: 'success' | 'error';
  timestamp: string;
};

type State = {
  isPaused: boolean;
  syncState: SyncState;
  syncInterval: number;
  lastSync?: Date;
  syncProgress: number;
  logs: LogEntry[];
  apiUrl: string;
  currentEnvironmentId: string;
};

type Action =
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'START_SYNC' }
  | { type: 'SYNC_SUCCESS' }
  | { type: 'SYNC_ERROR'; error: string }
  | { type: 'UPDATE_PROGRESS'; progress: number }
  | { type: 'SET_INTERVAL'; interval: number }
  | { type: 'SET_API_URL'; url: string }
  | { type: 'SET_ENVIRONMENT'; id: string };

const initialState: State = {
  isPaused: false,
  syncState: 'idle',
  syncInterval: 5000, // 5 seconds
  syncProgress: 0,
  logs: [],
  apiUrl: environments.find(e => e.id === '1')?.url || '',
  currentEnvironmentId: '1',
};

function getIntervalInMs(value: string, unit: 'seconds' | 'minutes' | 'hours') {
  const numValue = parseInt(value, 10);
  switch (unit) {
    case 'seconds':
      return numValue * 1000;
    case 'minutes':
      return numValue * 60 * 1000;
    case 'hours':
      return numValue * 60 * 60 * 1000;
    default:
      return 5000;
  }
}

function getIntervalFromMs(ms: number): [string, 'seconds' | 'minutes' | 'hours'] {
  const seconds = ms / 1000;
  if (seconds < 60) return [String(seconds), 'seconds'];
  const minutes = seconds / 60;
  if (minutes < 60) return [String(minutes), 'minutes'];
  const hours = minutes / 60;
  return [String(hours), 'hours'];
}

function syncReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TOGGLE_PAUSE':
      return { ...state, isPaused: !state.isPaused };
    case 'START_SYNC':
      return { ...state, syncState: 'syncing', syncProgress: 0 };
    case 'SYNC_SUCCESS':
      return {
        ...state,
        syncState: 'success',
        lastSync: new Date(),
        syncProgress: 100,
        logs: [
          {
            id: Date.now(),
            message: 'Sincronização concluída com sucesso.',
            status: 'success',
            timestamp: new Date().toLocaleTimeString(),
          },
          ...state.logs,
        ],
      };
    case 'SYNC_ERROR':
      return {
        ...state,
        syncState: 'error',
        logs: [
          {
            id: Date.now(),
            message: `Falha na sincronização: ${action.error}`,
            status: 'error',
            timestamp: new Date().toLocaleTimeString(),
          },
          ...state.logs,
        ],
      };
    case 'UPDATE_PROGRESS':
      return { ...state, syncProgress: action.progress };
    case 'SET_INTERVAL':
      return { ...state, syncInterval: action.interval };
    case 'SET_API_URL':
      return { ...state, apiUrl: action.url };
    case 'SET_ENVIRONMENT':
      const newEnv = environments.find(e => e.id === action.id);
      return { ...state, currentEnvironmentId: action.id, apiUrl: newEnv?.url || state.apiUrl };
    default:
      return state;
  }
}

const formSchema = z.object({
  intervalValue: z.string().min(1, 'O valor deve ser maior que 0.'),
  intervalUnit: z.enum(['seconds', 'minutes', 'hours']),
  apiUrl: z.string().url('Por favor, insira uma URL válida.'),
  currentEnvironmentId: z.string(),
});

type SettingsFormData = z.infer<typeof formSchema>;

const StatusIcon = ({ status }: { status: SyncState }) => {
  switch (status) {
    case 'syncing':
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const LogIcon = ({ status }: { status: 'success' | 'error' }) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
};

export function SyncManager() {
  const [state, dispatch] = useReducer(syncReducer, initialState);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [intervalValue, intervalUnit] = getIntervalFromMs(state.syncInterval);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      intervalValue: intervalValue,
      intervalUnit: intervalUnit,
      apiUrl: state.apiUrl,
      currentEnvironmentId: state.currentEnvironmentId,
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    const newInterval = getIntervalInMs(data.intervalValue, data.intervalUnit);
    dispatch({ type: 'SET_INTERVAL', interval: newInterval });
    dispatch({ type: 'SET_API_URL', url: data.apiUrl });
    dispatch({ type: 'SET_ENVIRONMENT', id: data.currentEnvironmentId });

    toast({
      title: 'Configurações Salvas',
      description: 'Suas configurações de sincronização foram atualizadas.',
    });
  };

  const handleSync = useCallback(async () => {
    if (state.isPaused) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    dispatch({ type: 'START_SYNC' });

    try {
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        if (signal.aborted) {
          console.log('Sync aborted');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, state.syncInterval / 10));
        dispatch({ type: 'UPDATE_PROGRESS', progress: i });
      }

      const response = await fetch(state.apiUrl, { signal });
      if (signal.aborted) {
        return;
      }
      if (!response.ok) {
        throw new Error(`A resposta da rede não foi 'ok': ${response.statusText}`);
      }

      // const data = await response.json();
      dispatch({ type: 'SYNC_SUCCESS' });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        dispatch({ type: 'SYNC_ERROR', error: 'Sincronização cancelada pelo usuário.' });
      } else {
        dispatch({ type: 'SYNC_ERROR', error: error.message });
        toast({
          variant: 'destructive',
          title: 'Falha na Sincronização',
          description: error.message,
        });
      }
    }
  }, [state.apiUrl, state.isPaused, state.syncInterval, toast]);

  useEffect(() => {
    if (state.isPaused) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    const timer = setInterval(handleSync, state.syncInterval);
    return () => clearInterval(timer);
  }, [state.isPaused, state.syncInterval, handleSync]);
  
  const selectedEnv = environments.find(e => e.id === state.currentEnvironmentId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status da Sincronização</span>
              <Badge
                variant={state.isPaused ? 'destructive' : 'default'}
                className="flex items-center gap-2"
              >
                <StatusIcon status={state.syncState} />
                {state.isPaused ? 'Pausado' : 'Ativo'}
              </Badge>
            </CardTitle>
            <CardDescription>
              {state.lastSync ? `Última sincronização em: ${state.lastSync.toLocaleString()}` : 'Nenhuma sincronização realizada ainda.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <HardDrive className="h-6 w-6 text-gray-500" />
                <span className="font-medium">Origem</span>
                <div className="flex-grow border-t border-dashed"></div>
                <span className="font-medium">{selectedEnv?.name || 'API Remota'}</span>
                <Cloud className="h-6 w-6 text-gray-500" />
              </div>
              <Progress value={state.syncProgress} className="w-full" />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{state.syncState === 'syncing' ? 'Sincronizando...' : 'Aguardando'}</span>
                <span>{state.syncProgress}%</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}>
              {state.isPaused ? (
                <PlayCircle className="mr-2 h-4 w-4" />
              ) : (
                <PauseCircle className="mr-2 h-4 w-4" />
              )}
              {state.isPaused ? 'Retomar' : 'Pausar'}
            </Button>
            <Button variant="outline" onClick={handleSync} disabled={state.syncState === 'syncing'}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Agora
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="currentEnvironmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ambiente do Banco de Dados</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const newEnv = environments.find(e => e.id === value);
                          if (newEnv) {
                            form.setValue('apiUrl', newEnv.url);
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um ambiente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {environments.map(env => (
                            <SelectItem key={env.id} value={env.id}>
                              {env.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do GET de Consulta</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.example.com/data" {...field} readOnly/>
                      </FormControl>
                      <FormDescription>
                        Esta é a URL que será consultada.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="intervalValue"
                    render={({ field }) => (
                      <FormItem>
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
                    name="intervalUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Salvar Configurações
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Logs de Sincronização</CardTitle>
          </CardHeader>
          <CardContent className="h-64 overflow-y-auto">
            <div className="space-y-4">
              {state.logs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">Nenhum log para exibir.</p>
              ) : (
                state.logs.map(log => (
                  <div key={log.id} className="flex items-start gap-4 text-sm">
                    <LogIcon status={log.status} />
                    <div className="flex-grow">
                      <p className="font-medium">{log.message}</p>
                      <p className="text-gray-500">{log.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
