/** Never send connection credentials to loggers, even if they do not redact fields. */
export function connectionUrlForLog(raw: string): string {
  try {
    const relative = raw.startsWith('/');
    const url = relative ? new URL(raw, 'http://local.invalid') : new URL(raw);
    if (!['ws:', 'wss:', 'http:', 'https:'].includes(url.protocol)) return '[invalid URL]';
    // Keep only the endpoint. ALL query values, userinfo and fragments are omitted;
    // this also protects differently cased/encoded or vendor-specific token keys.
    return relative ? url.pathname : `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return '[invalid URL]';
  }
}

export function connectionErrorForLog(error: unknown, ...secrets: string[]): string {
  let text = error instanceof Error ? error.message : String(error);
  text = text.replace(/\b(?:wss?|https?):\/\/[^\s<>"']+/gi, connectionUrlForLog);
  const sensitive = new Set(secrets);
  for (const value of secrets) {
    try {
      const url = new URL(value);
      sensitive.add(decodeURIComponent(url.username));
      sensitive.add(decodeURIComponent(url.password));
      for (const item of url.searchParams.values()) sensitive.add(item);
    } catch { /* Non-URL secrets are redacted exactly below. */ }
  }
  for (const secret of sensitive) {
    if (!secret) continue;
    for (const value of new Set([secret, encodeURIComponent(secret)])) {
      text = text.split(value).join('[redacted]');
    }
  }
  return text.replace(/((?:access_token|token|api[_-]?key|authorization|password)=)[^\s&#"']+/gi, '$1[redacted]');
}
