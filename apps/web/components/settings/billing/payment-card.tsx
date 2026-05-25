'use client';

import { CreditCard, Calendar, DollarSign, ExternalLink, Download, CheckCircle, Clock, AlertCircle, X, Edit3, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';
import { useSubscriptionActions } from '@/hooks/use-lemonsqueezy-subscription';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SOCIAL_EMAIL || 'ever@ever.works';

interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  plan: string;
  planId: string;
  status: string;
  billingInterval: string;
  paymentProvider: string;
  subscriptionId: string;
  description: string;
  invoiceUrl?: string | null;
  invoiceNumber?: string | null;
}

const formatDate = (date: string) => new Date(date).toLocaleDateString(undefined, { 
  year: 'numeric', 
  month: 'short', 
  day: 'numeric' 
});

const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return {
        color: 'text-emerald-400 dark:text-emerald-400',
        bgColor: 'bg-emerald-900/20 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-700/50 dark:border-emerald-700/50',
        icon: CheckCircle,
        label: 'Paid'
      };
    case 'pending':
      return {
        color: 'text-neutral-400 dark:text-neutral-400',
        bgColor: 'bg-neutral-100 dark:bg-white/8',
        borderColor: 'border-neutral-200 dark:border-white/8',
        icon: Clock,
        label: 'Pending'
      };
    case 'failed':
      return {
        color: 'text-red-400 dark:text-red-400',
        bgColor: 'bg-red-900/20 dark:bg-red-900/20',
        borderColor: 'border-red-700/50 dark:border-red-700/50',
        icon: AlertCircle,
        label: 'Failed'
      };
    case 'draft':
      return {
        color: 'text-neutral-600 dark:text-neutral-400',
        bgColor: 'bg-neutral-50 dark:bg-[#0a0a0a]/20',
        borderColor: 'border-neutral-200 dark:border-white/6/50',
        icon: Clock,
        label: 'Draft'
      };
    default:
      return {
        color: 'text-neutral-600 dark:text-neutral-400',
        bgColor: 'bg-neutral-50 dark:bg-[#0a0a0a]/20',
        borderColor: 'border-neutral-200 dark:border-white/6/50',
        icon: Clock,
        label: status.charAt(0).toUpperCase() + status.slice(1)
      };
  }
};

const getProviderIcon = (provider: string) => {
  switch (provider.toLowerCase()) {
    case 'stripe':
      return '💳';
    case 'paypal':
      return '🔵';
    case 'apple':
      return '🍎';
    case 'google':
      return '🔴';
    default:
      return '💳';
  }
};

