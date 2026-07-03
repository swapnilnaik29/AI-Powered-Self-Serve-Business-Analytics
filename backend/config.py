import os
import httpx
from openai import OpenAI
from dotenv import load_dotenv

def get_client():
    # Expect the API key to be set via env or Streamlit secrets
    load_dotenv()
    if "OPENAI_API_KEY" not in os.environ:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. "
            "Set it via environment variable or Streamlit secrets."
        )

    return OpenAI(
        http_client=httpx.Client(verify=False)
    )
