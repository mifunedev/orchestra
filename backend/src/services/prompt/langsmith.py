import os
from typing import Any


def fetch_prompt(name: str = "orchestra-default") -> Any:
    from langsmith import Client

    client = Client(api_key=os.getenv("LANGSMITH_API_KEY"))
    return client.pull_prompt(name)
