# Technical Service Architecture (Self-Serve Analytics BI)

This document provides a strictly technical breakdown of each service in `backend/app/services`, detailing internal class structures, external dependencies, and core algorithmic flows.

---

## 1. `pipeline_service.py` (`PipelineService`)
**Core Role:** Orchestration and State Machine for the AI Query Pipeline.
**Modules/Dependencies:** `asyncio`, `time`, `pandas`, `sqlalchemy`, `app.integrations.llm_client`, all internal services.
**Key Components:**
- Handles the 14-step query workflow.
- Injects `QueryContext` across service boundaries.

**Technical Code Snippet:**
```python
class PipelineService:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.llm = LLMClient() # Initializes GPT-4o wrapper

    def run(self, query: str, session_id: str, complexity: str = "auto") -> PipelineResponse:
        # Step 1: Context Injection
        schema_ctx = SchemaRetrievalService(self.db).retrieve(query)
        glossary = GlossaryService(self.db).get_all_definitions()
        
        # Step 2: Intent Parsing (LLM)
        intent_svc = QueryUnderstandingService(self.llm)
        parsed_intent = intent_svc.parse_intent(query)
        
        # Step 3 & 4: Hypothesis Testing (Conditional Branching)
        if complexity == "high" or (complexity == "auto" and parsed_intent["query_type"] in ["trend", "comparison"]):
            hyp_svc = HypothesisService(self.llm)
            hypotheses = hyp_svc.generate(query, schema_columns)
            hyp_results = HypothesisTestingService(self.llm).test_hypotheses(...)
            best_hypothesis = self._select_best_hypothesis(hyp_results)

        # Step 5: SQL Generation (LLM)
        sql, expl = NL2SQLService(self.llm).generate(query, schema_ctx, glossary, parsed_intent=parsed_intent)
        
        # Step 6: Execution (DuckDB)
        result_df, success = SQLExecutionService().execute(sql)
        
        # Step 7: Downstream Transformations
        chart_spec = ChartService(self.llm).generate(result_df, query)
        answer = AnswerSynthesisService(self.llm).synthesize(query, result_df)
        
        # Step 8: Persistence
        self._log_query(...)
        return PipelineResponse(sql=sql, data=df.to_dict(), chart=chart_spec, ...)
```

---

## 2. `schema_retrieval_service.py` (`SchemaRetrievalService`)
**Core Role:** DDL extraction and LLM Context Preparation.
**Modules/Dependencies:** `sqlalchemy.orm.Session`, `app.repositories.catalog_repository`
**Key Components:**
- Initially used `VectorStore` (FAISS) for semantic search.
- **Current Implementation:** Bypasses vector filtering to return the complete structural topology to ensure referential integrity for SQL generation.

**Technical Code Snippet:**
```python
class SchemaRetrievalService:
    def __init__(self, db: Session):
        self.db = db

    def retrieve(self, query: str, k: int = 10) -> str:
        # BYPASS VECTOR SEARCH: Inject full schema to ensure LLM has complete join context
        entries = CatalogRepository(self.db).get_active()
        
        documents = []
        for entry in entries:
            # Format: Table: t_name, Column: c_name (type): desc | Sample values: [...]
            doc = f"Table: {entry.table_name}, Column: {entry.column_name} ({entry.data_type}): {entry.description}"
            if entry.sample_values:
                doc += f" | Sample values: {entry.sample_values}"
            documents.append(doc)
            
        return "\n".join(documents)
```

---

## 3. `query_understanding_service.py` (`QueryUnderstandingService`)
**Core Role:** Natural Language to Structured JSON Intent Parser.
**Modules/Dependencies:** `json`, `app.integrations.llm_client`
**Key Components:**
- Forces LLM to output a rigid JSON schema defining the query parameters.
- Keys: `query_type`, `group_by`, `time_granularity`, `limit`, `comparison`.

**Technical Code Snippet:**
```python
class QueryUnderstandingService:
    def parse_intent(self, query: str) -> dict:
        prompt = f"""
        Extract the intent of this analytical query: "{query}"
        Must return ONLY JSON:
        {{
            "query_type": "scalar" | "trend" | "grouped" | "comparison" | "ranking" | "distribution",
            "group_by": "column name or none",
            "time_granularity": "day" | "week" | "month" | "year" | "none",
            "limit": int,
            "comparison": "yes" | "no"
        }}
        """
        raw_response = self.llm.chat(prompt, temperature=0)
        return json.loads(raw_response.replace("```json", "").replace("```", ""))
```

---

## 4. `nl2sql_service.py` (`NL2SQLService`)
**Core Role:** SQL Code Generation and Static Analysis.
**Modules/Dependencies:** `re`, `app.core.exceptions.UnsafeSQLException`, `datetime`
**Key Components:**
- Injects intent mapping and relationships into prompt.
- **Security Check:** Implements static regex analysis against `UNSAFE_KEYWORDS` (e.g., DROP, DELETE).

**Technical Code Snippet:**
```python
class NL2SQLService:
    def generate(self, query: str, schema_context: str, ...) -> tuple[str, str]:
        prompt = NL2SQL_PROMPT_TEMPLATE.format(...)
        raw_response = self.llm.chat(prompt, temperature=0)
        sql, explanation = self._parse_json_response(raw_response)
        
        self._validate_safety(sql) # Throws UnsafeSQLException if mutated
        return sql, explanation

    def _validate_safety(self, sql: str) -> None:
        sql_upper = sql.upper().strip()
        if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
            raise UnsafeSQLException("Only SELECT allowed.")
            
        violations = set(re.findall(r'\b\w+\b', sql.lower())) & UNSAFE_KEYWORDS
        if violations:
            raise UnsafeSQLException("Destructive keywords found.")
```

