import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncQueue } from '../SyncQueue';

describe('SyncQueue', () => {
  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date('2026-10-08T12:00:00.000Z'));
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('guarda uma única entrada por item, com a operação mais nova', async () => {
    await SyncQueue.enqueue('transactions', 'tx-1', 'upsert');
    await SyncQueue.enqueue('transactions', 'tx-1', 'delete');
    await SyncQueue.enqueue('budgets', 'tx-1', 'upsert'); // mesmo id em outra tabela é outro item

    const all = await SyncQueue.getAll();
    expect(all).toHaveLength(2);
    expect(all.find((e) => e.table === 'transactions')?.op).toBe('delete');
  });

  it('removeSent não apaga uma entrada substituída durante o envio', async () => {
    await SyncQueue.enqueue('transactions', 'tx-1', 'upsert');
    const sentSnapshot = await SyncQueue.getAll();

    // Enquanto o envio acontecia, o usuário alterou o item de novo
    jest.setSystemTime(new Date('2026-10-08T12:00:01.000Z'));
    await SyncQueue.enqueue('transactions', 'tx-1', 'upsert');

    await SyncQueue.removeSent(sentSnapshot);
    const remaining = await SyncQueue.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].queuedAt).toBe('2026-10-08T12:00:01.000Z');
  });

  it('removeSent remove a entrada enviada que não mudou', async () => {
    await SyncQueue.enqueue('goals', 'g-1', 'upsert');
    await SyncQueue.removeSent(await SyncQueue.getAll());
    expect(await SyncQueue.count()).toBe(0);
  });

  it('incrementAttempts soma tentativas só na entrada que falhou', async () => {
    await SyncQueue.enqueueMany([
      { table: 'transactions', id: 'tx-1', op: 'upsert' },
      { table: 'transactions', id: 'tx-2', op: 'upsert' },
    ]);
    const [first] = await SyncQueue.getAll();

    await SyncQueue.incrementAttempts([first]);
    await SyncQueue.incrementAttempts([first]);

    const all = await SyncQueue.getAll();
    expect(all.find((e) => e.id === first.id)?.attempts).toBe(2);
    expect(all.find((e) => e.id !== first.id)?.attempts).toBeUndefined();
  });

  it('clear esvazia a fila', async () => {
    await SyncQueue.enqueue('recurrings', 'rec-1', 'upsert');
    await SyncQueue.clear();
    expect(await SyncQueue.count()).toBe(0);
  });
});
