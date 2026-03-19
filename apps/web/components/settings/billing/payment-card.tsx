'use client';

import { CreditCard, Calendar, DollarSign, ExternalLink, Download, CheckCircle, Clock, AlertCircle, X, Edit3 } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

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
        color: 'text-theme-primary-400 dark:text-theme-primary-400',
        bgColor: 'bg-theme-primary-900/20 dark:bg-theme-primary-900/20',
        borderColor: 'border-theme-primary-700/50 dark:border-theme-primary-700/50',
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
        color: 'text-slate-600 dark:text-slate-400',
        bgColor: 'bg-slate-50 dark:bg-slate-900/20',
        borderColor: 'border-slate-200 dark:border-slate-700/50',
        icon: Clock,
        label: 'Draft'
      };
    default:
      return {
        color: 'text-slate-600 dark:text-slate-400',
        bgColor: 'bg-slate-50 dark:bg-slate-900/20',
        borderColor: 'border-slate-200 dark:border-slate-700/50',
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

export function PaymentCard({ payment }: { payment: PaymentHistoryItem }) {
  const locale = useLocale();
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const statusConfig = getStatusConfig(payment.status);
  const StatusIcon = statusConfig.icon;
  const isPaid = payment.status.toLowerCase() === 'paid';
  const isPending = payment.status.toLowerCase() === 'pending';


  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start justify-between">
        {/* Left Section - Payment Details */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4 px-2">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isPaid ? 'bg-emerald-100 dark:bg-emerald-800/50' :
              isPending ? 'bg-theme-primary-100 dark:bg-theme-primary-800/50' :
              'bg-slate-100 dark:bg-slate-700/50'
            } group-hover:scale-105 transition-transform duration-300 border border-slate-200 dark:border-slate-600/50`}>
              <CreditCard className={`w-6 h-6 ${
                isPaid ? 'text-emerald-600 dark:text-emerald-400' :
                isPending ? 'text-theme-primary-600 dark:text-theme-primary-400' :
                'text-slate-600 dark:text-slate-400'
              }`} />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">
                {payment.plan}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                {payment.description}
              </p>
              
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </span>
                
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-600/50 ">
                  {getProviderIcon(payment.paymentProvider)}
                  {payment.paymentProvider.charAt(0).toUpperCase() + payment.paymentProvider.slice(1)}
                </span>
                
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-primary-100 dark:bg-theme-primary-20 text-theme-primary-600 dark:text-theme-primary-300 text-xs font-medium rounded-full border border-theme-primary-200 dark:border-theme-primary-500">
                  {payment.billingInterval.charAt(0).toUpperCase() + payment.billingInterval.slice(1)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                <span className="font-medium">Date:</span> {formatDate(payment.date)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span>
                <span className="font-medium">Currency:</span> {payment.currency}
              </span>
            </div>
            
            {payment.invoiceNumber && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span>
                  <span className="font-medium">Invoice:</span> {payment.invoiceNumber}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Section - Amount and Actions */}
        <div className="text-right ml-6">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">
            {formatCurrencyAmount(payment.amount, payment.currency, locale)}
          </div>
          
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            {payment.billingInterval} billing
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {payment.invoiceUrl && (
              <a
                href={payment.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-theme-primary-600 dark:text-theme-primary-300 bg-theme-primary-50 dark:bg-theme-primary-20 rounded-lg hover:bg-theme-primary-100 dark:hover:bg-theme-primary-800/30 transition-colors border border-theme-primary-200 dark:border-theme-primary-500"
              >
                <ExternalLink className="w-3 h-3" />
                View Invoice
              </a>
            )}
            
            <button className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors border border-slate-200 dark:border-slate-600/50">
              <Download className="w-3 h-3" />
              Download
            </button>
            
            {/* Subscription Management Buttons - Only for LemonSqueezy */}
            {(() => {
              console.log('Checking subscription conditions:', {
                hasSubscriptionId: !!payment.subscriptionId,
                paymentProvider: payment.paymentProvider,
                isLemonSqueezy: payment.paymentProvider.toLowerCase() === 'lemonsqueezy',
                shouldShow: payment.subscriptionId && payment.paymentProvider.toLowerCase() === 'lemonsqueezy'
              });
              return payment.subscriptionId && payment.paymentProvider.toLowerCase() === 'lemonsqueezy';
            })() && (
              <>
                <button 
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200 dark:border-emerald-700/50"
                  onClick={() => {
                    console.log('Modify Plan button clicked, current state:', isModifyModalOpen);
                    setIsModifyModalOpen(true);
                    console.log('Modal should be open now');
                  }}
                >
                  <Edit3 className="w-3 h-3" />
                  Modify Plan
                </button>
                
                <button 
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-700/50"
                  onClick={() => {
                    // TODO: Implement cancel subscription logic for LemonSqueezy
                    console.log('Cancel LemonSqueezy subscription:', payment.subscriptionId);
                  }}
                >
                  <X className="w-3 h-3" />
                  Cancel Plan
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer Section */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <span className="font-medium">Payment ID:</span>
            <code className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-sm text-xs font-mono border border-slate-200 dark:border-slate-600/50">
              {payment.id.slice(-8)}
            </code>
            
            {payment.subscriptionId && (
              <>
                <span className="font-medium">Subscription:</span>
                <code className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-sm text-xs font-mono border border-slate-200 dark:border-slate-600/50">
                  {payment.subscriptionId.slice(-8)}
                </code>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium text-sm underline">
              View Details
            </button>
            
            <button className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium text-sm underline">
              Contact Support
            </button>
          </div>
        </div>
      </div> 
    </div>
  );
} 