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
  Eye,
  Download,
  Info,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getApp, getApps, initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import JSONPretty from 'react-json-pretty';
import { v4 as uuidv4 } from 'uuid';

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
import { useSync, SyncInstance as SyncInstanceType, Environment } from '@/contexts/sync-context';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

const dayMap: { [key: string]: number } = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const PREVIEW_ITEM_LIMIT = 20;

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

const LogIcon = ({ status }: { status: 'success' | 'error' | 'info' }) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
  }
};

type SyncInstanceProps = {
  sync: SyncInstanceType;
  env: Environment;
};

export default function SyncInstance({ sync, env }: SyncInstanceProps) {
  const { dispatch } = useSync();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [lastFetchedData, setLastFetchedData] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const lastRunRef = useRef<number | null>(null);

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

  const handleSync = useCallback(async (isManual: boolean = false) => {
    if (sync.isPaused && !isManual) return;
    if (sync.syncState === 'syncing') return; // Prevent multiple concurrent syncs

    if (!env.firebaseConfig?.projectId || !env.url) {
      const errorMessage = "Configuração do Firebase ou URL de origem ausente. Verifique as configurações da conexão.";
      dispatch({ type: 'SYNC_ERROR', id: sync.id, error: errorMessage });
      return;
    }
    
    // Initialize or get the existing app instance to avoid re-initialization errors.
    const appName = `firebase-app-${env.id}`;
    let app;
    if (!getApps().some(app => app.name === appName)) {
        app = initializeApp(env.firebaseConfig, appName);
    } else {
        app = getApp(appName);
    }
    const db = getFirestore(app);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    dispatch({ type: 'START_SYNC', id: sync.id });
    lastRunRef.current = Date.now();

    try {
      dispatch({ type: 'ADD_LOG', id: sync.id, log: { status: 'info', message: 'Iniciando busca de dados na API de origem...' } });
      dispatch({ type: 'UPDATE_PROGRESS', id: sync.id, progress: 10 });
      const response = await fetch(env.url, { signal });
      dispatch({ type: 'UPDATE_PROGRESS', id: sync.id, progress: 25 });

      if (!response.ok) {
        throw new Error(`A resposta da rede não foi 'ok': ${response.statusText}`);
      }
      
      const data = await response.json();
      // Store full data for download
      setLastFetchedData(data);
      
      // Create and store truncated data for preview
      if (Array.isArray(data) && data.length > PREVIEW_ITEM_LIMIT) {
        setPreviewData(data.slice(0, PREVIEW_ITEM_LIMIT));
      } else {
        setPreviewData(data);
      }

      dispatch({ type: 'ADD_LOG', id: sync.id, log: { status: 'success', message: 'Dados JSON recebidos com sucesso.' } });
      
      if (!Array.isArray(data)) {
        throw new Error("Os dados recebidos da API não são um array. A sincronização com o Firestore requer um array de objetos.");
      }
      
      const totalItems = data.length;
      dispatch({ type: 'ADD_LOG', id: sync.id, log: { status: 'info', message: `Sincronizando ${totalItems} registros para a coleção '${env.firestoreCollection}'...` } });

      for (const [index, item] of data.entries()) {
         if (signal.aborted) throw new Error('Sincronização abortada.');
        if (typeof item !== 'object' || item === null) {
          dispatch({ type: 'ADD_LOG', id: sync.id, log: { status: 'error', message: `Item inválido encontrado no índice ${index}. Ignorando.` } });
          continue;
        }

        const docId = item.id ? String(item.id) : uuidv4();
        const docRef = doc(db, env.firestoreCollection, docId);
        
        await setDoc(docRef, item, { merge: true });

        const progress = 25 + Math.round(((index + 1) / totalItems) * 75);
        dispatch({ type: 'UPDATE_PROGRESS', id: sync.id, progress });
      }

      dispatch({ type: 'ADD_LOG', id: sync.id, log: { status: 'success', message: `Sincronização de ${totalItems} registros concluída.` } });
      dispatch({ type: 'SYNC_SUCCESS', id: sync.id });

    } catch (error: any) {
       const errorMessage = error.name === 'AbortError' ? 'Sincronização abortada pelo usuário.' : error.message;
       dispatch({ type: 'SYNC_ERROR', id: sync.id, error: errorMessage });
    } finally {
      abortControllerRef.current = null;
    }
  }, [env, sync.id, sync.isPaused, sync.syncState, dispatch]);

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
      const scheduledDays = days.length > 0 ? days.map(d => dayMap[d]) : [0,1,2,3,4,5,6];

      if (!scheduledDays.includes(now.getDay())) {
        return;
      }
      
      const lastRun = lastRunRef.current ?? (Date.now() - intervalInMs);
      if (Date.now() - lastRun >= intervalInMs) {
        handleSync();
      }
    };

    const timer = setInterval(checkAndRun, 1000);
    return () => clearInterval(timer);
  }, [sync.isPaused, env.schedule, handleSync]);

  const isPreviewTruncated = Array.isArray(lastFetchedData) && lastFetchedData.length > PREVIEW_ITEM_LIMIT;

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
                {sync.isPaused ? 'Pausado' : sync.syncState === 'syncing' ? 'Sincronizando' : 'Ativo'}
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
                    Coleção: {env.firestoreCollection}
                </span>
            </div>

          <Progress value={sync.syncProgress} className="w-full" />
          <div className="flex justify-between text-sm text-gray-500">
            <span>
              {sync.syncState === 'syncing'
                ? 'Sincronizando...'
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

                    {isPreviewTruncated && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Visualização Parcial</AlertTitle>
                        <AlertDescription>
                          Apenas os primeiros {PREVIEW_ITEM_LIMIT} de {lastFetchedData.length} registros estão sendo exibidos para evitar travamentos. O arquivo de download contém todos os dados.
                        </AlertDescription>
                      </Alert>
                    )}

                    <ScrollArea className="flex-grow border rounded-md p-1 bg-secondary/50">
                       <JSONPretty data={previewData} mainStyle="padding:1em" valueStyle="font-size:1.1em" />
                    </ScrollArea>
                    <DialogFooter>
                        <Button onClick={handleDownloadJson}>
                            <Download />
                            Baixar JSON Completo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => handleSync(true)}
              disabled={sync.syncState === 'syncing'}
              className="w-full"
            >
              <RefreshCw />
              Sincronizar Agora
            </Button>
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
                        sync.logs.map((log) => (
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

    