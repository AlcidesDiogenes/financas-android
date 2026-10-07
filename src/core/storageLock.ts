// Trava assíncrona por chave do AsyncStorage.
// Garante que operações de "ler -> alterar -> gravar" sobre a mesma chave rodem uma de cada vez,
// evitando que a sincronização com a nuvem sobrescreva uma alteração feita no meio dela.
// Atenção: não é reentrante. Nunca chame withStorageLock da mesma chave dentro da própria tarefa.
const chains = new Map<string, Promise<unknown>>();

export function withStorageLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const run = previous.then(task);
  chains.set(key, run.catch(() => undefined));
  return run;
}
