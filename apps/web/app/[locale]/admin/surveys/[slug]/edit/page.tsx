import { surveyService } from '@/lib/services/survey.service';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { CreateEditSurveyClient } from '@/components/surveys/admin/create-edit-survey-client';

interface EditSurveyPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function EditSurveyPage({ params }: EditSurveyPageProps) {
	// Admin check on the server, before the survey is read: the admin layout checks in the browser, after the
	// survey is already in the page payload. Signed out goes to sign-in, no live admin role to /unauthorized.
	await requireAdmin();

	const { slug } = await params;

	// Fetch survey data on the server
	const survey = await surveyService.getBySlug(slug);

	if (!survey) {
		notFound();
	}

	return <CreateEditSurveyClient survey={survey} />;
}

