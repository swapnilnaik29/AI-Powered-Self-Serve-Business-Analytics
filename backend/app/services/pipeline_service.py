import time
import logging
from typing import Optional, List
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.integrations.llm_client import LLMClient
from app.models.user import User
from app.models.query_log import QueryLog
from app.repositories.query_log_repository import QueryLogRepository
from app.repositories.glossary_repository import GlossaryRepository
from app.services.query_understanding_service import QueryUnderstandingService
from app.services.schema_retrieval_service import SchemaRetrievalService
from app.services.hypothesis_service import HypothesisService
from app.services.hypothesis_testing_service import HypothesisTestingService
from app.services.nl2sql_service import NL2SQLService
from app.services.sql_execution_service import SQLExecutionService
from app.services.answer_synthesis_service import AnswerSynthesisService
from app.services.chart_service import ChartService
from app.services.confidence_service import ConfidenceService
from app.services.followup_service import FollowupService
from app.services.governance_service import GovernanceService
from app.schemas.query import QueryResponse, HypothesisResult, ProvenanceInfo
from app.core.utils import sanitize_for_json

logger = logging.getLogger(__name__)


class PipelineService:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.llm = LLMClient()
        self.sql_service = SQLExecutionService()

    def run(self, query: str, session_id: Optional[str] = None) -> QueryResponse:
        start_time = time.perf_counter()

        # Schema Retrieval & Query Understanding
        schema_service = SchemaRetrievalService(self.db)
        schema_context = schema_service.retrieve(query)
        schema_columns = schema_service.get_column_names()

        qu_service = QueryUnderstandingService(self.llm)
        parsed = qu_service.parse(query)
        metric = parsed.get("metric", "revenue")
        time_filter = parsed.get("time_filter", "none")
        complexity = parsed.get("complexity", "simple")
        query_type = parsed.get("query_type", "scalar")

        # Hypothesis Generation
        hyp_service = HypothesisService(self.llm)
        hypotheses = hyp_service.generate(query, complexity, schema_columns=schema_columns)

        # Governance & Context Injection
        glossary_defs = self._get_glossary_definitions()
        gov_service = GovernanceService(self.db)
        schema_context = gov_service.mask_pii_in_context(schema_context, self.user.role)
        context_block = self._build_session_context(session_id)

        # NL2SQL Generation
        nl2sql_service = NL2SQLService(self.llm)
        explanation = None
        try:
            sql, explanation = nl2sql_service.generate(
                query, schema_context, glossary_defs, context_block,
                parsed_intent=parsed,
            )
        except Exception as e:
            logger.error("NL2SQL failed: %s", e)
            return self._error_response(query, str(e), session_id, start_time)

        # SQL Execution
        result_df, success = self.sql_service.execute(sql)

        # Hypothesis Testing (Complex Queries Only)
        hypothesis_results: List[dict] = []
        best_hypothesis: Optional[dict] = None
        if complexity == "complex":
            ht_service = HypothesisTestingService(self.llm, self.sql_service)
            hypothesis_results = ht_service.test_hypotheses(hypotheses, metric, time_filter)
            best_hypothesis = ht_service.select_best(hypothesis_results)

        # Visualization
        chart_service = ChartService(self.llm)
        chart_df = result_df
        chart_type = chart_service.decide_chart_type(query, chart_df, query_type=query_type)
        chart_spec = chart_service.generate_chart(chart_df, chart_type, query=query)

        # Answer Synthesis & Confidence
        answer_service = AnswerSynthesisService(self.llm)
        insight = answer_service.compute_insight(result_df)
        answer = answer_service.synthesize(query, result_df, insight, query_intent=parsed)

        conf_service = ConfidenceService()
        row_count = len(result_df) if result_df is not None else 0
        confidence, confidence_reason = conf_service.compute(
            success, row_count, hypothesis_results, query
        )

        followup_service = FollowupService(self.llm)
        follow_ups = followup_service.suggest(query, answer, available_columns=schema_columns)

        import re
        sql_upper = sql.upper() if sql else ""
        source_tables = []
        for t in ["accounts", "customers", "loans", "transactions"]:
            if re.search(rf"\b{t}\b", sql_upper, re.IGNORECASE):
                source_tables.append(t)
        if not source_tables:
            source_tables = ["transactions"]

        provenance = ProvenanceInfo(
            source_tables=source_tables,
            row_count=row_count,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # Audit Logging
        data_records = result_df.head(100).to_dict(orient="records") if result_df is not None else []

        safe_parsed = sanitize_for_json(parsed)
        # Use hypothesis_results (objects with SQL) if available, otherwise fallback to raw hypotheses
        hyp_to_save = hypothesis_results if hypothesis_results else hypotheses
        safe_hypotheses = sanitize_for_json(hyp_to_save)
        safe_best_hypothesis = sanitize_for_json(best_hypothesis)
        safe_result_summary = sanitize_for_json({"data": data_records, "row_count": row_count, "explanation": explanation})
        safe_chart_spec = sanitize_for_json(chart_spec)
        safe_follow_ups = sanitize_for_json(follow_ups)
        safe_provenance = sanitize_for_json(provenance.model_dump())

        log = QueryLog(
            user_id=self.user.id,
            session_id=session_id,
            natural_language_query=query,
            generated_sql=sql,
            parsed_intent=safe_parsed,
            hypotheses=safe_hypotheses,
            best_hypothesis=safe_best_hypothesis,
            result_summary=safe_result_summary,
            confidence_score=confidence,
            confidence_reason=confidence_reason,
            chart_spec=safe_chart_spec,
            answer_text=answer,
            follow_up_suggestions=safe_follow_ups,
            provenance=safe_provenance,
            llm_tokens_used=self.llm.total_tokens_used,
            latency_ms=round(elapsed_ms, 1),
        )
        repo = QueryLogRepository(self.db)
        
        try:
            repo.create(log)
        except Exception as e:
            logger.error("Failed to persist QueryLog. Checking JSON fields for un-serializable objects.")
            import json
            fields_to_check = {
                "parsed_intent": safe_parsed,
                "hypotheses": safe_hypotheses,
                "best_hypothesis": safe_best_hypothesis,
                "result_summary": safe_result_summary,
                "chart_spec": safe_chart_spec,
                "follow_up_suggestions": safe_follow_ups,
                "provenance": safe_provenance
            }
            for field, val in fields_to_check.items():
                try:
                    json.dumps(val)
                except Exception as je:
                    logger.error(f"Field '{field}' failed serialization: {je} (type: {type(val)})")
            raise

        return QueryResponse(
            id=log.id,
            answer=answer,
            sql=sql,
            explanation=explanation,
            data=data_records,
            hypotheses=[HypothesisResult(**h) for h in hypothesis_results] if hypothesis_results else [HypothesisResult(hypothesis=h) for h in hypotheses],
            best_hypothesis=(
                HypothesisResult(**best_hypothesis) if best_hypothesis else None
            ),
            confidence=confidence,
            confidence_reason=confidence_reason,
            chart=chart_spec,
            follow_up_suggestions=follow_ups,
            provenance=provenance,
            latency_ms=round(elapsed_ms, 1),
            created_at=log.created_at,
        )

    def _get_glossary_definitions(self) -> List[str]:
        repo = GlossaryRepository(self.db)
        entries = repo.get_all()
        return [f"{e.term}: {e.sql_expression}" for e in entries]

    def _build_session_context(self, session_id: Optional[str]) -> str:
        """Fetch the last 3 queries from the session and format them as context."""
        if not session_id:
            return ""
        try:
            repo = QueryLogRepository(self.db)
            # get_by_session returns newest-first; we want chronological order for the prompt
            prior = repo.get_by_session(session_id, limit=3)
            if not prior:
                return ""
            prior = list(reversed(prior))  # oldest first
            lines = ["\nConversation Context (previous queries in this session):"]
            for p in prior:
                lines.append(f"- Q: {p.natural_language_query}")
                if p.generated_sql:
                    # Include previous SQL for better follow-up context
                    short_sql = p.generated_sql[:300].replace('\n', ' ')
                    lines.append(f"  SQL: {short_sql}")
                if p.answer_text:
                    # Truncate long answers
                    short_answer = p.answer_text[:200].replace('\n', ' ')
                    lines.append(f"  A: {short_answer}")
            lines.append(
                "Use this context to resolve pronouns like 'that', 'it', 'those', "
                "or comparative words like 'compare', 'now show', 'only for'."
            )
            return "\n".join(lines) + "\n"
        except Exception as e:
            logger.warning("Failed to build session context: %s", e)
            return ""

    def _error_response(
        self, query: str, error: str, session_id: Optional[str], start_time: float
    ) -> QueryResponse:
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        error_message = error if error.startswith("Security Alert:") else f"Error: {error}"

        log = QueryLog(
            user_id=self.user.id,
            session_id=session_id,
            natural_language_query=query,
            answer_text=error_message,
            confidence_score=0.0,
            confidence_reason=error,
            latency_ms=round(elapsed_ms, 1),
            llm_tokens_used=self.llm.total_tokens_used,
        )
        repo = QueryLogRepository(self.db)
        repo.create(log)

        return QueryResponse(
            id=log.id,
            answer=error_message,
            confidence=0.0,
            confidence_reason=error,
            latency_ms=round(elapsed_ms, 1),
            created_at=log.created_at,
        )