---

## 5. `sql_execution_service.py` (`SQLExecutionService`)
**Core Role:** In-Memory OLAP Execution.
**Modules/Dependencies:** `duckdb`, `pandas`, `sqlite3`
**Key Components:**
- Reads CSV datasets or SQLite representations into Pandas DataFrames.
- Uses DuckDB's `register()` API to execute SQL dynamically against memory-mapped DataFrames without physical DB instantiation.

**Technical Code Snippet:**
```python
class SQLExecutionService:
    def execute(self, sql: str) -> Tuple[Optional[pd.DataFrame], bool]:
        # Lazily loads CSVs into pd.DataFrame objects and normalizes datetimes
        accounts, customers, loans, transactions = _load_dataframes()
        
        con = duckdb.connect()
        try:
            con.register("accounts", accounts)
            con.register("customers", customers)
            con.register("loans", loans)
            con.register("transactions", transactions)
            
            # Fetchdf converts DuckDB arrow tables directly back to pandas DF
            result = con.execute(sql).fetchdf() 
            return result, True
        except Exception:
            return None, False
        finally:
            con.close()
```

---

## 6. `answer_synthesis_service.py` (`AnswerSynthesisService`)
**Core Role:** Natural Language Output Generation & Anomaly Detection.
**Modules/Dependencies:** `pandas`, `datetime`
**Key Components:**
- Implements DataFrame shape detection to route to specific prompts (`ANSWER_SYNTHESIS_SCALAR_PROMPT`, etc.).
- Computes standard deviations (z-scores) dynamically for anomaly flags.

**Technical Code Snippet:**
```python
class AnswerSynthesisService:
    def synthesize(self, query: str, result_df: pd.DataFrame, ...) -> str:
        # Edge Case: DuckDB SUM() on empty sets returns [NaN]
        if result_df is None or result_df.empty or (len(result_df) == 1 and pd.isna(result_df.iloc[0, 0])):
            prompt = ANSWER_SYNTHESIS_NO_DATA_PROMPT.format(query=query)
        else:
            if query_type in ("trend", "grouped"):
                stats = self._compute_stats_summary(result_df)
                prompt = ANSWER_SYNTHESIS_GROUPED_PROMPT.format(..., current_date=datetime.now().strftime("%Y-%m-%d"))
            else:
                prompt = ANSWER_SYNTHESIS_SCALAR_PROMPT.format(...)
        
        return self.llm.chat(prompt)

    @staticmethod
    def detect_anomalies(df: pd.DataFrame) -> str:
        # Z-score computation for anomaly detection on float columns
        for col in df.select_dtypes(include=['number']).columns:
            mean = df[col].mean()
            std = df[col].std()
            z_scores = (df[col] - mean) / std
            outliers = df[z_scores.abs() > 3]
            if not outliers.empty:
                return f"Column '{col}' contains {len(outliers)} unusual outlier(s)."
```

---

## 7. `hypothesis_testing_service.py` (`HypothesisTestingService`)
**Core Role:** Automated Data Mining and Statistical Verification.
**Modules/Dependencies:** `pandas`
**Key Components:**
- Iterates over generated `Hypothesis` objects.
- Uses `NL2SQLService` internally to generate validation SQL.
- Extracts variance metrics dynamically from the resulting DataFrame to mark a hypothesis as Supported or Rejected.

**Technical Code Snippet:**
```python
class HypothesisTestingService:
    def test_hypotheses(self, hypotheses: List[str], schema_context: str) -> List[dict]:
        results = []
        for hyp in hypotheses:
            sql, _ = self.nl2sql.generate(f"Verify this hypothesis: {hyp}", schema_context)
            df, success = self.sql_execution.execute(sql)
            
            status = "Rejected"
            variance = 0
            if success and not df.empty:
                val_col = df.select_dtypes(include=['number']).columns[0]
                if len(df) > 1:
                    max_val = df[val_col].max()
                    min_val = df[val_col].min()
                    variance = ((max_val - min_val) / min_val) * 100 if min_val else 0
                    if variance > 10: # Delta threshold for statistical significance
                        status = "Supported"
                        
            results.append({"hypothesis": hyp, "sql": sql, "status": status})
        return results
```

---

## 8. `chart_service.py` (`ChartService`)
**Core Role:** JSON Graph Specification Generator.
**Modules/Dependencies:** `pandas`, `json`
**Key Components:**
- Dynamically infers DataFrame data types (e.g., `datetime64`, `float64`, `object`) to generate Vega-Lite typings (`temporal`, `quantitative`, `nominal`).
- Forces LLM to strictly adhere to the Vega-Lite v5 JSON schema.

**Technical Code Snippet:**
```python
class ChartService:
    def generate(self, result_df: pd.DataFrame, query: str) -> Optional[dict]:
        if result_df is None or result_df.empty or len(result_df) < 2:
            return None # Scalars do not require charting
            
        columns_meta = []
        for col in result_df.columns:
            dtype = str(result_df[col].dtype)
            vl_type = "quantitative" if "int" in dtype or "float" in dtype else "temporal" if "datetime" in dtype else "nominal"
            columns_meta.append(f"{col} ({vl_type})")
            
        prompt = CHART_PROMPT_TEMPLATE.format(columns=", ".join(columns_meta))
        raw_json = self.llm.chat(prompt)
        
        # Inject data array into the Vega-Lite structure dynamically
        chart_spec = json.loads(raw_json)
        chart_spec["data"] = {"values": result_df.head(100).to_dict(orient="records")}
        return chart_spec
```
