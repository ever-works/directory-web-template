// app/api/reference/route.ts
import { ApiReference } from '@scalar/nextjs-api-reference'

const config = {
  url: '/openapi.json',
  theme: 'bluePlanet' as const,
  showSidebar: true,
}

export const GET = ApiReference(config)
