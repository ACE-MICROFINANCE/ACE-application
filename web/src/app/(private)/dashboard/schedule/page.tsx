'use client';

import { useAuth } from '@/hooks/useAuth';
import CustomerSchedulePage from '../customer/schedule/page';
import StaffSchedulePage from '../staff/schedule/page';

export default function SchedulePage() {
  const { profile } = useAuth();
  const isStaff = profile?.actorKind === 'STAFF';

  return isStaff ? <StaffSchedulePage /> : <CustomerSchedulePage />;
}
