import { NativeModules, Platform } from 'react-native';
import type { AndroidBankAlert } from './androidBankAlertFilter';
export type { AndroidBankAlert } from './androidBankAlertFilter';
export { isPotentialAndroidBankAlert } from './androidBankAlertFilter';

export interface AndroidNotificationStatus {
  available: boolean;
  accessGranted: boolean;
  enabled: boolean;
  pendingCount: number;
}

interface AndroidNotificationBridge {
  getStatus(): Promise<Omit<AndroidNotificationStatus, 'available'>>;
  setEnabled(enabled: boolean): Promise<void>;
  openSettings(): Promise<void>;
  getPendingAlerts(): Promise<AndroidBankAlert[]>;
  acknowledgeAlerts(ids: string[]): Promise<void>;
}

const bridge = NativeModules.LedgerNotificationAccess as AndroidNotificationBridge | undefined;

export function isAndroidNotificationImportAvailable(): boolean {
  return Platform.OS === 'android' && !!bridge;
}

export async function getAndroidNotificationStatus(): Promise<AndroidNotificationStatus> {
  if (!isAndroidNotificationImportAvailable() || !bridge) {
    return { available: false, accessGranted: false, enabled: false, pendingCount: 0 };
  }
  try {
    return { available: true, ...(await bridge.getStatus()) };
  } catch {
    return { available: true, accessGranted: false, enabled: false, pendingCount: 0 };
  }
}

export async function enableAndroidNotificationImport(): Promise<void> {
  if (!bridge || !isAndroidNotificationImportAvailable()) {
    throw new Error('Automatic bank alert import requires an installed Android build.');
  }
  await bridge.setEnabled(true);
  const status = await bridge.getStatus();
  if (!status.accessGranted) await bridge.openSettings();
}

export async function disableAndroidNotificationImport(): Promise<void> {
  if (!bridge || !isAndroidNotificationImportAvailable()) return;
  await bridge.setEnabled(false);
}

export async function openAndroidNotificationAccessSettings(): Promise<void> {
  if (!bridge || !isAndroidNotificationImportAvailable()) {
    throw new Error('Notification access settings are available only in an installed Android build.');
  }
  await bridge.openSettings();
}

export async function getPendingAndroidBankAlerts(): Promise<AndroidBankAlert[]> {
  if (!bridge || !isAndroidNotificationImportAvailable()) return [];
  return bridge.getPendingAlerts();
}

export async function acknowledgeAndroidBankAlerts(ids: string[]): Promise<void> {
  if (!bridge || !isAndroidNotificationImportAvailable() || ids.length === 0) return;
  await bridge.acknowledgeAlerts(ids);
}

