export interface ComparisonDimension {
  name: string;
  item_a_summary: string;
  item_b_summary: string;
  item_a_score?: number;
  item_b_score?: number;
  winner?: 'item_a' | 'item_b' | 'tie';
}

export interface ComparisonData {
  id: string;
  slug: string;
  title: string;
  item_a_slug: string;
  item_b_slug: string;
  item_a_name: string;
  item_b_name: string;
  category: string;
  summary: string;
  verdict: string;
  verdict_winner?: 'item_a' | 'item_b' | 'tie';
  dimensions: readonly ComparisonDimension[];
  sources: readonly string[];
  generated_at: string;
}

export interface ComparisonDetail {
  comparison: ComparisonData;
  markdown?: string;
  extendedAnalysisMarkdown?: string;
}
