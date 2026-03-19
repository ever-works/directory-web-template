'use client';

import { useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import type { Survey } from '@/lib/db/schema';
import { SurveyFormWrapper } from './forms/survey-form-wrapper';

interface SurveyDialogProps {
	survey: Survey | null;
	open: boolean;
	onClose: () => void;
	itemSlug?: string;
	onCompleted?: () => void;
}

/**
 * Survey Dialog Component
 * Displays survey in a modal dialog
 */
export function SurveyDialog({ survey, open, onClose, itemSlug, onCompleted }: SurveyDialogProps) {
	const timerRef = useRef<number | undefined>(undefined);

	const handleCompleted = () => {
		// Close the dialog after a short delay
		timerRef.current = window.setTimeout(() => {
			onClose();
			if (onCompleted) {
				onCompleted();
			}
		}, 1500);
	};

	const handleClose = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = undefined;
		}
		onClose();
	};

	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	if (!survey) return null;

	return (
		<Modal
			title={survey.title}
			subtitle={survey.description}
			isOpen={open}
			backdrop="blur"
			isDismissable={true}
			onClose={handleClose}
			size="2xl"
		>
			<div className="p-4">
				<SurveyFormWrapper survey={survey} itemSlug={itemSlug} onCompleted={handleCompleted} />
			</div>
		</Modal>
	);
}
