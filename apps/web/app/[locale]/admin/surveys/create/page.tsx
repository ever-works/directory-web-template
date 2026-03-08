import { CreateEditSurveyClient } from '@/components/surveys/admin/create-edit-survey-client';

interface CreateSurveyPageProps {
	searchParams: Promise<{
		itemId?: string;
	}>;
}

export default async function CreateSurveyPage({ searchParams }: CreateSurveyPageProps) {
	const params = await searchParams;

	return (
		<CreateEditSurveyClient
			defaultItemId={params.itemId}
		/>
	);
}

