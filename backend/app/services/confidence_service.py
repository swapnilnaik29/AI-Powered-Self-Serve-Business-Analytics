from typing import List, Tuple, Optional


class ConfidenceService:
    def compute(
        self,
        success: bool,
        row_count: int,
        hypothesis_results: Optional[List[dict]],
        query: str,
    ) -> Tuple[float, str]:
        if not success:
            return 0.3, "Low confidence due to query execution failure."

        score = 0.6
        reasons = []

        if row_count > 0:
            score += 0.1
            reasons.append("sufficient data available")
        else:
            score -= 0.2
            reasons.append("no data returned")

        if hypothesis_results:
            supported = [h for h in hypothesis_results if h.get("supported")]
            if supported:
                score += 0.15
                reasons.append("hypothesis supported by data")
            else:
                score -= 0.1
                reasons.append("no strong hypothesis support")

        if "why" in query.lower() or "reason" in query.lower():
            score -= 0.05
            reasons.append("reasoning-based query (inherently uncertain)")

        score = round(min(max(score, 0.1), 0.95), 2)

        if score >= 0.65:
            level = "High"
        elif score >= 0.45:
            level = "Moderate"
        else:
            level = "Low"

        explanation = f"{level} confidence because {', '.join(reasons)}."
        return score, explanation
