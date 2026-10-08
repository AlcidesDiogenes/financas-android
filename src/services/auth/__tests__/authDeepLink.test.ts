import { extractUrlParams, parseAuthDeepLink } from '../authDeepLink';

describe('parseAuthDeepLink', () => {
  it('aceita o código PKCE de confirmação de cadastro', () => {
    expect(parseAuthDeepLink('financas://auth/confirm?code=abc-123')).toEqual({
      kind: 'code',
      isRecovery: false,
      code: 'abc-123',
    });
  });

  it('reconhece o link de recuperação de senha', () => {
    expect(parseAuthDeepLink('financas://auth/reset-password?code=xyz')).toEqual({
      kind: 'code',
      isRecovery: true,
      code: 'xyz',
    });
    expect(parseAuthDeepLink('exp://192.168.0.2:8081/--/auth/reset-password?code=xyz')).toMatchObject({
      kind: 'code',
      isRecovery: true,
    });
  });

  it('recusa tokens prontos no hash (#access_token), que funcionariam em qualquer aparelho', () => {
    const url =
      'financas://auth/confirm#access_token=TOKEN_DE_OUTRA_PESSOA&refresh_token=R&type=signup';
    expect(parseAuthDeepLink(url)).toEqual({ kind: 'unsupported', isRecovery: false });
  });

  it('recusa token_hash', () => {
    expect(parseAuthDeepLink('financas://auth/reset-password?token_hash=H&type=recovery')).toEqual({
      kind: 'unsupported',
      isRecovery: true,
    });
  });

  it('reconhece o erro enviado pelo Supabase (link expirado)', () => {
    const url =
      'financas://auth/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    expect(parseAuthDeepLink(url)).toEqual({
      kind: 'error',
      isRecovery: true,
      description: 'Email link is invalid or has expired',
    });
  });

  it('ignora links comuns do app, sem dados de login', () => {
    expect(parseAuthDeepLink('financas://')).toEqual({ kind: 'none' });
    expect(parseAuthDeepLink('financas://auth/confirm')).toEqual({ kind: 'none' });
    expect(parseAuthDeepLink('financas://algo?foo=bar')).toEqual({ kind: 'none' });
  });

  it('não marca como recuperação só porque o texto aparece num parâmetro', () => {
    expect(parseAuthDeepLink('financas://auth/confirm?code=c&next=reset-password')).toMatchObject({
      isRecovery: false,
    });
  });
});

describe('extractUrlParams', () => {
  it('lê parâmetros da query e do hash e tolera codificação inválida', () => {
    expect(extractUrlParams('financas://x?a=1&b=dois%20palavras#c=3&d=%E0%A4%A')).toEqual({
      a: '1',
      b: 'dois palavras',
      c: '3',
      d: '%E0%A4%A',
    });
  });
});
