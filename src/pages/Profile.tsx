import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserProfile } from '@/components/profile/UserProfile';

export default function Profile() {
  return (
    <DashboardLayout>
      <UserProfile />
    </DashboardLayout>
  );
}
