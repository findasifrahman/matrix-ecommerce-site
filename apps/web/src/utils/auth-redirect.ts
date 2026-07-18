const AUTH_RETURN_PATH_KEY = 'matrix_auth_return_path';

export function isSafeRedirectPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

export function rememberAuthReturnPath(path: unknown) {
  if (!isSafeRedirectPath(path)) return;
  sessionStorage.setItem(AUTH_RETURN_PATH_KEY, path);
}

export function getRememberedAuthReturnPath(fallback = '/shopping') {
  const stored = sessionStorage.getItem(AUTH_RETURN_PATH_KEY);
  return isSafeRedirectPath(stored) ? stored : fallback;
}

export function clearRememberedAuthReturnPath() {
  sessionStorage.removeItem(AUTH_RETURN_PATH_KEY);
}

export function preferredAuthRedirect(queryRedirect: unknown, fallback = '/shopping') {
  if (isSafeRedirectPath(queryRedirect)) return queryRedirect;
  return getRememberedAuthReturnPath(fallback);
}

export function resolveAuthRedirect(userRoles: string[] = [], fallback = '/shopping'): string {
  if (userRoles.includes('ADMIN') || userRoles.includes('EDITOR')) return '/admin';
  if (userRoles.includes('OPS')) return '/ops/inbox';
  if (userRoles.includes('SELLER')) return '/seller';
  if (userRoles.includes('SERVICE_PROVIDER') && !userRoles.some((role) => ['ADMIN', 'OPS'].includes(role))) return '/provider';
  return fallback;
}
