export const formatShortDate = (isoString: string): string => {
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const formatFullDate = (isoString: string): string => {
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const getCurrentMonthYear = (): { month: number; year: number; label: string } => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const label = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return {
    month,
    year,
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
};

export const getMonthLabel = (month: number, year: number): string => {
  const d = new Date(year, month - 1, 1);
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const formatToBrazilianDate = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const parseBrazilianDate = (str: string): Date | null => {
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) return null;
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
};

export const applyDateMask = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').slice(0, 8);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
};

export const applyMonthYearMask = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').slice(0, 6);
  if (cleaned.length <= 2) return cleaned;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
};

export const parseMonthYear = (str: string): { month: number; year: number } | null => {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 2) return null;
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 1900 || year > 2100) return null;
  return { month, year };
};

export const formatMonthYear = (month: number, year: number): string => {
  return `${String(month).padStart(2, '0')}/${year}`;
};


