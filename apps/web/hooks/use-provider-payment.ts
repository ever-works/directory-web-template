import { useConfig } from "@/app/[locale]/config";
import { useLemonSqueezyCheckouts } from "./use-lemonsqueezy-checkouts";
import { useBillingData } from "./use-billing-data";
import { useMemo } from "react";
import { PaymentProvider } from "@/lib/constants";

export function useProviderPayment() {
    const { pricing } = useConfig();
    const provider = pricing?.provider;
    const {
        subscription,
        payments,
        loading,
        refresh,
        refreshSubscription,
        refreshPayments,
        isRefreshing,
        isRefreshingSubscription,
        isRefreshingPayments
    } = useBillingData();
    
    const {
        checkouts,
        isLoading: isLoadingCheckouts,
        isError,
        error,
        updateFilters,
        refresh: refreshCheckouts,
        pagination,
        hasMore,
        nextPage,
        prevPage,
        goToPage
    } = useLemonSqueezyCheckouts({
        limit: 100
    });

    const transformedCheckouts = useMemo(() => {
        return checkouts.map((checkout) => ({
            id: `ls_${checkout.id}`,
            date: checkout.createdAt,
            amount: checkout.amount,
            currency: checkout.currency,
            plan: checkout.productName || 'Subscription',
            planId: checkout.variantName || checkout.id,
            status: checkout.status === 'active' ? 'Paid' : checkout.status,
            billingInterval: 'monthly',
            paymentProvider: 'lemonsqueezy',
            subscriptionId: checkout.checkoutId,
            description: `${checkout.productName || 'Subscription'} - ${checkout.variantName || 'Variant'}`,
            // Additional LemonSqueezy fields
            checkoutId: checkout.checkoutId,
            productName: checkout.productName,
            variantName: checkout.variantName,
            storeId: checkout.storeId,
            metadata: checkout.metadata,
            createdAt: checkout.createdAt,
            updatedAt: checkout.updatedAt,
        }));
    }, [checkouts]);

    // const allPayments = useMemo(() => {
    //     const combined = [...payments, ...transformedCheckouts];
    //     return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // }, [payments, transformedCheckouts]);

    const providerPayments = useMemo(() => {
        if (provider === PaymentProvider.STRIPE) {
            return payments;
        } else if (provider ===PaymentProvider.LEMONSQUEEZY) {
            return transformedCheckouts;
        }
        return [];
    }, [provider, payments, transformedCheckouts]);

    // Calculate statistics based on provider-specific data
    const totalSpent = useMemo(() => {
        return providerPayments.reduce((sum, payment) => sum + payment.amount, 0);
    }, [providerPayments]);

    const activePayments = useMemo(() => {
        return providerPayments.filter((p) => p.status === 'Paid' || p.status === 'active').length;
    }, [providerPayments]);

    const monthlyAverage = useMemo(() => {
        return providerPayments.length > 0 ? totalSpent / providerPayments.length : 0;
    }, [providerPayments, totalSpent]);

    // Provider-specific data
    const stripePayments = useMemo(() => {
        return payments.filter(payment => payment.paymentProvider === 'stripe');
    }, [payments]);

    const lemonSqueezyPayments = useMemo(() => {
        return transformedCheckouts;
    }, [transformedCheckouts]);

    const stripeTotal = useMemo(() => {
        return stripePayments.reduce((sum, payment) => sum + payment.amount, 0);
    }, [stripePayments]);

    const lemonSqueezyTotal = useMemo(() => {
        return lemonSqueezyPayments.reduce((sum, payment) => sum + payment.amount, 0);
    }, [lemonSqueezyPayments]);


    // Check if user has any payment history
    const hasPaymentHistory = providerPayments.length > 0;
    const hasSubscriptionHistory = subscription?.subscriptionHistory && subscription.subscriptionHistory.length > 0;

    return {
        // Provider info
        provider,
        
        // Provider-specific data (only for selected provider)
        payments: providerPayments, // Main payments array for selected provider
        
        // Provider-specific data for comparison
        stripePayments,
        lemonSqueezyPayments,
        stripeTotal,
        lemonSqueezyTotal,
        
        // Statistics
        totalSpent,
        activePayments,
        monthlyAverage,
        totalPayments: providerPayments.length,
        
        // Subscription data
        subscription,
        
        // Loading states
        loading: loading || isLoadingCheckouts,
        isLoadingCheckouts,
        isError,
        error,
        
        // Actions
        refresh,
        refreshSubscription,
        refreshPayments,
        refreshCheckouts,
        updateFilters,
        
        // Pagination
        pagination,
        hasMore,
        nextPage,
        prevPage,
        goToPage,
        
        // States
        isRefreshing,
        isRefreshingSubscription,
        isRefreshingPayments,
        hasPaymentHistory,
        hasSubscriptionHistory,

        
    };
}