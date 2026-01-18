import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore } from '@store/profileStore';

type GuardResult = {
  allowed: boolean;
  loading: boolean;
  profile: any | null;
};

/**
 * Guard per screen theo profile/role.
 * @param predicate hàm kiểm tra profile, trả true nếu được phép
 * @param fallbackRoute route để điều hướng khi không đủ quyền (mặc định Dashboard)
 */
export const useScreenGuard = (
  predicate: (profile: any | null) => boolean,
  fallbackRoute: string = 'Dashboard',
): GuardResult => {
  const navigation = useNavigation<any>();
  const { profile, status, refreshProfile } = useProfileStore();

  useEffect(() => {
    if (status === 'idle') {
      refreshProfile();
    }
  }, [status, refreshProfile]);

  const loading = status === 'idle' || status === 'loading';
  const allowed = predicate(profile);

  useEffect(() => {
    if (!loading && !allowed) {
      navigation.replace(fallbackRoute as never);
    }
  }, [loading, allowed, navigation, fallbackRoute]);

  return { allowed, loading, profile };
};
