'use client';

import EnvironmentsManager from './environments-manager';
import FirebaseConnectionInfo from './firebase-connection-info';

export default function SettingsManager() {
  return (
    <div className="space-y-8">
      <EnvironmentsManager />
      <FirebaseConnectionInfo />
    </div>
  );
}
