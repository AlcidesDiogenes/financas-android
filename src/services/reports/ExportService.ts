import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Transaction } from '../../modules/transactions/types';
import { formatShortDate } from '../../core/utils/date';

export class ExportService {
  static async exportTransactionsToCSV(
    transactions: Transaction[],
    monthLabel: string
  ): Promise<boolean> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return false;
      }

      // Generate CSV content
      const headers = ['Data', 'Descricao', 'Tipo', 'Categoria', 'Valor (R$)', 'Observacoes'];
      const rows = transactions.map((t) => [
        `"${formatShortDate(t.date)}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.type === 'income' ? 'Receita' : 'Despesa'}"`,
        `"${t.category}"`,
        `"${t.amount.toFixed(2)}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

      const fileName = `Extrato_Financas_${monthLabel.replace(/\s+/g, '_')}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: `Exportar ${fileName}`,
        UTI: 'public.comma-separated-values-text',
      });

      return true;
    } catch {
      return false;
    }
  }
}
