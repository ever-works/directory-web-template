"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChangePassword } from "@/hooks/use-change-password";
import { passwordSchema as sharedPasswordSchema } from "@/lib/validations/auth";
import { FiCheck } from "react-icons/fi";
import { useTranslations } from "next-intl";

// ─── Style constants ──────────────────────────────────────────────────────────

const INPUT_CLASS =
	"w-full h-9 px-3 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30 focus:border-theme-primary-400 dark:focus:border-theme-primary-500 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150";

const LABEL_CLASS = "block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5";

// ─── Password strength ────────────────────────────────────────────────────────

interface Requirement {
	label: string;
	test: (p: string) => boolean;
}

interface StrengthLabels {
	weak: string;
	fair: string;
	good: string;
	strong: string;
}

function PasswordStrength({ password, requirements, strengthLabels }: {
	password: string;
	requirements: Requirement[];
	strengthLabels: StrengthLabels;
}) {
	if (!password) return null;

	const score = requirements.filter((r) => r.test(password)).length;
	const pct = (score / requirements.length) * 100;

	const [barColor, label, textColor] =
		score <= 1 ? ["bg-red-500", strengthLabels.weak, "text-red-500"] :
		score <= 3 ? ["bg-amber-500", strengthLabels.fair, "text-amber-500"] :
		score === 4 ? ["bg-blue-500", strengthLabels.good, "text-blue-500"] :
		             ["bg-emerald-500", strengthLabels.strong, "text-emerald-500"];

	return (
		<div className="mt-2.5 space-y-2">
			<div className="flex items-center gap-2">
				<div className="flex-1 h-1 bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden">
					<div
						className={cn("h-full rounded-full transition-all duration-300", barColor)}
						style={{ width: `${pct}%` }}
					/>
				</div>
				<span className={cn("text-xs font-medium w-10 text-right tabular-nums shrink-0", textColor)}>
					{label}
				</span>
			</div>
			<div className="space-y-1">
				{requirements.map((req) => {
					const met = req.test(password);
					return (
						<div key={req.label} className="flex items-center gap-1.5 text-xs">
							{met ? (
								<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
							) : (
								<Circle className="w-3.5 h-3.5 text-neutral-300 dark:text-white/20 shrink-0" />
							)}
							<span className={met ? "text-neutral-600 dark:text-neutral-400" : "text-neutral-400 dark:text-neutral-500"}>
								{req.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ─── Password field ───────────────────────────────────────────────────────────

interface PasswordFieldProps {
	id: string;
	label: string;
	placeholder: string;
	showLabel: string;
	hideLabel: string;
	error?: string;
	register: ReturnType<typeof useForm<PasswordFormData>>["register"];
	children?: React.ReactNode;
}

function PasswordField({ id, label, placeholder, showLabel, hideLabel, error, register, children }: PasswordFieldProps) {
	const [show, setShow] = useState(false);

	return (
		<div>
			<label htmlFor={id} className={LABEL_CLASS}>{label}</label>
			<div className="relative">
				<input
					{...register(id as keyof PasswordFormData)}
					id={id}
					type={show ? "text" : "password"}
					placeholder={placeholder}
					aria-describedby={error ? `${id}-error` : undefined}
					aria-invalid={error ? "true" : "false"}
					className={cn(
						INPUT_CLASS,
						"pr-9",
						error && "border-red-400 dark:border-red-500/70 focus:border-red-400 focus:ring-red-400/20"
					)}
				/>
				<button
					type="button"
					onClick={() => setShow((s) => !s)}
					className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-150"
					aria-label={show ? hideLabel : showLabel}
				>
					{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
				</button>
			</div>
			{error && (
				<p id={`${id}-error`} className="text-red-500 text-xs mt-1" role="alert">
					{error}
				</p>
			)}
			{children}
		</div>
	);
}

// ─── Form type (declared here so PasswordField can reference it) ──────────────

type PasswordFormData = {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
};

// ─── Main form ────────────────────────────────────────────────────────────────

export function ChangePasswordForm() {
	const t = useTranslations("settings.SECURITY_PAGE.CHANGE_PASSWORD_FORM");
	const [showSuccess, setShowSuccess] = useState(false);
	const { changePassword, isLoading, isSuccess, reset: resetMutation } = useChangePassword();

	const schema = useMemo(
		() =>
			z
				.object({
					currentPassword: z.string().min(1, t("VALIDATION.CURRENT_REQUIRED")),
					newPassword: sharedPasswordSchema,
					confirmPassword: z.string().min(1, t("VALIDATION.CONFIRM_REQUIRED")),
				})
				.refine((data) => data.newPassword === data.confirmPassword, {
					message: t("VALIDATION.PASSWORDS_MATCH"),
					path: ["confirmPassword"],
				}),
		[t]
	);

	const requirements: Requirement[] = useMemo(
		() => [
			{ label: t("REQUIREMENTS.MIN_LENGTH"), test: (p) => p.length >= 8 },
			{ label: t("REQUIREMENTS.UPPERCASE"), test: (p) => /[A-Z]/.test(p) },
			{ label: t("REQUIREMENTS.LOWERCASE"), test: (p) => /[a-z]/.test(p) },
			{ label: t("REQUIREMENTS.NUMBER"), test: (p) => /[0-9]/.test(p) },
			{ label: t("REQUIREMENTS.SPECIAL"), test: (p) => /[^A-Za-z0-9]/.test(p) },
		],
		[t]
	);

	const strengthLabels: StrengthLabels = useMemo(
		() => ({
			weak: t("STRENGTH.WEAK"),
			fair: t("STRENGTH.FAIR"),
			good: t("STRENGTH.GOOD"),
			strong: t("STRENGTH.STRONG"),
		}),
		[t]
	);

	const {
		register,
		handleSubmit,
		watch,
		reset,
		formState: { errors, isValid },
	} = useForm<PasswordFormData>({
		resolver: zodResolver(schema),
		mode: "onChange",
	});

	const newPassword = watch("newPassword") ?? "";

	React.useEffect(() => {
		if (isSuccess) {
			setShowSuccess(true);
			reset();
			const timer = setTimeout(() => {
				setShowSuccess(false);
				resetMutation();
			}, 5000);
			return () => clearTimeout(timer);
		}
	}, [isSuccess, reset, resetMutation]);

	const onSubmit = async (data: PasswordFormData) => {
		await changePassword(data);
	};

	const showLabel = t("SHOW_PASSWORD");
	const hideLabel = t("HIDE_PASSWORD");

	// ── Success state ──────────────────────────────────────────────────────────
	if (showSuccess) {
		return (
			<div className="flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/10 px-5 py-4 shadow-sm">
				<div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
					<FiCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div className="pt-0.5">
					<p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
						{t("SUCCESS_TITLE")}
					</p>
					<p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
						{t("SUCCESS_DESCRIPTION")}
					</p>
				</div>
			</div>
		);
	}

	// ── Form ───────────────────────────────────────────────────────────────────
	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6"
		>
			{/* Section header */}
			<div className="px-6 py-5">
				<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
					{t("SECTION_TITLE")}
				</p>
				<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
					{t("SECTION_DESCRIPTION")}
				</p>
			</div>

			{/* Fields */}
			<div className="px-6 py-5 space-y-4">
				<PasswordField
					id="currentPassword"
					label={t("CURRENT_PASSWORD")}
					placeholder={t("CURRENT_PASSWORD_PLACEHOLDER")}
					showLabel={showLabel}
					hideLabel={hideLabel}
					error={errors.currentPassword?.message}
					register={register}
				/>

				<PasswordField
					id="newPassword"
					label={t("NEW_PASSWORD")}
					placeholder={t("NEW_PASSWORD_PLACEHOLDER")}
					showLabel={showLabel}
					hideLabel={hideLabel}
					error={errors.newPassword?.message}
					register={register}
				>
					<PasswordStrength
						password={newPassword}
						requirements={requirements}
						strengthLabels={strengthLabels}
					/>
				</PasswordField>

				<PasswordField
					id="confirmPassword"
					label={t("CONFIRM_PASSWORD")}
					placeholder={t("CONFIRM_PASSWORD_PLACEHOLDER")}
					showLabel={showLabel}
					hideLabel={hideLabel}
					error={errors.confirmPassword?.message}
					register={register}
				/>
			</div>

			{/* Actions footer */}
			<div className="px-6 py-4 flex items-center justify-end gap-3 bg-neutral-50 dark:bg-white/2 rounded-b-xl">
				<button
					type="button"
					onClick={() => reset()}
					className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-150"
				>
					{t("CANCEL")}
				</button>
				<Button
					type="submit"
					disabled={!isValid || isLoading}
					className="px-4 py-2 text-sm font-medium bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg transition-colors duration-150 disabled:opacity-60"
				>
					{isLoading ? (
						<span className="flex items-center gap-1.5">
							<span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							{t("UPDATING_PASSWORD")}
						</span>
					) : (
						t("UPDATE_PASSWORD")
					)}
				</Button>
			</div>
		</form>
	);
}
