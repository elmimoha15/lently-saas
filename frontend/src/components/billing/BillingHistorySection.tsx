/**
 * Billing History Section
 * Displays transaction history with downloadable invoices
 */

import { Loader2, Receipt, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionData } from '@/services/api.service';

interface BillingHistorySectionProps {
  transactions: TransactionData[];
  isLoading: boolean;
  isPaidSubscription: boolean;
}

export const BillingHistorySection = ({
  transactions,
  isLoading,
  isPaidSubscription,
}: BillingHistorySectionProps) => {
  return (
    <section className="card-premium">
      <h2 className="text-xl font-semibold mb-4">Billing History</h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length > 0 ? (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {isPaidSubscription
              ? 'No transactions yet. Your first invoice will appear here after payment.'
              : 'No invoices yet. Subscribe to a plan to see your billing history.'}
          </p>
        </div>
      )}
    </section>
  );
};

const TransactionRow = ({ transaction }: { transaction: TransactionData }) => {
  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">
              {formatAmount(transaction.amount, transaction.currency)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(transaction.status)}`}>
              {transaction.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{formatDate(transaction.billed_at || transaction.created_at)}</span>
            {transaction.invoice_number && (
              <>
                <span>•</span>
                <span>Invoice #{transaction.invoice_number}</span>
              </>
            )}
            {transaction.origin === 'subscription_recurring' && (
              <>
                <span>•</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Renewal
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {transaction.invoice_pdf_url && (
        <Button variant="outline" size="sm" asChild className="ml-4">
          <a
            href={transaction.invoice_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </a>
        </Button>
      )}
    </div>
  );
};
