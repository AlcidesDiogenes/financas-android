// Controlador Central de Versão do Aplicativo Finanças
export const APP_VERSION_CONFIG = {
  version: '1.3.5',
  buildNumber: 7,
  releaseDate: '06/10/2026',
  environment: 'production',
  platform: 'Android',
};

export const getAppVersionString = (): string => {
  return `Versão ${APP_VERSION_CONFIG.version} (Build ${APP_VERSION_CONFIG.buildNumber})`;
};
