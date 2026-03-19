"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function Newsletter() {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSuccess(true);
      setEmail("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full bg-gray-900 rounded-xl overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-linear-to-br from-blue-500/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-linear-to-tl from-blue-500/30 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-16 h-16 border border-blue-500/20 rounded-lg rotate-45"></div>
        <div className="absolute bottom-24 right-10 w-24 h-24 border border-blue-500/20 rounded-full"></div>
        <div className="absolute top-20 right-20 w-12 h-12 border border-blue-500/20 rounded-full"></div>
        <div className="absolute bottom-10 left-20 w-20 h-20 border border-blue-500/20 rounded-lg rotate-12"></div>
      </div>

      <div className="relative z-10 px-6 py-12 mx-auto text-center">
        <div className="flex flex-col items-center max-w-xl mx-auto space-y-4">
          <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase">
            {t("NEWSLETTER")}
          </span>
          <h2 className="text-3xl font-bold text-white">
            {t("JOIN_COMMUNITY")}
          </h2>
          <p className="text-gray-300">{t("SUBSCRIBE_TEXT")}</p>

          {isSuccess ? (
            <div className="w-full p-4 mt-2 bg-blue-500/20 rounded-lg">
              <p className="text-blue-300">{t("SUCCESS_MESSAGE")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full mt-2 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("EMAIL_PLACEHOLDER")}
                  required
                  className="flex-1 px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200 disabled:opacity-70"
                >
                  {isSubmitting ? t("SUBMITTING") : t("SUBSCRIBE")}
                </button>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
