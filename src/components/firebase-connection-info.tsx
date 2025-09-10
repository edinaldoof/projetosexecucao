'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { firebaseConfig } from '@/lib/firebase';
import { CheckCircle } from 'lucide-react';

export default function FirebaseConnectionInfo() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <span>Conexão com Firebase</span>
        </CardTitle>
        <CardDescription>
          As informações da sua conexão com o Firebase estão listadas abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex justify-between">
          <span className="font-medium text-muted-foreground">Project ID:</span>
          <span className="font-mono">{firebaseConfig.projectId}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-muted-foreground">App ID:</span>
          <span className="font-mono">{firebaseConfig.appId}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-muted-foreground">Storage Bucket:</span>
          <span className="font-mono">{firebaseConfig.storageBucket}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-muted-foreground">API Key:</span>
          <span className="font-mono">************</span>
        </div>
      </CardContent>
    </Card>
  );
}
