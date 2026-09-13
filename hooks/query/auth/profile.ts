import { getProfile } from '@/services/auth/auth.service';
import { useQuery } from '@tanstack/react-query';

export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000, 
    retry: false,
  });
}