"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChangePassword } from "@/hooks/use-change-password";
import { passwordSchema as sharedPasswordSchema } from "@/lib/validations/auth";
import { FiCheck } from "react-icons/fi";

// ─── Style constants (matches repo-wide settings patterns) ───────────────────

const INPUT_CLASS =
	"w-full h-9 px-3 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30 focus:border-theme-primary-400 dark:focus:border-theme-primary-500 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150";

const LABEL_CLASS = "block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5";

// ─── Schema ───────────────────────────────────────────────────────────────────

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: sharedPasswordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

type PasswordFormData = z.infer<typeof passwordSchema>;

// ─── Password strength ────────────────────────────────────────────────────────

const REQUIREMENTS = [
	{ label: "At least 8 characters", test: (p: string) => p.length >= 8 },
	{ label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
	{ label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
	{ label: "One number", test: (p: string) => /[0-9]/.test(p) },
	{ label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrength({ password }: { password: string }) {
	if (!password) return null;

	const score = REQUIREMENTS.filter((r) => r.test(password)).length;
	const pct = (score / REQUIREMENTS.length) * 100;

	const [barColor, strengthLabel, textColor] =
		score <= 1 ? ["bg-red-500", "Weak", "text-red-500"] :
		score <= 3 ? ["bg-amber-500", "Fair", "text-amber-500"] :
		score === 4 ? ["bg-blue-500", "Good", "text-blue-500"] :
		             ["bg-emerald-500", "Strong", "text-emerald-500"];

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
					{strengthLabel}
				</span>
			</div>
			<div className="space-y-1">
				{REQUIREMENTS.map((req) => {
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
	error?: string;
	register: ReturnType<typeof useForm<PasswordFormData>>["register"];
	children?: React.ReactNode;
}

function PasswordField({ id, label, placeholder, error, register, children }: PasswordFieldProps) {
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
					aria-label={show ? "Hide password" : "Show password"}
				>
					{show
						? <EyeOff className="w-4 h-4" />
						: <Eye className="w-4 h-4" />
					}
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

// ─── Main form ────────────────────────────────────────────────────────────────

export function ChangePasswordForm() {
	const [showSuccess, setShowSuccess] = useState(false);
	const { changePassword, isLoading, isSuccess, reset: resetMutation } = useChangePassword();

	const {
		register,
		handleSubmit,
		watch,
		reset,
		formState: { errors, isValid },
	} = useForm<PasswordFormData>({
		resolver: zodResolver(passwordSchema),
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

	// ── Success state ──────────────────────────────────────────────────────────
	if (showSuccess) {
		return (
			<div className="flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/10 px-5 py-4 shadow-sm">
				<div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
					<FiCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div className="pt-0.5">
					<p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
						Password changed
					</p>
					<p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
						Your password has been updated. A confirmation email has been sent to your registered address.
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
					Change password
				</p>
				<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
					Choose a strong, unique password you're not using on other sites.
				</p>
			</div>

			{/* Fields */}
			<div className="px-6 py-5 space-y-4">
				<PasswordField
					id="currentPassword"
					label="Current password"
					placeholder="Enter your current password"
					error={errors.currentPassword?.message}
					register={register}
				/>

				<PasswordField
					id="newPassword"
					label="New password"
					placeholder="Choose a new password"
					error={errors.newPassword?.message}
					register={register}
				>
					<PasswordStrength password={newPassword} />
				</PasswordField>

				<PasswordField
					id="confirmPassword"
					label="Confirm new password"
					placeholder="Re-enter your new password"
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
					Cancel
				</button>
				<Button
					type="submit"
					disabled={!isValid || isLoading}
					className="px-4 py-2 text-sm font-medium bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg transition-colors duration-150 disabled:opacity-60"
				>
					{isLoading ? (
						<span className="flex items-center gap-1.5">
							<span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							Updating…
						</span>
					) : (
						"Update password"
					)}
				</Button>
			</div>
		</form>
	);
}
