const accessToken = (process.env.E2E_ACCESS_TOKEN || '').trim();

export function withAccessToken(pathname = '/') {
  if (!accessToken) {
    return pathname;
  }
  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}access_token=${encodeURIComponent(accessToken)}`;
}