export function PaymentCard({ payment, onChanged }: { payment: PaymentHistoryItem; onChanged?: () => void }) {
  const locale = useLocale();
  const [showDetails, setShowDetails] = useState(false);
  const { cancelSubscription } = useSubscriptionActions();
  const statusConfig = getStatusConfig(payment.status);
  const StatusIcon = statusConfig.icon;
  const isPaid = payment.status.toLowerCase() === 'paid';
  const isPending = payment.status.toLowerCase() === 'pending';
  const isLemonSqueezy =
    !!payment.subscriptionId && payment.paymentProvider.toLowerCase() === 'lemonsqueezy';

  const handleCancelLemonSqueezy = async () => {
    if (!window.confirm('Cancel this subscription at the end of the current billing period?')) return;
    const toastId = toast.loading('Cancelling subscription...');
    try {
      await cancelSubscription.mutateAsync({ subscriptionId: payment.subscriptionId, cancelAtPeriodEnd: true });
      toast.success('Subscription will be cancelled at the end of the period', { id: toastId });
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription', { id: toastId });
    }
  };


  return (
    <div className="bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/6 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start justify-between">
        {/* Left Section - Payment Details */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4 px-2">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isPaid ? 'bg-emerald-100 dark:bg-emerald-800/50' :
              isPending ? 'bg-neutral-100 dark:bg-white/8' :
              'bg-neutral-100 dark:bg-white/4'
            } group-hover:scale-105 transition-transform duration-300 border border-neutral-200 dark:border-white/6`}>
              <CreditCard className={`w-6 h-6 ${
                isPaid ? 'text-emerald-600 dark:text-emerald-400' :
                isPending ? 'text-neutral-500 dark:text-neutral-400' :
                'text-neutral-600 dark:text-neutral-400'
              }`} />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-neutral-800 dark:group-hover:text-white transition-colors">
                {payment.plan}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
                {payment.description}
              </p>
              
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </span>
                
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-white/4 text-neutral-600 dark:text-neutral-300 text-xs font-medium rounded-full border border-neutral-200 dark:border-white/6 ">
                  {getProviderIcon(payment.paymentProvider)}
                  {payment.paymentProvider.charAt(0).toUpperCase() + payment.paymentProvider.slice(1)}
                </span>
                
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-white/8 text-neutral-500 dark:text-neutral-300 text-xs font-medium rounded-full border border-neutral-200 dark:border-white/8">
                  {payment.billingInterval.charAt(0).toUpperCase() + payment.billingInterval.slice(1)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span>
                <span className="font-medium">Date:</span> {formatDate(payment.date)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
              <DollarSign className="w-4 h-4 text-neutral-400" />
              <span>
                <span className="font-medium">Currency:</span> {payment.currency}
              </span>
            </div>
            
            {payment.invoiceNumber && (
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                <span>
                  <span className="font-medium">Invoice:</span> {payment.invoiceNumber}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Section - Amount and Actions */}
        <div className="text-right ml-6">
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-neutral-800 dark:group-hover:text-white transition-colors">
            {formatCurrencyAmount(payment.amount, payment.currency, locale)}
          </div>
          
          <div className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
            {payment.billingInterval} billing
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {payment.invoiceUrl && (
              <a
                href={payment.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-300 bg-neutral-100 dark:bg-white/8 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/8 transition-colors border border-neutral-200 dark:border-white/8"
              >
                <ExternalLink className="w-3 h-3" />
                View Invoice
              </a>
            )}
            
            {payment.invoiceUrl && (
              <a
                href={payment.invoiceUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-white/4 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/6 transition-colors border border-neutral-200 dark:border-white/6"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            )}

            {/* Subscription Management Buttons - Only for LemonSqueezy */}
            {isLemonSqueezy && (
              <>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200 dark:border-emerald-700/50"
                >
                  <Edit3 className="w-3 h-3" />
                  Modify Plan
                </Link>

                <button
                  onClick={handleCancelLemonSqueezy}
                  disabled={cancelSubscription.isPending}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelSubscription.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  Cancel Plan
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer Section */}
      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-white/6">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-neutral-600 dark:text-neutral-400">
            <span className="font-medium">Payment ID:</span>
            <code className="bg-neutral-100 dark:bg-white/4 px-2 py-1 rounded-sm text-xs font-mono border border-neutral-200 dark:border-white/6">
              {payment.id.slice(-8)}
            </code>
            
            {payment.subscriptionId && (
              <>
                <span className="font-medium">Subscription:</span>
                <code className="bg-neutral-100 dark:bg-white/4 px-2 py-1 rounded-sm text-xs font-mono border border-neutral-200 dark:border-white/6">
                  {payment.subscriptionId.slice(-8)}
                </code>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails((v) => !v)}
              aria-expanded={showDetails}
              className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100 font-medium text-sm underline"
            >
              {showDetails ? 'Hide Details' : 'View Details'}
            </button>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Billing question — payment ${payment.id}`)}`}
              className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100 font-medium text-sm underline"
            >
              Contact Support
            </a>
          </div>
        </div>

        {showDetails && (
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500 dark:text-neutral-400">Date</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">{formatDate(payment.date)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500 dark:text-neutral-400">Amount</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatCurrencyAmount(payment.amount, payment.currency, locale)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500 dark:text-neutral-400">Status</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">{statusConfig.label}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500 dark:text-neutral-400">Provider</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">{payment.paymentProvider}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500 dark:text-neutral-400">Billing</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">{payment.billingInterval}</dd>
            </div>
            {payment.invoiceNumber && (
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500 dark:text-neutral-400">Invoice</dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100">{payment.invoiceNumber}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
}