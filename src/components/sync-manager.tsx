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
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

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
import { environments } from '@/lib/environments';
import { smartSyncNotifications } from '@/ai/flows/smart-sync-notifications';
import { useSync } from '@/contexts/sync-context';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

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

export default function SyncManager() {
  const { state, dispatch } = useSync();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedEnv = environments.find(
    e => e.id === state.currentEnvironmentId
  );

  const handleSync = useCallback(async () => {
    if (state.isPaused) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    dispatch({ type: 'START_SYNC' });

    try {
      for (let i = 0; i <= 50; i += 10) {
        if (signal.aborted) throw new DOMException('Sincronização abortada pelo usuário.', 'AbortError');
        await new Promise(resolve => setTimeout(resolve, 200));
        dispatch({ type: 'UPDATE_PROGRESS', progress: i });
      }

      const response = await fetch(state.apiUrl, { signal });

      if (!response.ok) {
        throw new Error(`A resposta da rede não foi 'ok': ${response.statusText}`);
      }
      
      for (let i = 50; i <= 100; i += 10) {
        if (signal.aborted) throw new DOMException('Sincronização abortada pelo usuário.', 'AbortError');
        await new Promise(resolve => setTimeout(resolve, 200));
        dispatch({ type: 'UPDATE_PROGRESS', progress: i });
      }
      
      dispatch({ type: 'SYNC_SUCCESS' });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        dispatch({ type: 'SYNC_ERROR', error: error.message });
      } else {
        const { enhancedMessage } = await smartSyncNotifications({ errorMessage: error.message });
        dispatch({ type: 'SYNC_ERROR', error: enhancedMessage });
        toast({
          variant: 'destructive',
          title: 'Falha na Sincronização',
          description: enhancedMessage,
        });
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [state.apiUrl, state.isPaused, toast, dispatch]);

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

  return (
    <div className="space-y-8">
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
              {state.lastSync
                ? `Última sincronização em: ${state.lastSync.toLocaleString()}`
                : 'Nenhuma sincronização realizada ainda.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  <span className="font-medium text-foreground">
                    {selectedEnv?.name || 'API Remota'}
                  </span>
                </div>
                <div className="flex-grow border-t border-dashed"></div>
                <div className="flex items-center gap-2">
                   <Cloud className="h-5 w-5" />
                  <span className="font-medium text-foreground">
                    {selectedEnv?.firebaseTarget || 'Destino não definido'}
                  </span>
                </div>
              </div>
              <Progress value={state.syncProgress} className="w-full" />
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  {state.syncState === 'syncing'
                    ? 'Sincronizando...'
                    : 'Aguardando'}
                </span>
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
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={state.syncState === 'syncing'}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Agora
            </Button>
          </CardFooter>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Logs de Sincronização</CardTitle>
          </CardHeader>
          <CardContent className="h-64 overflow-y-auto">
            <div className="space-y-4">
              {state.logs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">
                  Nenhum log para exibir.
                </p>
              ) : (
                state.logs.map(log => (
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
          </CardContent>
        </Card>
    </div>
  );
}
