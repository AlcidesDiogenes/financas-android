import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account } from './types';

const ACCOUNTS_STORAGE_KEY = '@financas:accounts_v1';

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    name: 'Nubank (Conta Principal)',
    type: 'checking',
    balance: 4850.5,
    color: '#820AD1',
    icon: 'wallet-outline',
  },
  {
    id: 'acc-2',
    name: 'Dinheiro na Carteira',
    type: 'cash',
    balance: 320.0,
    color: '#10B981',
    icon: 'cash-outline',
  },
  {
    id: 'acc-3',
    name: 'Cartão Black Ultravioleta',
    type: 'credit_card',
    balance: -1450.0, // Fatura atual
    color: '#1F2937',
    icon: 'card-outline',
    creditLimit: 12000.0,
    closingDay: 25,
    dueDay: 2,
  },
  {
    id: 'acc-4',
    name: 'Reserva no Tesouro / CDI',
    type: 'investment',
    balance: 14500.0,
    color: '#0D9488',
    icon: 'trending-up-outline',
  },
];

export class AccountRepository {
  static async getAll(): Promise<Account[]> {
    try {
      const data = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!data) {
        await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
        return DEFAULT_ACCOUNTS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  }

  static async saveAll(accounts: Account[]): Promise<void> {
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }

  static async add(account: Account): Promise<Account[]> {
    const all = await this.getAll();
    const updated = [...all, account];
    await this.saveAll(updated);
    return updated;
  }
}
