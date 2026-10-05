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
