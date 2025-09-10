'use client';

import FirebaseConnectionInfo from './firebase-connection-info';

export default function SettingsManager() {
  // As configurações de instância foram movidas para a página principal
  // Esta página agora pode ser usada para configurações globais do aplicativo
  return (
    <div className="space-y-8">
      <FirebaseConnectionInfo />
    </div>
  );
}
