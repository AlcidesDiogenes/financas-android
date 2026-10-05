import { TransactionCategory } from '../../modules/transactions/types';

export interface CategoryMeta {
  name: TransactionCategory;
  icon: string;
  color: string;
}

export const CATEGORIES_META: Record<TransactionCategory, CategoryMeta> = {
  Alimentação: {
    name: 'Alimentação',
    icon: 'restaurant-outline',
    color: '#F59E0B',
  },
  Moradia: {
    name: 'Moradia',
    icon: 'home-outline',
    color: '#3B82F6',
  },
  Transporte: {
    name: 'Transporte',
    icon: 'car-outline',
    color: '#8B5CF6',
  },
  Lazer: {
    name: 'Lazer',
    icon: 'game-controller-outline',
    color: '#EC4899',
  },
  Saúde: {
    name: 'Saúde',
    icon: 'fitness-outline',
    color: '#10B981',
  },
  Educação: {
    name: 'Educação',
    icon: 'school-outline',
    color: '#06B6D4',
  },
  Assinaturas: {
    name: 'Assinaturas',
    icon: 'card-outline',
    color: '#6366F1',
  },
  Salário: {
    name: 'Salário',
    icon: 'wallet-outline',
    color: '#10B981',
  },
  Investimentos: {
    name: 'Investimentos',
    icon: 'trending-up-outline',
    color: '#14B8A6',
  },
  Extra: {
    name: 'Extra',
    icon: 'gift-outline',
    color: '#F97316',
  },
  Outros: {
    name: 'Outros',
    icon: 'ellipsis-horizontal-outline',
    color: '#64748B',
  },
};

export const getCategoryMeta = (category: TransactionCategory): CategoryMeta => {
  return CATEGORIES_META[category] || CATEGORIES_META['Outros'];
};
