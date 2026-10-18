import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  type AndroidNotificationStatus,
  disableAndroidNotificationImport,
  enableAndroidNotificationImport,
  getAndroidNotificationStatus,
  openAndroidNotificationAccessSettings,
} from '@/lib/androidNotificationImport';

const UNAVAILABLE_STATUS: AndroidNotificationStatus = {
  available: false,
  accessGranted: false,
  enabled: false,
  pendingCount: 0,
};

export function useAndroidNotificationAccess() {
  const [status, setStatus] = useState(UNAVAILABLE_STATUS);

  const refresh = useCallback(async () => {
    const next = await getAndroidNotificationStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void refresh();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    await enableAndroidNotificationImport();
    await refresh();
  }, [refresh]);

  const disable = useCallback(async () => {
    await disableAndroidNotificationImport();
    await refresh();
  }, [refresh]);

  const openSystemSettings = useCallback(
    () => openAndroidNotificationAccessSettings(),
    [],
  );

  return { status, refresh, enable, disable, openSystemSettings };
}
