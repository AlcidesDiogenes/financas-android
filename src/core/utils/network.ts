/**
 * Utilitário de diagnóstico e verificação de conectividade com a internet.
 */

/**
 * Verifica se o dispositivo possui conectividade ativa com a internet.
 * Realiza um teste ultrarrápido contra endpoints de alta disponibilidade com payload zero (204 No Content).
 */
export async function checkInternetConnectivity(timeoutMs = 2500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    // Fallback rápido alternativo caso a rota do provedor inicial falhe
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const fallbackController = new AbortController();
      fallbackTimer = setTimeout(() => fallbackController.abort(), 1500);
      const fallbackResponse = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
        method: 'GET',
        cache: 'no-store',
        signal: fallbackController.signal,
      });
      return fallbackResponse.status >= 200 && fallbackResponse.status < 400;
    } catch {
      return false;
    } finally {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    }
  } finally {
    clearTimeout(timer);
  }
}
