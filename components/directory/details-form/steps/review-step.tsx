'use client';

import { Eye } from 'lucide-react';
import type { FormData } from '../validation/form-validators';
import { STEP_CARD_CLASSES } from '../validation/form-validators';

interface ReviewStepProps {
	formData: FormData;
	t: (key: string, values?: Record<string, unknown>) => string;
}

export function ReviewStep({ formData, t }: ReviewStepProps) {
	return (
		<div className={STEP_CARD_CLASSES.reviewCard.wrapper}>
			<div className={STEP_CARD_CLASSES.reviewCard.glow} />
			<div className={STEP_CARD_CLASSES.reviewCard.content}>
				<div className={STEP_CARD_CLASSES.reviewCard.header.wrapper}>
					<div className={STEP_CARD_CLASSES.reviewCard.header.icon}>
						<Eye className={STEP_CARD_CLASSES.reviewCard.header.iconInner} />
					</div>
					<h3 className={STEP_CARD_CLASSES.reviewCard.header.title}>
						{t('directory.DETAILS_FORM.REVIEW_AND_SUBMIT')}
					</h3>
				</div>

				<div className="space-y-6">
					{/* Review Summary */}
					<div className="grid gap-6">
						<div className={STEP_CARD_CLASSES.reviewCard.field}>
							<h4 className={STEP_CARD_CLASSES.reviewCard.fieldTitle}>
								{t('directory.DETAILS_FORM.PRODUCT_NAME')}
							</h4>
							<p className={STEP_CARD_CLASSES.reviewCard.fieldValue}>
								{formData.name || 'Not provided'}
							</p>
						</div>

						<div className={STEP_CARD_CLASSES.reviewCard.field}>
							<h4 className={STEP_CARD_CLASSES.reviewCard.fieldTitle}>
								{t('directory.DETAILS_FORM.PRODUCT_LINK')}
							</h4>
							<p className={STEP_CARD_CLASSES.reviewCard.fieldValue}>
								{formData.link || 'Not provided'}
							</p>
						</div>

						<div className={STEP_CARD_CLASSES.reviewCard.field}>
							<h4 className={STEP_CARD_CLASSES.reviewCard.fieldTitle}>
								{t('directory.DETAILS_FORM.CATEGORY')}
							</h4>
							<p className={STEP_CARD_CLASSES.reviewCard.fieldValue}>
								{formData.category || 'Not provided'}
							</p>
						</div>

						<div className={STEP_CARD_CLASSES.reviewCard.field}>
							<h4 className={STEP_CARD_CLASSES.reviewCard.fieldTitle}>
								{t('directory.DETAILS_FORM.TAGS_LABELS')}
							</h4>
							<div className="flex flex-wrap gap-2">
								{formData.tags.length > 0 ? (
									formData.tags.map((tag) => (
										<span
											key={tag}
											className="px-2 py-1 text-xs bg-theme-primary-500 text-white rounded-sm"
										>
											{tag}
										</span>
									))
								) : (
									<p className={STEP_CARD_CLASSES.reviewCard.fieldValue}>
										{t('tagsModal.NO_TAGS_SELECTED')}
									</p>
								)}
							</div>
						</div>

						<div className={STEP_CARD_CLASSES.reviewCard.field}>
							<h4 className={STEP_CARD_CLASSES.reviewCard.fieldTitle}>
								{t('directory.DETAILS_FORM.SHORT_DESCRIPTION')}
							</h4>
							<p className={STEP_CARD_CLASSES.reviewCard.fieldValue}>
								{formData.description || 'Not provided'}
							</p>
						</div>

						{formData.introduction && (
							<div className={STEP_CARD_CLASSES.reviewCard.field}>
								<h4 className={STEP_CARD_CLASSES.reviewCard.fieldTitle}>
									{t('directory.DETAILS_FORM.DETAILED_INTRODUCTION')}
								</h4>
								<p className={STEP_CARD_CLASSES.reviewCard.fieldValue}>{formData.introduction}</p>
							</div>
						)}

						{formData.location && (formData.location.is_remote || formData.location.address || formData.location.city) && (
							<div className={STEP_CARD_CLASSES.reviewCard.field}>
								<h4 className={STEP_CARD_CLASSES.reviewCard.fieldTitle}>
									{t('directory.REVIEW.LOCATION')}
								</h4>
								{formData.location.is_remote ? (
									<p className={STEP_CARD_CLASSES.reviewCard.fieldValue}>
										{t('directory.REVIEW.REMOTE_SERVICE')}
									</p>
								) : (
									<div className={STEP_CARD_CLASSES.reviewCard.fieldValue}>
										{formData.location.address && <p>{formData.location.address}</p>}
										{(formData.location.city || formData.location.country) && (
											<p>{[formData.location.city, formData.location.state, formData.location.country].filter(Boolean).join(', ')}</p>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
