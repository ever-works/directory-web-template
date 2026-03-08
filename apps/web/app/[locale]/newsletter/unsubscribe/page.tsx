"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { unsubscribeFromNewsletter } from "../actions";
import { ActionState } from "@/lib/auth/middleware";
import { useTranslations } from "next-intl";

export default function UnsubscribePage() {
  const t = useTranslations("newsletter");
  const [isSuccess, setIsSuccess] = useState(false);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    unsubscribeFromNewsletter,
    {}
  );

  useEffect(() => {
    if (state.success) {
      setIsSuccess(true);
    }
  }, [state]);

  const handleFormAction = async (formData: FormData) => {
    return formAction(formData);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border dark:border-gray-800 shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {t("UNSUBSCRIBED_SUCCESSFULLY") || "Unsubscribed Successfully"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t("UNSUBSCRIBE_CONFIRMATION") || "You have been successfully unsubscribed from our newsletter. You will no longer receive updates from us."}
              </p>
              <Link
                href="/"
                className="inline-block bg-th-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-th-primary-hover transition-colors"
              >
                {t("BACK_TO_HOME") || "Back to Home"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border dark:border-gray-800 shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t("UNSUBSCRIBE_FROM_NEWSLETTER") || "Unsubscribe from Newsletter"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t("UNSUBSCRIBE_DESCRIPTION") || "Enter your email address to unsubscribe from our newsletter."}
            </p>
          </div>

          <form action={handleFormAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t("EMAIL_ADDRESS") || "Email Address"}
              </label>
              <input
                type="email"
                name="email"
                placeholder={t("ENTER_YOUR_EMAIL") || "Enter your email"}
                disabled={pending}
                className="w-full px-4 py-2 border-gray-300 rounded-lg border-2 focus:border-th-primary disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>

            {state?.error && (
              <div className="text-red-500 text-sm">{state.error}</div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending 
                ? (t("UNSUBSCRIBING") || "Unsubscribing...") 
                : (t("UNSUBSCRIBE") || "Unsubscribe")
              }
            </button>
          </form>

          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-th-primary hover:text-th-primary-hover text-sm font-medium"
            >
              {t("BACK_TO_HOME") || "Back to Home"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 