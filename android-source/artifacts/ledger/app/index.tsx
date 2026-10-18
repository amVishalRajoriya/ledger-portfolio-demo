import React from 'react';
import { Redirect } from 'expo-router';
import { useLedger } from '@/context/LedgerContext';

export default function IndexRoute() {
  const { hasCompletedOnboarding } = useLedger();
  return <Redirect href={hasCompletedOnboarding ? '/(tabs)' : '/onboarding'} />;
}
