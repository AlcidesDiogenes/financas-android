import { runWithRollback } from '../utils/runWithRollback';

describe('runWithRollback', () => {
  it('executa todas as etapas em ordem quando nada falha', async () => {
    const log: string[] = [];
    await runWithRollback([
      { run: async () => log.push('a'), undo: async () => log.push('desfaz-a') },
      { run: async () => log.push('b'), undo: async () => log.push('desfaz-b') },
    ]);
    expect(log).toEqual(['a', 'b']);
  });

  it('desfaz as etapas concluídas, em ordem inversa, e repassa o erro', async () => {
    const log: string[] = [];
    await expect(
      runWithRollback([
        { run: async () => log.push('a'), undo: async () => log.push('desfaz-a') },
        { run: async () => log.push('b'), undo: async () => log.push('desfaz-b') },
        {
          run: async () => {
            throw new Error('armazenamento cheio');
          },
          undo: async () => log.push('desfaz-c'),
        },
      ])
    ).rejects.toThrow('armazenamento cheio');

    // A etapa que falhou não é desfeita (não chegou a acontecer)
    expect(log).toEqual(['a', 'b', 'desfaz-b', 'desfaz-a']);
  });

  it('continua desfazendo mesmo se um desfazer falhar', async () => {
    const log: string[] = [];
    await expect(
      runWithRollback([
        { run: async () => log.push('a'), undo: async () => log.push('desfaz-a') },
        {
          run: async () => log.push('b'),
          undo: async () => {
            throw new Error('falha ao desfazer');
          },
        },
        {
          run: async () => {
            throw new Error('falha');
          },
          undo: async () => undefined,
        },
      ])
    ).rejects.toThrow('falha');

    expect(log).toEqual(['a', 'b', 'desfaz-a']);
  });
});
