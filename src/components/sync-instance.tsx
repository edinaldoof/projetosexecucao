'use client';

import {
  CheckCircle,
  Cloud,
  HardDrive,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Database,
  Calendar,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { smartSyncNotifications } from '@/ai/flows/smart-sync-notifications';
import { useSync, SyncInstance as SyncInstanceType, Environment } from '@/contexts/sync-context';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

const dayMap: { [key: string]: number } = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

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

type SyncInstanceProps = {
  sync: SyncInstanceType;
  env: Environment;
};

const getScheduleText = (env: Environment) => {
  const { value, unit } = env.schedule;
  let unitText = '';
  switch(unit) {
    case 'seconds': unitText = value === 1 ? 'segundo' : 'segundos'; break;
    case 'minutes': unitText = value === 1 ? 'minuto' : 'minutos'; break;
    case 'hours': unitText = value === 1 ? 'hora' : 'horas'; break;
  }
  return `A cada ${value} ${unitText}`;
}

const getScheduleDaysText = (env: Environment) => {
  const { days } = env.schedule;
  if (days.length === 0) {
    return "Todos os dias";
  }
  return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
}

export default function SyncInstance({ sync, env }: SyncInstanceProps) {
  const { dispatch } = useSync();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const lastRunRef = useRef<number>(Date.now());

  const handleSync = useCallback(async () => {
    if (sync.isPaused) return;

    if (!env.firebaseConfig?.projectId || !env.url) {
      const errorMessage = "Configuração do Firebase ou URL de origem ausente. Verifique as configurações da conexão.";
      dispatch({ type: 'SYNC_ERROR', id: sync.id, error: errorMessage });
      toast({
        variant: 'destructive',
        title: `Falha na Configuração: ${env.name}`,
        description: errorMessage,
      });
      return;
    }
    
    // Use a unique app name for each initialization to avoid conflicts
    const appName = `firebase-app-${env.id}`;
    const app = getApps().find(app => app.name === appName) || initializeApp(env.firebaseConfig, appName);
    const storage = getStorage(app);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    dispatch({ type: 'START_SYNC', id: sync.id });
    lastRunRef.current = Date.now();

    try {
      // Step 1: Fetching data from the source URL
      dispatch({ type: 'UPDATE_PROGRESS', id: sync.id, progress: 25 });
      const response = await fetch(env.url, { signal });

      if (!response.ok) {
        throw new Error(`A resposta da rede não foi 'ok': ${response.statusText}`);
      }
      
      const data = await response.json();
      dispatch({ type: 'UPDATE_PROGRESS', id: sync.id, progress: 50 });

      // Step 2: Uploading data to Firebase Storage
      const storageRef = ref(storage, env.firebasePath);
      await uploadString(storageRef, JSON.stringify(data), 'raw');
      
      dispatch({ type: 'UPDATE_PROGRESS', id: sync.id, progress: 100 });
      
      dispatch({ type: 'SYNC_SUCCESS', id: sync.id });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        dispatch({ type: 'SYNC_ERROR', id: sync.id, error: 'Sincronização abortada pelo usuário.' });
      } else {
        const { enhancedMessage } = await smartSyncNotifications({ errorMessage: error.message });
        dispatch({ type: 'SYNC_ERROR', id: sync.id, error: enhancedMessage });
        toast({
          variant: 'destructive',
          title: `Falha na Sincronização: ${env.name}`,
          description: enhancedMessage,
        });
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [env, sync.id, sync.isPaused, toast, dispatch]);

 useEffect(() => {
    if (sync.isPaused) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    const { value, unit, days } = env.schedule;
    const intervalInMs = value * (unit === 'seconds' ? 1000 : unit === 'minutes' ? 60000 : 3600000);

    const checkAndRun = () => {
      const now = new Date();
      const scheduledDays = days.map(d => dayMap[d]);

      // Check if today is a scheduled day (if any are specified)
      if (scheduledDays.length > 0 && !scheduledDays.includes(now.getDay())) {
        return;
      }
      
      // Check if the interval has passed since the last run
      if (Date.now() - lastRunRef.current >= intervalInMs) {
        handleSync();
      }
    };

    // We check every second to see if a sync is due
    const timer = setInterval(checkAndRun, 1000);
    return () => clearInterval(timer);
  }, [sync.isPaused, env.schedule, handleSync]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{env.name}</span>
          <Badge
            variant={sync.isPaused ? 'destructive' : 'default'}
            className="flex items-center gap-2"
          >
            <StatusIcon status={sync.syncState} />
            {sync.isPaused ? 'Pausado' : 'Ativo'}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-4">
          <span>
          {sync.lastSync
            ? `Última sincronização em: ${new Date(sync.lastSync).toLocaleString()}`
            : 'Nenhuma sincronização realizada ainda.'}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 text-muted-foreground cursor-pointer">
                  <Calendar className="h-4 w-4" />
                  {getScheduleText(env)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getScheduleDaysText(env)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              <span className="font-medium text-foreground truncate max-w-xs">
                {env.url}
              </span>
            </div>
            <div className="flex-grow border-t border-dashed"></div>
            <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
              <span className="font-medium text-foreground truncate max-w-xs">
                {env.firebaseConfig.projectId}
              </span>
            </div>
          </div>
           <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
             <Cloud className="h-5 w-5" />
             <span className="font-mono text-xs">
                {env.firebaseConfig.storageBucket}/{env.firebasePath}
             </span>
            </div>
          <Progress value={sync.syncProgress} className="w-full" />
          <div className="flex justify-between text-sm text-gray-500">
            <span>
              {sync.syncState === 'syncing'
                ? 'Sincronizando...'
                : 'Aguardando'}
            </span>
            <span>{sync.syncProgress}%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <div className="flex justify-between w-full">
            <Button onClick={() => dispatch({ type: 'TOGGLE_PAUSE', id: sync.id })}>
              {sync.isPaused ? (
                <PlayCircle className="mr-2 h-4 w-4" />
              ) : (
                <PauseCircle className="mr-2 h-4 w-4" />
              )}
              {sync.isPaused ? 'Retomar' : 'Pausar'}
            </Button>
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={sync.syncState === 'syncing'}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Agora
            </Button>
        </div>
         <Collapsible open={isLogsOpen} onOpenChange={setIsLogsOpen} className="w-full">
            <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex justify-center items-center gap-2">
                    {isLogsOpen ? <ChevronUp/> : <ChevronDown/>}
                    <span>Logs de Sincronização</span>
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="h-64 overflow-y-auto border rounded-md p-4 mt-2">
                    <div className="space-y-4">
                    {sync.logs.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center">
                        Nenhum log para exibir.
                        </p>
                    ) : (
                        sync.logs.map(log => (
                        <div
                            key={log.id}
                            className="flex items-start gap-4 text-sm"
                        >
                            <LogIcon status={log.status} />
                            <div className="flex-grow">
                            <p className="font-medium">{log.message}</p>
                            <p className="text-gray-500">{log.timestamp}</p>
                            </div>
                        </div>
                        ))
                    )}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
      </CardFooter>
    </Card>
  );
}
