import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Transaction } from '../../modules/transactions/types';
import { formatShortDate } from '../../core/utils/date';
import { formatCurrency } from '../../core/utils/currency';

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

  static async shareMonthlySummaryText(params: {
    monthLabel: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    topCategories: { category: string; total: number }[];
    recurringsPaidCount: number;
    recurringsPendingCount: number;
  }): Promise<boolean> {
    try {
      const {
        monthLabel,
        totalIncome,
        totalExpense,
        balance,
        topCategories,
        recurringsPaidCount,
        recurringsPendingCount,
      } = params;

      const lines = [
        `📊 *Resumo Financeiro - ${monthLabel}*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🟢 *Receitas:* ${formatCurrency(totalIncome)}`,
        `🔴 *Despesas:* ${formatCurrency(totalExpense)}`,
        `💰 *Saldo Líquido:* ${formatCurrency(balance)} ${balance >= 0 ? '✅' : '⚠️'}`,
        ``,
        `📋 *Contas Fixas Recorrentes:*`,
        `• ${recurringsPaidCount} pagas`,
        `• ${recurringsPendingCount} pendentes`,
      ];

      if (topCategories.length > 0) {
        lines.push(``, `🏷️ *Principais Gastos por Categoria:*`);
        topCategories.slice(0, 4).forEach((c) => {
          lines.push(`• ${c.category}: ${formatCurrency(c.total)}`);
        });
      }

      lines.push(``, `_Gerado pelo App de Finanças_ 📱`);

      await Share.share({
        message: lines.join('\n'),
      });
      return true;
    } catch {
      return false;
    }
  }

  static async shareHouseholdSplitText(params: {
    workspaceName: string;
    monthLabel: string;
    totalExpense: number;
    personSplits: { person: string; total: number; percentage: number }[];
    settlementSuggestion?: string;
  }): Promise<boolean> {
    try {
      const { workspaceName, monthLabel, totalExpense, personSplits, settlementSuggestion } = params;

      const lines = [
        `🤝 *Divisão de Contas da Casa - ${monthLabel}*`,
        `🏠 *Espaço:* ${workspaceName}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `💳 *Total Gasto no Mês:* ${formatCurrency(totalExpense)}`,
        ``,
        `👥 *Contribuição de Cada Um:*`,
      ];

      personSplits.forEach((p) => {
        lines.push(`• *${p.person}:* ${formatCurrency(p.total)} (${p.percentage}%)`);
      });

      if (settlementSuggestion) {
        lines.push(``, `⚖️ *Sugestão de Acerto:*`, settlementSuggestion);
      }

      lines.push(``, `_Gerado pelo App de Finanças_ 📱`);

      await Share.share({
        message: lines.join('\n'),
      });
      return true;
    } catch {
      return false;
    }
  }
}
