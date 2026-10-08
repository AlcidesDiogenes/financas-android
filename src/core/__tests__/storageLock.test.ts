import { withStorageLock } from '../storageLock';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe('withStorageLock', () => {
  it('executa tarefas da mesma chave uma de cada vez, na ordem', async () => {
    const order: string[] = [];
    const gate = deferred();

    const first = withStorageLock('chave-a', async () => {
      order.push('1-inicio');
      await gate.promise;
      order.push('1-fim');
    });
    const second = withStorageLock('chave-a', async () => {
      order.push('2');
    });

    await Promise.resolve();
    expect(order).toEqual(['1-inicio']); // a segunda espera a primeira terminar

    gate.resolve();
    await Promise.all([first, second]);
    expect(order).toEqual(['1-inicio', '1-fim', '2']);
  });

  it('tarefas de chaves diferentes não esperam uma pela outra', async () => {
    const gate = deferred();
    const blocked = withStorageLock('chave-b', () => gate.promise);
    const other = await withStorageLock('chave-c', async () => 'livre');

    expect(other).toBe('livre');
    gate.resolve();
    await blocked;
  });

  it('uma tarefa com erro não trava as seguintes', async () => {
    await expect(
      withStorageLock('chave-d', async () => {
        throw new Error('falha');
      })
    ).rejects.toThrow('falha');

    await expect(withStorageLock('chave-d', async () => 'ok')).resolves.toBe('ok');
  });
});
