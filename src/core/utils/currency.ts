export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

export const parseCurrencyInput = (text: string): number => {
  const clean = text.replace(/[^0-9]/g, '');
  if (!clean) return 0;
  return parseFloat(clean) / 100;
};
