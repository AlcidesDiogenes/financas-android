export interface RollbackStep {
  run: () => Promise<unknown>;
  undo: () => Promise<unknown>;
}

// Executa gravações locais em sequência. Se uma etapa falhar, desfaz as já concluídas
// (em ordem inversa) e repassa o erro, para não deixar dados pela metade.
export async function runWithRollback(steps: RollbackStep[]): Promise<void> {
  const done: RollbackStep[] = [];
  try {
    for (const step of steps) {
      await step.run();
      done.push(step);
    }
  } catch (error) {
    for (const step of done.reverse()) {
      try {
        await step.undo();
      } catch {
        // Melhor esforço: segue desfazendo as demais etapas
      }
    }
    throw error;
  }
}
