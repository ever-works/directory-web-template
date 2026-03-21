import { NextRequest, NextResponse } from 'next/server';
import { surveyService } from '@/lib/services/survey.service';
import { SurveyStatusEnum, SurveyTypeEnum } from '@/lib/types/survey';

interface SurveyExistsResponse {
	exists: boolean;
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const typeParam = searchParams.get('type');
	const type = typeParam === SurveyTypeEnum.ITEM ? SurveyTypeEnum.ITEM : SurveyTypeEnum.GLOBAL;

	try {
		const result = await surveyService.getMany({
			type,
			status: SurveyStatusEnum.PUBLISHED,
			limit: 1
		});

		return NextResponse.json<SurveyExistsResponse>({
			exists: (result.surveys?.length || 0) > 0
		});
	} catch {
		// Public survey navigation should degrade quietly when DB-backed surveys
		// are unavailable instead of blocking the whole page shell.
		return NextResponse.json<SurveyExistsResponse>({ exists: false });
	}
}
