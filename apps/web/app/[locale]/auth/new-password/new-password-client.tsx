"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, XCircle, CheckCircle, Lock, ArrowLeft, Key, Shield } from "lucide-react";
import { useConfig } from "../../config";
import { Button, cn } from "@heroui/react";
import { Link } from "@/i18n/navigation";
import { newPasswordAction, verifyPasswordTokenAction } from "../actions";
import { useTranslations } from "next-intl";

export default function NewPasswordPageClient() {
  const config = useConfig();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = useTranslations("admin.NEW_PASSWORD_PAGE");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Password strength criteria
  const passwordCriteria = useMemo(() => {
    return [
      {
        id: "length",
        label: t("AT_LEAST_8_CHARS"),
        test: (pwd: string) => pwd.length >= 8,
      },
      {
        id: "lowercase",
        label: t("LOWERCASE_LETTER"),
        test: (pwd: string) => /[a-z]/.test(pwd),
      },
      {
        id: "uppercase",
        label: t("UPPERCASE_LETTER"),
        test: (pwd: string) => /[A-Z]/.test(pwd),
      },
      { id: "number", label: t("NUMBER"), test: (pwd: string) => /\d/.test(pwd) },
      {
        id: "special",
        label: t("SPECIAL_CHARACTER"),
        test: (pwd: string) => /[!@#$%^&*~(){}[\]|;:'",<>.?]/.test(pwd),
      },
    ];
  }, [t]);

  useEffect(() => {
    if (password) {
      const meetsCount = passwordCriteria.filter((c) =>
        c.test(password)
      ).length;
      setPasswordStrength((meetsCount / passwordCriteria.length) * 100);
    } else {
      setPasswordStrength(0);
    }
  }, [password, passwordCriteria]);

  useEffect(() => {
    let mounted = true;

    const verifyToken = async () => {
      if (!token) {
        setError(t("MISSING_RESET_TOKEN"));
        setIsTokenValid(false);
        setIsLoading(false);
        return;
      }

      try {
        const result = await verifyPasswordTokenAction(token);
        if (result.success && mounted) {
          setIsTokenValid(true);
        } else if (result.error && mounted) {
          setError(result.error);
          setIsTokenValid(false);
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error(error);

        if (mounted) {
          setIsTokenValid(false);
          setIsLoading(false);
          setError(t("ERROR_VERIFYING_TOKEN"));
        }
      }
    };

    verifyToken();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (passwordStrength < 60) {
      setError(t("CHOOSE_STRONGER_PASSWORD"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("PASSWORDS_DO_NOT_MATCH"));
      return;
    }

    const formData = new FormData(e.currentTarget);
    if (token) {
      formData.append("token", token);
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await newPasswordAction({}, formData);
      if (result.success) {
        setSuccess(true);
      } else if ("error" in result && result.error) {
        setSuccess(false);
        setError(result.error);
      }

      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setError(t("FAILED_SET_PASSWORD"));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-theme-primary/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-theme-accent/5 rounded-full blur-3xl animate-pulse-subtle animation-delay-2000" />
      </div>

      {/* Geometric decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-4 h-4 bg-theme-primary/20 rounded-full animate-bounce" />
        <div
          className="absolute top-20 right-20 w-3 h-3 bg-theme-accent/30 rounded-full animate-bounce"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute bottom-20 left-20 w-5 h-5 bg-theme-secondary/20 rounded-full animate-bounce"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Main container with modern design */}
      <div className="w-full max-w-5xl mx-auto rounded-2xl bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/20 dark:border-white/4 shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Illustration and branding side */}
          <div className="w-full lg:w-1/2 relative bg-linear-to-br from-theme-primary/5 via-theme-accent/5 to-theme-secondary/5 p-8 lg:p-12 flex flex-col justify-center">
            {/* Security illustration */}
            <div className="flex-1 flex items-center justify-center mb-8 lg:mb-0">
              <div className="relative w-full max-w-sm">
                <svg
                  viewBox="0 0 400 300"
                  className="w-full h-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Background elements */}
                  <circle cx="320" cy="80" r="60" fill="var(--theme-primary-100)" opacity="0.3" />
                  <circle cx="80" cy="220" r="40" fill="var(--theme-accent-100)" opacity="0.4" />

                  {/* Lock illustration */}
                  <rect x="150" y="120" width="100" height="80" rx="8" fill="var(--theme-primary-200)" opacity="0.2" />
                  <circle cx="200" cy="100" r="25" fill="var(--theme-primary)" opacity="0.1" />
                  <path
                    d="M185 85 L200 75 L215 85 L215 105 C215 115 210 125 200 125 C190 125 185 115 185 105 Z"
                    fill="var(--theme-primary)"
                  />
                  <circle cx="200" cy="95" r="4" fill="white" />

                  {/* Shield with checkmark */}
                  <path
                    d="M200 140 L170 155 L170 185 C170 205 180 220 200 230 C220 220 230 205 230 185 L230 155 Z"
                    fill="var(--theme-accent)"
                    opacity="0.8"
                  />
                  <path
                    d="M188 185 L196 193 L212 177"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Floating particles */}
                  <circle cx="130" cy="60" r="3" fill="var(--theme-primary)" opacity="0.6">
                    <animate attributeName="cy" values="60;55;60" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="280" cy="180" r="2" fill="var(--theme-accent)" opacity="0.8">
                    <animate attributeName="cy" values="180;175;180" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>
            </div>

            {/* Informational content */}
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-4">
                  <div className="w-10 h-10 bg-theme-primary rounded-xl flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-lg">
                      {config.company_name?.charAt(0) || "E"}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {config.company_name}
                  </span>
                </div>

                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                  {t("SECURE_ACCOUNT_ACCESS").split(" ")[0]} <br />
                  <span className="text-theme-primary">{t("ACCOUNT_ACCESS")}</span>
                </h2>

                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  {t("DESCRIPTION")}
                </p>
              </div>

              {/* Security features */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="bg-theme-primary/10 p-3 rounded-xl mr-4 group hover:bg-theme-primary/20 transition-colors">
                    <Lock className="h-5 w-5 text-theme-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white block">
                      {t("STRONG_PASSWORD_PROTECTION")}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("ADVANCED_ENCRYPTION")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="bg-theme-accent/10 p-3 rounded-xl mr-4 group hover:bg-theme-accent/20 transition-colors">
                    <Shield className="h-5 w-5 text-theme-accent group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white block">
                      {t("ACCOUNT_SECURITY")}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("MULTI_LAYER_PROTECTION")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form side */}
          <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-gray-800/30 backdrop-blur-xs">
            <div className="max-w-sm mx-auto w-full">
              {isLoading && !success ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 border-4 border-theme-primary/30 border-t-theme-primary rounded-full animate-spin mb-6"></div>
                  <p className="text-gray-300 text-lg">{t("PROCESSING")}</p>
                </div>
              ) : !isTokenValid && !success ? (
                <div className="space-y-6 text-center">
                  {/* Error state */}
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/25">
                      <XCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">{t("VERIFICATION_FAILED")}</h1>
                    <p className="text-gray-300">{t("LINK_EXPIRED")}</p>
                  </div>

                  <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl backdrop-blur-xs">
                    <p className="text-red-300 text-sm">{error || t("TOKEN_INVALID")}</p>
                  </div>

                  <div className="space-y-4">
                    <Button
                      as={Link}
                      href="/auth/forgot-password"
                      size="lg"
                      radius="lg"
                      className="w-full font-semibold bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 text-white shadow-xl shadow-theme-primary/25"
                    >
                      {t("REQUEST_NEW_RESET_LINK")}
                    </Button>

                    <div className="text-center pt-4 border-t border-gray-700/50">
                      <Link
                        href="/auth/signin"
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-theme-primary transition-colors duration-200"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {t("RETURN_TO_LOGIN")}
                      </Link>
                    </div>
                  </div>
                </div>
              ) : success ? (
                <div className="space-y-6 text-center">
                  {/* Success state */}
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/25">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">{t("PASSWORD_UPDATED")}</h1>
                    <p className="text-gray-300">{t("PASSWORD_SUCCESS_MESSAGE")}</p>
                  </div>

                  <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-xl backdrop-blur-xs">
                    <p className="text-green-300 text-sm">{t("ACCOUNT_SECURE_MESSAGE")}</p>
                  </div>

                  <Button
                    as={Link}
                    href="/auth/signin"
                    size="lg"
                    radius="lg"
                    className="w-full font-semibold bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 text-white shadow-xl shadow-theme-primary/25"
                  >
                    {t("GO_TO_LOGIN")}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-theme-primary to-theme-accent flex items-center justify-center shadow-xl shadow-theme-primary/25">
                          <Key className="text-white w-8 h-8" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <Lock className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h1 className="text-3xl font-bold text-white">{t("TITLE")}</h1>
                      <p className="text-gray-300 text-lg">{t("SUBTITLE")}</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* New Password field */}
                    <div className="space-y-2">
                      <label className="text-white text-sm font-medium flex items-center gap-1">
                        {t("NEW_PASSWORD_LABEL")}
                        <span className="text-red-400">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t("ENTER_NEW_PASSWORD")}
                          name="newPassword"
                          required
                          className="pl-10 pr-12 w-full py-3 border-2 rounded-lg transition-all duration-200 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-white/6 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-sm shadow-xs hover:shadow-md focus:shadow-lg text-sm"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors duration-200"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>

                      {/* Password strength meter */}
                      {password && (
                        <div className="mt-3 space-y-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-300">{t("PASSWORD_STRENGTH")}</span>
                            <span
                              className={
                                passwordStrength >= 80
                                  ? "text-green-400"
                                  : passwordStrength >= 60
                                  ? "text-blue-400"
                                  : passwordStrength >= 40
                                  ? "text-yellow-400"
                                  : "text-red-400"
                              }
                            >
                              {passwordStrength >= 80
                                ? t("STRONG")
                                : passwordStrength >= 60
                                ? t("GOOD")
                                : passwordStrength >= 40
                                ? t("FAIR")
                                : t("WEAK")}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                passwordStrength >= 80
                                  ? "bg-green-500"
                                  : passwordStrength >= 60
                                  ? "bg-blue-500"
                                  : passwordStrength >= 40
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              )}
                              style={{ width: `${passwordStrength}%` }}
                            />
                          </div>

                          {/* Password criteria checklist */}
                          <div className="grid grid-cols-1 gap-1.5 text-xs">
                            {passwordCriteria.map((criterion) => (
                              <div key={criterion.id} className="flex items-center space-x-2">
                                <div
                                  className={cn(
                                    "w-2.5 h-2.5 rounded-full transition-colors duration-200",
                                    criterion.test(password) ? "bg-green-500" : "bg-gray-600"
                                  )}
                                />
                                <span
                                  className={cn(
                                    "transition-colors duration-200",
                                    criterion.test(password) ? "text-green-400" : "text-gray-400"
                                  )}
                                >
                                  {criterion.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password field */}
                    <div className="space-y-2">
                      <label className="text-white text-sm font-medium flex items-center gap-1">
                        {t("CONFIRM_PASSWORD_LABEL")}
                        <span className="text-red-400">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t("CONFIRM_NEW_PASSWORD")}
                          name="confirmPassword"
                          required
                          className="pl-10 pr-4 w-full py-3 border-2 rounded-lg transition-all duration-200 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-white/6 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-sm shadow-xs hover:shadow-md focus:shadow-lg text-sm"
                        />
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-red-400 text-sm mt-1">{t("PASSWORDS_DO_NOT_MATCH")}</p>
                      )}
                    </div>

                    {/* Error message */}
                    {error && (
                      <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl backdrop-blur-xs">
                        <p className="text-red-300 text-sm">{error}</p>
                      </div>
                    )}

                    {/* Submit button */}
                    <Button
                      type="submit"
                      isLoading={isLoading}
                      size="lg"
                      radius="lg"
                      className="w-full font-semibold bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 text-white shadow-xl shadow-theme-primary/25 hover:shadow-2xl hover:shadow-theme-primary/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                      disabled={passwordStrength < 60 || password !== confirmPassword}
                    >
                      {isLoading ? t("SETTING_PASSWORD") : t("SET_NEW_PASSWORD")}
                    </Button>

                    {/* Back to login */}
                    <div className="text-center pt-4 border-t border-gray-700/50">
                      <Link
                        href="/auth/signin"
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-theme-primary transition-colors duration-200"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {t("BACK_TO_LOGIN")}
                      </Link>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
