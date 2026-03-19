"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, MailCheck, Loader2 } from "lucide-react";
import { useConfig } from "../../config";
import { Button } from "@heroui/react";
import { verifyEmailAction } from "../actions";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function EmailVerificationPageClient() {
  const config = useConfig();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = useTranslations("admin.EMAIL_VERIFICATION_PAGE");

  const [verificationState, setVerificationState] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const verifyEmail = async () => {
      if (!token) {
        setVerificationState("error");
        setError(t("MISSING_VERIFICATION_TOKEN"));
        return;
      }
      try {
        const result = await verifyEmailAction(token);
        if (mounted) {
          if (result.success) {
            setVerificationState("success");
          } else if (result.error) {
            setVerificationState("error");
            setError(result.error);
          }
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setVerificationState("error");
          setError(t("ERROR_DURING_VERIFICATION"));
        }
      }
    };
    verifyEmail();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Main container */}
      <div className="w-full max-w-4xl rounded-lg border dark:border-white/[0.06] shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Brand/Directory Info Side */}
          <div className="w-full md:w-1/2 bg-gray-800 text-white p-8 flex flex-col justify-center">
            <div className="mb-6">
              {/* Directory Logo */}
              <div className="flex items-center mb-6 space-x-2">
                <span className="text-2xl font-bold">
                  {config.company_name}
                </span>
              </div>

              <h2 className="text-2xl font-bold mb-3">{t("TITLE")}</h2>

              <p className="text-gray-300 mb-6">
                {t("SUBTITLE")}
              </p>

              {/* Directory Feature */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="bg-blue-500/20 p-1 rounded-full mr-3">
                    <MailCheck className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-300">
                    {t("GET_ACCESS_FEATURES")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Status Side */}
          <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
            <div className="text-center space-y-6">
              {verificationState === "loading" && (
                <>
                  <div className="flex justify-center">
                    <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {t("VERIFYING_EMAIL")}
                    </h3>
                    <p className="text-gray-500">
                      {t("PLEASE_WAIT")}
                    </p>
                  </div>
                </>
              )}

              {verificationState === "success" && (
                <>
                  <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {t("EMAIL_VERIFIED")}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {t("VERIFICATION_SUCCESS_MESSAGE")}
                    </p>
                    <Link href="/auth/signin">
                      <Button className="w-full">{t("CONTINUE_TO_LOGIN")}</Button>
                    </Link>
                  </div>
                </>
              )}

              {verificationState === "error" && (
                <>
                  <div className="flex justify-center">
                    <XCircle className="h-16 w-16 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {t("VERIFICATION_FAILED")}
                    </h3>

                    <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm mb-6">
                      {error || t("VERIFICATION_ERROR_MESSAGE")}
                    </div>
                    <Link href="/auth/signin">
                      <Button variant="bordered" className="w-full mb-3">
                        {t("RETURN_TO_LOGIN")}
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
