export interface QueryRequest {
  query: string;
  session_id?: string;
}
 
export interface HypothesisResult {
  hypothesis: string;
  metric?: string;
  current?: number;
  previous?: number;
  change_pct?: number;
  supported?: boolean;
  sql?: string;
}
 
export interface ProvenanceInfo {
  source_tables: string[];
  row_count: number;
  timestamp: string;
}
 
export interface QueryResponse {
  id: number;
  answer: string;
  sql?: string;
  explanation?: string;
  data: any[];
  hypotheses: HypothesisResult[];
  best_hypothesis?: HypothesisResult;
  confidence: number;
  confidence_reason?: string;
  chart?: any;
  follow_up_suggestions: string[];
  provenance?: ProvenanceInfo;
  latency_ms?: number;
  created_at?: string;
}
 
export interface QueryHistoryItem {
  id: number;
  natural_language_query: string;
  answer_text?: string;
  confidence_score?: number;
  created_at?: string;
  user_email?: string;
  session_id?: string;
}
 
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
 
export interface SessionSummary {
  session_id: string;
  query_count: number;
  first_query: string;
  last_activity: string;
}
 
export interface ChatMessage {
  id: number;
  query: string;
  answer: string;
  created_at: string;
  chart?: any;
  sql?: string;
  confidence: number;
  hypotheses: HypothesisResult[];
  best_hypothesis?: HypothesisResult;
  follow_up_suggestions?: string[];
  isError?: boolean;
}