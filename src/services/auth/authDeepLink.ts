// Classifica os links financas:// que chegam ao app vindos dos e-mails do Supabase.
// Só o formato PKCE (?code=) é aceito para entrar na conta: o código só vira sessão no
// aparelho que pediu o e-mail. Tokens prontos (#access_token=) e token_hash funcionariam em
// qualquer aparelho, então um link gerado com a conta de outra pessoa faria login nela.

export type AuthDeepLink =
  | { kind: 'none' }
  | { kind: 'error'; isRecovery: boolean; description?: string }
  | { kind: 'code'; isRecovery: boolean; code: string }
  | { kind: 'unsupported'; isRecovery: boolean };

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

export const extractUrlParams = (url: string): Record<string, string> => {
  const params: Record<string, string> = {};

  const extractFromPart = (part: string) => {
    part.split('&').forEach((item) => {
      const eqIdx = item.indexOf('=');
      if (eqIdx !== -1) {
        const key = safeDecode(item.substring(0, eqIdx).trim());
        const val = safeDecode(item.substring(eqIdx + 1).trim());
        if (key) params[key] = val;
      }
    });
  };

  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    extractFromPart(url.substring(queryIndex + 1).split('#')[0]);
  }
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    extractFromPart(url.substring(hashIndex + 1));
  }
  return params;
};

export const parseAuthDeepLink = (url: string): AuthDeepLink => {
  const params = extractUrlParams(url);
  const path = url.split(/[?#]/)[0].toLowerCase();
  const isRecovery = params.type === 'recovery' || path.includes('reset-password');

  if (params.error || params.error_description || params.error_code) {
    return { kind: 'error', isRecovery, description: params.error_description || undefined };
  }
  if (params.code) {
    return { kind: 'code', isRecovery, code: params.code };
  }
  if (params.access_token || params.refresh_token || params.token_hash) {
    return { kind: 'unsupported', isRecovery };
  }
  // Link comum do app (sem dados de login): nada a fazer
  return { kind: 'none' };
};
