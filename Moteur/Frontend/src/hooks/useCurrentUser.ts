import { useAuth, CurrentUser, UserRole } from '../context/AuthContext';

export interface CurrentUserState {
  user: CurrentUser | null;
  role: UserRole;
}

/** Returns the current authenticated user and their role. */
export function useCurrentUser(): CurrentUserState {
  const { user } = useAuth();
  return {
    user,
    role: user?.role ?? 'operateur',
  };
}
