"use client"

import { useTransactionDetails } from "@/hooks/use-transaction-details"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  Loader2,
  Star,
  CreditCard,
  Calendar,
  Gift,
  FileText,
  Zap, BarChart3,
  Phone,
  Mail,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@heroui/react"
import { useSuccessPageFeatures } from "@/hooks/use-success-page-features"
import { useTranslations } from "next-intl"
import { PaymentPlan } from "@/lib/constants"
import { Container } from "@/components/ui/container"


export default function SubmissionSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getPlanFeaturesWithIcons } = useSuccessPageFeatures()
  const t = useTranslations('success')

 

  const sessionId = searchParams.get("session_id");
  const planType =searchParams.get("plan")
  const submissionId =  searchParams.get("submission_id");


  const {
    transactionDetails,
    isLoading,
    error
  } = useTransactionDetails({
    sessionId,
    planType:planType as PaymentPlan | null,
    submissionId,
    enabled: true
  })

  const getPlanFeatures = (planType: string) => {
    return getPlanFeaturesWithIcons(planType as PaymentPlan.FREE|PaymentPlan.STANDARD| PaymentPlan.PREMIUM)
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending_review: { text: t("STATUS_PENDING_REVIEW"), color: "bg-yellow-500/20 text-yellow-400" },
      active: { text: t("STATUS_ACTIVE"), color: "bg-green-500/20 text-green-400" },
      approved: { text: t("STATUS_APPROVED"), color: "bg-green-500/20 text-green-400" },
      published: { text: t("STATUS_PUBLISHED"), color: "bg-blue-500/20 text-blue-400" },
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.pending_review
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-theme-primary-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-white">{t("LOADING_SUBMISSION_DETAILS")}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        <Container maxWidth="7xl" padding="default" useGlobalWidth>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{t("ERROR_OCCURRED")}</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button onClick={() => router.push("/pricing")} className="bg-blue-600 hover:bg-blue-700 text-white">
              {t("BACK_TO_PRICING")}
            </Button>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <Container maxWidth="7xl" padding="default" useGlobalWidth>
          <div className="text-center mb-12">
            <div className="w-20 h-20   flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              {transactionDetails?.paymentType === "subscription" ? t("SUBSCRIPTION_ACTIVATED") : t("SUBMISSION_RECEIVED")}
            </h1>
            <p className="text-xl text-slate-600 dark:text-white">
              {transactionDetails?.paymentType === "subscription"
                ? t("SUBSCRIPTION_SUCCESS_MESSAGE")
                : t("SUBMISSION_SUCCESS_MESSAGE")}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 ">
              <FileText className="w-4 h-4 text-theme-primary-600" />
              <span className="text-theme-primary-600 font-medium">
                {transactionDetails?.submissionTitle || t("SUBMISSION_PROCESSING")}
              </span>
            </div>
          </div>

          {/* Transaction Details */}
          <div   className="p-8 mb-8 ">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column - Transaction Info */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-theme-primary-600 dark:text-white" />
                  {t("TRANSACTION_DETAILS")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-white">{t("PLAN")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 dark:text-white font-medium">{transactionDetails?.planName}</span>
                      {transactionDetails?.planType !== "free" && <Star className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-white">{t("PRICE")}</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {transactionDetails?.price === 0
                        ? t("FREE")
                        : `$${transactionDetails?.price}${transactionDetails?.paymentType === "subscription" ? "/mois" : ""}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-white">{t("STATUS")}</span>
                    <Badge
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        getStatusInfo(transactionDetails?.status || "").color,
                      )}
                    >
                      {getStatusInfo(transactionDetails?.status || "").text}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-white">{t("EMAIL")}</span>
                    <span className="text-slate-900 font-medium text-sm">{transactionDetails?.customerEmail}</span>
                  </div>
                  {transactionDetails?.submissionsRemaining && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-white">{t("SUBMISSIONS_REMAINING")}</span>
                      <span className="text-slate-900 dark:text-white font-medium">{transactionDetails.submissionsRemaining}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Plan Features */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-theme-primary-600" />
                  {t("YOUR_PLAN_INCLUDES")}
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {getPlanFeatures(transactionDetails?.planType || "free").map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <feature.icon className={cn("w-4 h-4", feature.color)} />
                      <span className="text-slate-700 dark:text-white text-sm">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-8 mb-8 shadow-lg">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t("NEXT_STEPS")}</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {transactionDetails?.paymentType === "submission" && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-slate-800 rounded-lg">
                  <Clock className="w-5 h-5 text-theme-primary-600 mt-0.5" />
                  <div>
                    <p className="text-theme-primary-900 dark:text-white font-medium">{t("REVIEW_IN_PROGRESS")}</p>
                    <p className="text-theme-primary-700 dark:text-white text-sm">
                      {transactionDetails?.planType === "pro" || transactionDetails?.planType === "premium"
                        ? t("STANDARD_REVIEW_TIME")
                        : t("FREE_REVIEW_TIME")}
                    </p>
                  </div>
                </div>
              )}

              {transactionDetails?.nextPaymentDate && (
                <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-sl-900 rounded-lg">
                  <Calendar className="w-5 h-5 text-slate-600 dark:text-white mt-0.5" />
                  <div>
                    <p className="text-slate-900 font-medium">{t("NEXT_PAYMENT")}</p>
                    <p className="text-slate-600 text-sm">
                      {new Date(transactionDetails.nextPaymentDate * 1000).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Mail className="w-5 h-5 text-slate-600 mt-0.5" />
                <div>
                  <p className="text-slate-900 font-medium">{t("EMAIL_CONFIRMATION")}</p>
                  <p className="text-slate-600 text-sm">{t("EMAIL_CONFIRMATION_MESSAGE")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-slate-600 mt-0.5" />
                <div>
                  <p className="text-slate-900 font-medium">{t("PERFORMANCE_TRACKING")}</p>
                  <p className="text-slate-600 text-sm">{t("PERFORMANCE_TRACKING_MESSAGE")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push("/client/dashboard")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t("VIEW_SUBMISSIONS")}
            </Button>
            <Button
              onClick={() => router.push("/submit")}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3"
            >
              <Zap className="w-4 h-4 mr-2" />
              {t("NEW_SUBMISSION")}
            </Button>
            <Button
              onClick={() => router.push("/help")}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3"
            >
              <Phone className="w-4 h-4 mr-2" />
              {t("NEED_HELP")}
            </Button>
          </div>

          {/* Security Notice */}
          <div className="mt-12 text-center">
            <p className="text-slate-500 text-sm">
              🔒 {t("SECURITY_NOTICE")}
              <br />
              {t("THANK_YOU_MESSAGE")}
            </p>
          </div>
        </Container>
      </div>
  )
}
