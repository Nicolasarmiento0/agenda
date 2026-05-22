import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { UnifiedCalendar } from '../../../../components/calendar/UnifiedCalendar';
import { useBusiness } from '../../../../context/BusinessContext';

export default function ClientAgendaScreen() {
  const { id: businessIdParam } = useLocalSearchParams<{ id: string }>();
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id ?? businessIdParam;

  return <UnifiedCalendar role="client" businessId={businessId} />;
}
