import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Environment } from '@/contexts/sync-context';

export async function performSync(
  env: Environment,
  signal: AbortSignal,
  onProgress: (progress: number) => void
): Promise<any> {
  // 1. Validation
  if (!env.firebaseConfig?.projectId || !env.url) {
    throw new Error("Configuração do Firebase ou URL de origem ausente. Verifique as configurações da conexão.");
  }

  // 2. Firebase Initialization
  const appName = `firebase-app-${env.id}`;
  const app = getApps().find(app => app.name === appName) || initializeApp(env.firebaseConfig, appName);
  const db = getFirestore(app);

  // 3. Fetch Data
  onProgress(10); // Initial progress
  const response = await fetch(env.url, { signal });
  if (signal.aborted) {
      throw new Error('Sincronização abortada.');
  }
  onProgress(25); // Fetched

  if (!response.ok) {
    throw new Error(`A resposta da rede não foi 'ok': ${response.statusText}`);
  }

  const data = await response.json();
  if (signal.aborted) {
      throw new Error('Sincronização abortada.');
  }

  // 4. Validate Data format
  if (!Array.isArray(data)) {
    throw new Error("Os dados recebidos da API não são um array. A sincronização com o Firestore requer um array de objetos.");
  }

  // 5. Sync to Firestore
  const totalItems = data.length;
  if (totalItems === 0) {
      onProgress(100);
      return [];
  }

  for (const [index, item] of data.entries()) {
     if (signal.aborted) {
         throw new Error('Sincronização abortada.');
     }
    if (typeof item !== 'object' || item === null) {
      console.warn(`Item inválido encontrado no índice ${index}. Ignorando.`);
      continue; // Skip invalid items
    }

    // Use item's 'id' field or generate a new UUID
    const docId = item.id ? String(item.id) : uuidv4();
    const docRef = doc(db, env.firestoreCollection, docId);

    await setDoc(docRef, item, { merge: true });

    // Calculate and report progress (from 25% to 100%)
    const progress = 25 + Math.round(((index + 1) / totalItems) * 75);
    onProgress(progress);
  }

  onProgress(100);
  return data;
}
