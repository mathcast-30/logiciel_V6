import { useAuth, CurrentUser } from '../context/AuthContext';

export function useCurrentUser(): CurrentUser | null {
  const { user } = useAuth();
  return user;
}
