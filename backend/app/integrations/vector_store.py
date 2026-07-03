import logging
from typing import List

import numpy as np
from app.core.config import get_settings
from app.integrations.llm_client import get_llm_client

logger = logging.getLogger(__name__)

settings = get_settings()

client = get_llm_client()


# ----------------------------------------
# EMBEDDING FUNCTION
# ----------------------------------------
def get_embedding(text: str) -> np.ndarray:
    try:
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )

        embedding = response.data[0].embedding
        return np.array(embedding, dtype=np.float32)

    except Exception as e:
        logger.error("Embedding failed: %s", str(e))
        raise


# ----------------------------------------
# VECTOR STORE (FAISS)
# ----------------------------------------
class VectorStore:
    """FAISS-backed vector store for schema retrieval."""

    def __init__(self):
        self.index = None
        self.documents: List[str] = []

    def build_index(self, documents: List[str]) -> None:
        import faiss

        if not documents:
            logger.warning("No documents to index")
            return

        self.documents = documents

        # Generate embeddings
        embeddings = [get_embedding(doc) for doc in documents]
        embeddings_np = np.array(embeddings, dtype=np.float32)

        # Create FAISS index
        self.index = faiss.IndexFlatL2(embeddings_np.shape[1])
        self.index.add(embeddings_np)

        logger.info("Vector index built with %d documents", len(documents))

    def search(self, query: str, k: int = 5) -> List[str]:
        if self.index is None or not self.documents:
            return []

        q_emb = get_embedding(query)
        q_np = np.array([q_emb], dtype=np.float32)

        _, indices = self.index.search(q_np, min(k, len(self.documents)))

        return [
            self.documents[i]
            for i in indices[0]
            if 0 <= i < len(self.documents)
        ]