export interface FeedbackRequest {

  rating: 'up' | 'down';

  corrected_sql?: string;

  comment?: string;

}



export interface FeedbackResponse {

  id: number;

  query_log_id: number;

  user_id: number;

  rating: string;

  corrected_sql?: string;

  comment?: string;

  created_at?: string;

}



export interface GlossaryEntry {

  id: number;

  term: string;

  definition: string;

  sql_expression: string;

  category?: string;

  created_at?: string;

  updated_at?: string;

}



export interface CatalogEntry {

  id: number;

  table_name: string;

  column_name: string;

  data_type: string;

  description: string;

  sample_values?: any[];

  is_pii: boolean;

  is_active: boolean;

  created_at?: string;

}



export interface GovernanceRule {

  id: number;

  rule_type: 'rbac' | 'pii_mask' | 'row_filter';

  role?: string;

  table_name: string;

  column_name?: string;

  condition?: string;

  is_active: boolean;

  created_by?: number;

  created_at?: string;

}