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
  Eye,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import JSONPretty from 'react-json-pretty';

import { performSync } from '@/lib/sync-logic';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

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
  const [lastFetchedData, setLastFetchedData] = useState<any | null>(null);
  const lastRunRef = useRef<number>(sync.lastSync ? new Date(sync.lastSync).getTime() : Date.now());

  const handleDownloadJson = () => {
    if (!lastFetchedData) return;
    const dataString = JSON.stringify(lastFetchedData, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${env.name.replace(/\s+/g, '_')}_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSync = useCallback(async () => {
    if (sync.isPaused) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    dispatch({ type: 'START_SYNC', id: sync.id });
    lastRunRef.current = Date.now();

    try {
      dispatch({ type: 'UPDATE_PROGRESS', id: sync.id, progress: 50 });
      const data = await performSync(env, signal);
      setLastFetchedData(data);
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

      if (scheduledDays.length > 0 && !scheduledDays.includes(now.getDay())) {
        return;
      }
      
      if (Date.now() - lastRunRef.current >= intervalInMs) {
        handleSync();
      }
    };

    const timer = setInterval(checkAndRun, 1000);
    return () => clearInterval(timer);
  }, [sync.isPaused, env.schedule, handleSync]);

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div>
                 <CardTitle className="text-2xl font-bold text-primary mb-1">{env.name}</CardTitle>
                <CardDescription>
                  {sync.lastSync
                    ? `Última sincronização: ${new Date(sync.lastSync).toLocaleString()}`
                    : 'Nenhuma sincronização realizada ainda.'}
                </CardDescription>
            </div>
            <Badge
                variant={sync.isPaused ? 'destructive' : 'default'}
                className="flex items-center gap-2"
            >
                <StatusIcon status={sync.syncState} />
                {sync.isPaused ? 'Pausado' : 'Ativo'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                <div className="flex items-center gap-3 text-sm">
                    <HardDrive className="h-5 w-5 text-muted-foreground" />
                    <span className="font-mono text-xs truncate max-w-[200px] sm:max-w-xs" title={env.url}>
                        {env.url}
                    </span>
                </div>
                 <div className="text-primary font-bold text-lg">→</div>
                <div className="flex items-center gap-3 text-sm">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <span className="font-mono text-xs truncate max-w-[200px] sm:max-w-xs" title={env.firebaseConfig.projectId}>
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
                : sync.syncState === 'error'
                ? 'Erro'
                : sync.isPaused 
                ? 'Pausado'
                : 'Aguardando agendamento'}
            </span>
            <span>{sync.syncProgress}%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <div className="grid grid-cols-3 gap-2 w-full">
            <Button onClick={() => dispatch({ type: 'TOGGLE_PAUSE', id: sync.id })} className="w-full">
              {sync.isPaused ? (
                <PlayCircle />
              ) : (
                <PauseCircle/>
              )}
              {sync.isPaused ? 'Retomar' : 'Pausar'}
            </Button>

            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={!lastFetchedData} className="w-full">
                        <Eye />
                        Visualizar Dados
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Preview dos Dados JSON</DialogTitle>
                        <DialogDescription>
                            Estes são os dados obtidos da URL de origem na última sincronização bem-sucedida.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-grow border rounded-md p-1 bg-secondary/50">
                       <JSONPretty data={lastFetchedData} mainStyle="padding:1em" valueStyle="font-size:1.1em" />
                    </ScrollArea>
                    <DialogFooter>
                        <Button onClick={handleDownloadJson}>
                            <Download />
                            Baixar JSON
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {sync.syncState === 'error' ? (
                <Button
                    variant="destructive"
                    onClick={() => dispatch({ type: 'CLEAR_ERROR', id: sync.id })}
                    className="w-full"
                >
                    <AlertTriangle />
                    Limpar Erro
                </Button>
            ) : (
                <Button
                    variant="outline"
                    onClick={handleSync}
                    disabled={sync.syncState === 'syncing'}
                    className="w-full"
                >
                    <RefreshCw />
                    Sincronizar Agora
                </Button>
            )}
        </div>
         <Collapsible open={isLogsOpen} onOpenChange={setIsLogsOpen} className="w-full">
            <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex justify-center items-center gap-2 text-sm font-normal">
                    {isLogsOpen ? <ChevronUp/> : <ChevronDown/>}
                    <span>Logs de Sincronização</span>
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="h-64 overflow-y-auto border rounded-md p-4 mt-2 bg-secondary/50">
                    <div className="space-y-4">
                    {sync.logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum log para exibir.
                        </p>
                    ) : (
                        sync.logs.map(log => (
                        <div
                            key={log.id}
                            className="flex items-start gap-4 text-sm font-mono"
                        >
                            <LogIcon status={log.status} />
                            <div className="flex-grow">
                            <p className="font-medium">{log.message}</p>
                            <p className="text-muted-foreground text-xs">{log.timestamp}</p>
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
