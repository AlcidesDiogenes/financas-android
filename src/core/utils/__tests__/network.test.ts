import { checkInternetConnectivity } from '../network';

describe('checkInternetConnectivity', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retorna true quando o endpoint responde com status 204 ou 200', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      status: 204,
    } as Response);

    const result = await checkInternetConnectivity(1000);
    expect(result).toBe(true);
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
  });

  it('retorna false quando as requisições falham (offline)', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));

    const result = await checkInternetConnectivity(100);
    expect(result).toBe(false);
  });

  it('tenta o fallback quando o primeiro endpoint falha e retorna true se o fallback funcionar', async () => {
    let callCount = 0;
    (globalThis as any).fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('DNS Failure'));
      }
      return Promise.resolve({ status: 200 } as Response);
    });

    const result = await checkInternetConnectivity(500);
    expect(result).toBe(true);
    expect(callCount).toBe(2);
  });
});
