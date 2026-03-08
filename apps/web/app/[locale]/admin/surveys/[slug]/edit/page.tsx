import { surveyService } from '@/lib/services/survey.service';
import { notFound } from 'next/navigation';
import { CreateEditSurveyClient } from '@/components/surveys/admin/create-edit-survey-client';

interface EditSurveyPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function EditSurveyPage({ params }: EditSurveyPageProps) {
	const { slug } = await params;

	// Fetch survey data on the server
	const survey = await surveyService.getBySlug(slug);

	if (!survey) {
		notFound();
	}

	return <CreateEditSurveyClient survey={survey} />;
}

