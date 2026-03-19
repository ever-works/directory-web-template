import { Container } from '@/components/ui/container';

interface ItemSurveyLayoutProps {
	children: React.ReactNode;
}


export default function ItemSurveyLayout({ children }: ItemSurveyLayoutProps) {
	return (
		<Container maxWidth="7xl" padding="default">
			{children}
		</Container>
	)
}

