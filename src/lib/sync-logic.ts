import { getApp, getApps, initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';
import { Environment, SyncInstance } from '@/contexts/sync-context';

export async function performSync(
  env: Environment,
  signal: AbortSignal
): Promise<any> {
  if (!env.firebaseConfig?.projectId || !env.url) {
    throw new Error("Configuração do Firebase ou URL de origem ausente. Verifique as configurações da conexão.");
  }

  const appName = `firebase-app-${env.id}`;
  const app = getApps().find(app => app.name === appName) || initializeApp(env.firebaseConfig, appName);
  const storage = getStorage(app);

  const response = await fetch(env.url, { signal });

  if (!response.ok) {
    throw new Error(`A resposta da rede não foi 'ok': ${response.statusText}`);
  }

  const data = await response.json();

  const storageRef = ref(storage, `${env.firebasePath}/${new Date().toISOString()}.json`);
  const dataString = JSON.stringify(data, null, 2);
  await uploadString(storageRef, dataString, 'raw');

  return data;
}
