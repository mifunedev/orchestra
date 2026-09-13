import httpx
from uuid import uuid4
from datetime import datetime, timezone

try:
    from fastapi.openapi.models import Example
except ImportError:
    Example = dict


def get_arcade_response_example():
    return httpx.get(
        "https://raw.githubusercontent.com/ryaneggz/static/refs/heads/main/enso/mock-response-arcade.json"
    ).json()


MCP_SERVER_EXAMPLE = {
    "transport": "sse",
    "url": "https://mcp.mifune.dev/sse",
    "headers": {"x-mcp-key": "your_api_key"},
}
MCP_DICT_EXAMPLE = {"orchestra_mcp": MCP_SERVER_EXAMPLE}
MCP_REQ_BODY_EXAMPLE = {"mcp": MCP_DICT_EXAMPLE}

A2A_SERVER_EXAMPLE = {
    "base_url": "https://a2a.mifune.dev",
    "agent_card_path": "/.well-known/agent.json",
}
A2A_DICT_EXAMPLE = {"currency_agent": A2A_SERVER_EXAMPLE}

ARCADE_REQ_BODY_EXAMPLE = {"arcade": {"tools": ["Web.ScrapeUrl"], "toolkits": ["Google"]}}

ARCADE_RESPONSE_EXAMPLE = get_arcade_response_example()


def get_example_metadata(
    project_id: bool = False,
    assistant_id: bool = False,
    thread_id: bool = False,
    checkpoint_id: bool = False,
):
    metadata = {
        "language": "en-US",
        "timezone": "America/Denver",
        "current_utc": datetime.now(timezone.utc).isoformat(),
    }
    if project_id:
        metadata["project_id"] = str(uuid4())
    if assistant_id:
        metadata["assistant_id"] = str(uuid4())
    if thread_id:
        metadata["thread_id"] = str(uuid4())
    if checkpoint_id:
        metadata["checkpoint_id"] = str(uuid4())
    return metadata


def get_airtable_spec():
    return httpx.get("https://raw.githubusercontent.com/ryaneggz/static/refs/heads/main/enso/airtable-spec.json").json()


NEW_THREAD_API_TOOLS = {
    "system": "You are",
    "query": "List all the bases in Airtable",
    "model": "openai:o3-mini",
    "memory": True,
    "images": [],
    "tools": [
        {
            "name": "Airtable Tools",
            "description": "Airtable Tools",
            "headers": {"x-api-key": "1234567890"},
            "spec": get_airtable_spec(),
        }
    ],
}

NEW_THREAD_ANSWER_EXAMPLE = {
    "thread_id": "443250c4-b9ec-4dfc-96fd-0eb3ec6ccb44",
    "answer": {
        "content": "The capital of France is Paris.",
        "additional_kwargs": {},
        "response_metadata": {
            "id": "msg_01MBf5kez6rvPXKLiF5cquS6",
            "model": "claude-3-5-sonnet-20240620",
            "stop_reason": "end_turn",
            "stop_sequence": None,
            "usage": {"input_tokens": 20, "output_tokens": 10},
        },
        "type": "ai",
        "name": None,
        "id": "run-1a31cbe1-e361-424d-bad4-d106d0b32256-0",
        "example": False,
        "tool_calls": [],
        "invalid_tool_calls": [],
        "usage_metadata": {
            "input_tokens": 20,
            "output_tokens": 10,
            "total_tokens": 30,
            "input_token_details": {},
        },
    },
}


EXISTING_THREAD_ANSWER_EXAMPLE = {
    "thread_id": "443250c4-b9ec-4dfc-96fd-0eb3ec6ccb44",
    "answer": {
        "content": "The capital of Germany is Berlin.",
        "additional_kwargs": {},
        "response_metadata": {
            "id": "msg_01NRjVLzASk28A1JaNXj1TwV",
            "model": "claude-3-5-sonnet-20240620",
            "stop_reason": "end_turn",
            "stop_sequence": None,
            "usage": {"input_tokens": 37, "output_tokens": 10},
        },
        "type": "ai",
        "name": None,
        "id": "run-6f5b5cc4-2b45-4486-8f92-ef14762039bc-0",
        "example": False,
        "tool_calls": [],
        "invalid_tool_calls": [],
        "usage_metadata": {
            "input_tokens": 37,
            "output_tokens": 10,
            "total_tokens": 47,
            "input_token_details": {},
        },
    },
}

THREAD_HISTORY_EXAMPLE = {
    "thread_id": "443250c4-b9ec-4dfc-96fd-0eb3ec6ccb44",
    "messages": [
        {
            "content": "You are a helpful assistant.",
            "additional_kwargs": {},
            "response_metadata": {},
            "type": "system",
            "name": None,
            "id": "8b6c3e63-a564-4738-8cd1-83f726efdd26",
        },
        {
            "content": "What is the capital of France?",
            "additional_kwargs": {},
            "response_metadata": {},
            "type": "human",
            "name": None,
            "id": "e70c5a2f-9a67-40d5-bdcd-f703edd1febe",
            "example": False,
        },
        {
            "content": "The capital of France is Paris.",
            "additional_kwargs": {},
            "response_metadata": {
                "id": "msg_01MBf5kez6rvPXKLiF5cquS6",
                "model": "claude-3-5-sonnet-20240620",
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_tokens": 20, "output_tokens": 10},
            },
            "type": "ai",
            "name": None,
            "id": "run-1a31cbe1-e361-424d-bad4-d106d0b32256-0",
            "example": False,
            "tool_calls": [],
            "invalid_tool_calls": [],
            "usage_metadata": {
                "input_tokens": 20,
                "output_tokens": 10,
                "total_tokens": 30,
                "input_token_details": {},
            },
        },
        {
            "content": "What about Germany?",
            "additional_kwargs": {},
            "response_metadata": {},
            "type": "human",
            "name": None,
            "id": "2215e75a-d440-4f95-acd0-c4ae5ae034f1",
            "example": False,
        },
        {
            "content": "The capital of Germany is Berlin.",
            "additional_kwargs": {},
            "response_metadata": {
                "id": "msg_01NRjVLzASk28A1JaNXj1TwV",
                "model": "claude-3-5-sonnet-20240620",
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_`tokens": 37, "output_tokens": 10},
            },
            "type": "ai",
            "name": None,
            "id": "run-6f5b5cc4-2b45-4486-8f92-ef14762039bc-0",
            "example": False,
            "tool_calls": [],
            "invalid_tool_calls": [],
            "usage_metadata": {
                "input_tokens": 37,
                "output_tokens": 10,
                "total_tokens": 47,
                "input_token_details": {},
            },
        },
    ],
}

ADD_DOCUMENTS_EXAMPLE = {
    "documents": [
        {
            "metadata": {
                "title": "The Boy Who Cried Wolf",
                "source": "https://en.wikipedia.org/wiki/The_Boy_Who_Cried_Wolf",
            },
            "page_content": (
                "The boy who cried wolf is a story about a boy who cried wolf "
                "to trick the villagers into thinking there was a wolf when there wasn't."
            ),
        },
        {
            "metadata": {
                "title": "The Three Little Pigs",
                "source": "https://en.wikipedia.org/wiki/The_Three_Little_Pigs",
            },
            "page_content": (
                "The three little pigs went to the market. "
                "One pig went to the store and bought a pound of sugar. "
                "Another pig went to the store and bought a pound of flour. "
                "The third pig went to the store and bought a pound of lard."
            ),
        },
        {
            "metadata": {
                "title": "Little Red Riding Hood",
                "source": "https://en.wikipedia.org/wiki/Little_Red_Riding_Hood",
            },
            "page_content": (
                "Little Red Riding Hood is a story about a young girl who "
                "goes to visit her grandmother, but is tricked by the wolf."
            ),
        },
    ]
}

LIST_DOCUMENTS_EXAMPLE = {
    "documents": [
        {
            "id": "317369e3-d061-4a7c-afea-948edea9856b",
            "text": (
                "The boy who cried wolf is a story about a boy "
                "who cried wolf to trick the villagers into thinking "
                "there was a wolf when there wasn't."
            ),
            "metadata": {
                "source": "https://en.wikipedia.org/wiki/The_Boy_Who_Cried_Wolf",
                "title": "The Boy Who Cried Wolf",
            },
            "type": "Document",
        },
        {
            "id": "84d83f48-b01b-4bf3-b027-765c61772344",
            "text": (
                "The three little pigs went to the market. One pig went to the store and bought "
                "a pound of sugar. Another pig went to the store and bought a pound of flour. "
                "The third pig went to the store and bought a pound of lard."
            ),
            "metadata": {
                "source": "https://en.wikipedia.org/wiki/The_Three_Little_Pigs",
                "title": "The Three Little Pigs",
            },
        },
    ]
}

A2A_GET_AGENT_CARD_EXAMPLE = {
    "agent_cards": [
        {
            "name": "Currency Agent",
            "description": "Helps with exchange rates for currencies",
            "url": "http://0.0.0.0:10000/",
            "provider": None,
            "version": "1.0.0",
            "documentationUrl": None,
            "capabilities": {
                "streaming": True,
                "pushNotifications": True,
                "stateTransitionHistory": False,
            },
            "authentication": None,
            "defaultInputModes": ["text", "text/plain"],
            "defaultOutputModes": ["text", "text/plain"],
            "skills": [
                {
                    "id": "convert_currency",
                    "name": "Currency Exchange Rates Tool",
                    "description": "Helps with exchange values between various currencies",
                    "tags": ["currency conversion", "currency exchange"],
                    "examples": ["What is exchange rate between USD and GBP?"],
                    "inputModes": None,
                    "outputModes": None,
                }
            ],
        }
    ]
}

LOGIN_RESPONSE_EXAMPLE = Example(
    summary="login_response",
    description="Login Response",
    value={
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer",
        "user": {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "username": "johndoe",
            "email": "john@example.com",
            "name": "John Doe",
        },
    },
)

SCHEDULE_CREATED_RESPONSE_EXAMPLE = Example(
    {
        "schedule": {
            "id": "3e2d3989-c701-43c2-bac7-05490508eabc",
            "task": {
                "metadata": {
                    "thread_id": "thread-uuid-here",  # Required
                    "assistant_id": "assistant-uuid-here",  # Required
                },
            },
            "next_run_time": "2025-10-04T18:27:00-06:00",
        }
    }
)

SCHEDULE_FIND_EXAMPLE = Example(
    {
        "schedule": {
            "id": "3e2d3989-c701-43c2-bac7-05490508eabc",
            "trigger": {"type": "cron", "expression": "0 1 * * *"},
            "task": {
                "model": "openai:gpt-5-nano",
                "system": "You are a helpful assistant.",
                "messages": [{"role": "user", "content": "Weather in Dallas?"}],
            },
            "next_run_time": "2025-10-04T18:27:00-06:00",
        }
    }
)

SCHEDULE_LIST_EXAMPLE = Example(
    {
        "schedules": [
            {
                "id": "3e2d3989-c701-43c2-bac7-05490508eabc",
                "trigger": {"type": "cron", "expression": "0 1 * * *"},
                "task": {
                    "model": "openai:gpt-5-nano",
                    "system": "You are a helpful assistant.",
                    "tools": ["get_weather"],
                    "a2a": {},
                    "mcp": {},
                    "subagents": [],
                    "metadata": {},
                    "messages": [{"role": "user", "content": "Weather in Dallas?"}],
                },
                "next_run_time": "2025-10-04T18:27:00-06:00",
            }
        ]
    }
)
SCHEDULE_CREATE_EXAMPLE = Example(
    {
        "title": "Daily Weather Check",
        "trigger": {"type": "cron", "expression": "0 1 * * *"},
        "task": {
            "model": "openai:gpt-5-nano",
            "system": "You are a helpful assistant.",
            "messages": [{"role": "user", "content": "Weather in Dallas?"}],
            "tools": ["get_weather"],
            "metadata": {
                "thread_id": "thread-uuid-here",  # Required
            },
        },
    }
)

SCHEDULE_UPDATE_EXAMPLE = Example(
    {
        "title": "Updated Daily Weather Check",
        "trigger": {"type": "cron", "expression": "0 2 * * *"},
        "task": {
            "model": "openai:gpt-5-nano",
            "system": "You are a helpful assistant.",
            "messages": [{"role": "user", "content": "Updated weather check for Dallas?"}],
            "tools": ["get_weather"],
            "metadata": {
                "thread_id": "thread-uuid-here",  # Required
            },
        },
    }
)


THREAD_CREATE_EXAMPLE = Example(
    summary="thread_create",
    description="Create Thread",
    value={
        # "messages": [{"role": "user", "content": "What is the capital of France?"}],
        "title": "Python: Fetch Last 3 Posts",
        "todos": [
            {
                "content": "Explain how to convert JSON to DataFrame in Python using pandas.",
                "status": "completed",
            }
        ],
        "files": {
            "/hello_world.py": {
                "content": ["print('Hello, World!')"],
            },
            "/fetch_last_posts.py": {
                "content": [
                    "import requests",
                    "import json",
                    "",
                    "response = requests.get('https://jsonplaceholder.typicode.com/posts')",
                    "posts = response.json()",
                    "",
                    "# Get last 3 posts by ID (highest IDs)",
                    "last_three = sorted(posts, key=lambda p: p['id'], reverse=True)[:3]",
                    "",
                    "# Save to file",
                    "with open('last_posts.json', 'w') as f:",
                    " json.dump(last_three, f, indent=4)",
                    "",
                    'print("Saved last 3 posts to last_posts.json")',
                    "print(json.dumps(last_three, indent=4))",
                ],
            },
        },
        "metadata": get_example_metadata(),
    },
)

THREAD_CREATE_EXAMPLE_WITH_ASSISTANT = Example(
    summary="thread_create_with_assistant",
    description="Create Thread with Assistant",
    value={
        "title": "Python: Fetch Last 3 Posts",
        "metadata": get_example_metadata(assistant_id=True),
        "files": {
            "/hello_world.py": {
                "content": ["print('Hello, World!')"],
            },
        },
        "todos": [],
    },
)

SCHEDULE_CREATE_ASSISTANT_EXAMPLE = Example(
    summary="schedule_create_assistant",
    description="Create Schedule with Assistant ID",
    value={
        "title": "Daily Weather Check",
        "trigger": {"type": "cron", "expression": "*/1 * * * *"},
        "task": {
            "input": {
                "messages": [{"role": "user", "content": "Weather in Dallas?"}],
            },
            "metadata": {
                ## TODO: Add support when files work correctly for llm requests
                # "thread_id": "thread-uuid-here",
                "assistant_id": "assistant-uuid-here",
            },
        },
    },
)


class Examples:
    ASSISTANT_SEARCH_EXAMPLES = {
        "search_assistants": Example(
            summary="search_assistants",
            description="Search Assistants",
            value={
                "limit": 200,
                "offset": 0,
                "sort": "updated_at",
                "sort_order": "desc",
                "filter": {},
            },
        ),
        "get_assistant": Example(
            summary="get_assistant",
            description="Get Assistant by ID",
            value={"filter": {"id": "assistant-uuid-here"}},
        ),
    }
    LOGIN_RESPONSE_EXAMPLE = LOGIN_RESPONSE_EXAMPLE
    EXISTING_THREAD_ANSWER_EXAMPLE = EXISTING_THREAD_ANSWER_EXAMPLE
    THREAD_HISTORY_EXAMPLE = THREAD_HISTORY_EXAMPLE
    ADD_DOCUMENTS_EXAMPLE = ADD_DOCUMENTS_EXAMPLE
    LIST_DOCUMENTS_EXAMPLE = LIST_DOCUMENTS_EXAMPLE
    A2A_GET_AGENT_CARD_EXAMPLE = A2A_GET_AGENT_CARD_EXAMPLE
    SCHEDULE_LIST_EXAMPLE = SCHEDULE_LIST_EXAMPLE
    SCHEDULE_CREATED_RESPONSE_EXAMPLE = SCHEDULE_CREATED_RESPONSE_EXAMPLE
    SCHEDULE_CREATE_EXAMPLES = {
        # "schedule_create": SCHEDULE_CREATE_EXAMPLE,
        "schedule_create_assistant": SCHEDULE_CREATE_ASSISTANT_EXAMPLE,
    }
    SCHEDULE_UPDATE_EXAMPLE = SCHEDULE_UPDATE_EXAMPLE
    SCHEDULE_FIND_EXAMPLE = SCHEDULE_FIND_EXAMPLE
    THREAD_CREATE_EXAMPLES = {
        "thread_create": THREAD_CREATE_EXAMPLE,
        "thread_create_with_assistant": THREAD_CREATE_EXAMPLE_WITH_ASSISTANT,
    }
    THREAD_SEARCH_EXAMPLES = {
        "list_threads": Example(
            summary="list_threads",
            description="List Threads in Checkpointer",
            value={"limit": 10, "offset": 0, "metadata": {}},
        ),
        "list_checkpoints": Example(
            summary="list_checkpoints",
            description="List Checkpoints for Thread",
            value={"limit": 10, "offset": 0, "metadata": {"thread_id": "thread_123"}},
        ),
        "get_checkpoint": Example(
            summary="get_checkpoint",
            description="Get Checkpoint for Thread",
            value={
                "limit": 10,
                "offset": 0,
                "metadata": {
                    "thread_id": "thread_123",
                    "checkpoint_id": "checkpoint_123",
                },
            },
        ),
    }
    THREAD_SEMANTIC_SEARCH_EXAMPLES = {
        "semantic_search": Example(
            summary="semantic_search",
            description="Search threads using natural language",
            value={
                "query": "threads about database optimization",
                "limit": 10,
                "assistant_id": None,
            },
        ),
        "semantic_search_with_assistant": Example(
            summary="semantic_search_with_assistant",
            description="Search threads for a specific assistant",
            value={
                "query": "conversations about authentication",
                "limit": 5,
                "assistant_id": "assistant-uuid-here",
            },
        ),
    }

    LLM_INVOKE_EXAMPLES = {
        "stateless_invoke": Example(
            summary="stateless_invoke",
            description="LLM Stateless",
            value={
                "model": "openai:gpt-5-nano",
                "system": "You are a helpful assistant.",
                "messages": [{"role": "user", "content": "Weather in Dallas?"}],
                "tools": [],
                "mcp": {},
            },
        ),
        "persistant_thread": Example(
            summary="persistent_thread",
            description="LLM with Persistant Thread",
            value={
                "model": "openai:gpt-5-nano",
                "system": "You are a helpful assistant.",
                "metadata": {"thread_id": str(uuid4())},
                "messages": [{"role": "user", "content": "Weather in Dallas?"}],
            },
        ),
        "branch_from_checkpoint": Example(
            summary="branch_from_checkpoint",
            description="Invoke LLM",
            value={
                "model": "openai:gpt-5-nano",
                "system": "You are a helpful assistant.",
                "metadata": {
                    "thread_id": str(uuid4()),
                    "checkpoint_id": str(uuid4()),
                },
                "messages": [{"role": "user", "content": "Weather in Dallas?"}],
            },
        ),
        "python_sandbox": Example(
            summary="python_sandbox",
            description="LLM with Python Sandbox",
            value={
                "model": "openai:gpt-4.1-mini",
                "system": "You are a helpful assistant, that can execute python code in a sandbox to complete tasks.",
                "tools": ["python_sandbox"],
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": "Execute python file ./fib.py and return results.",
                        }
                    ],
                    "files": {
                        "/fib.py": {
                            "content": [
                                "def fibonacci(n):",
                                "    sequence = [0, 1]",
                                "    while len(sequence) < n:",
                                "        sequence.append(sequence[-1] + sequence[-2])",
                                "    return sequence[:n]",
                                "",
                                'if __name__ == "__main__":',
                                "    print(fibonacci(10))",
                                "",
                            ],
                            "created_at": "2025-12-23T21:10:06.470896+00:00",
                            "modified_at": "2025-12-23T21:10:06.470896+00:00",
                        }
                    },
                },
                "metadata": get_example_metadata(thread_id=True),
            },
        ),
        "assistant_query": Example(
            summary="assistant_query",
            description="LLM with Assistant Query",
            value={
                "messages": [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": "100 USD to CAD?"}],
                    }
                ],
                "metadata": get_example_metadata(assistant_id=True),
            },
        ),
    }

    TOOL_CREATE_EXAMPLES = {
        "base_tool_override": Example(
            name="Base Tool Override",
            description="Override the base tool for a custom tool.",
            value={
                "name": "webhook_marketing_channel",
                "config": {
                    "base_tool": "send_webhook_to_channel",
                },
                "description": "Send a message to the Microsoft Teams channel.",
                "type": "default",
                "metadata": {},
                "env": {"TEST_WEBHOOK_URL": "https://example.com/webhook"},
                "tags": ["example"],
                "verbose": False,
                "disabled": False,
                "public": False,
            },
        ),
        "api_tool_get_request": Example(
            name="API Tool GET Request",
            description="Use this to make a GET request to an API.",
            value={
                "name": "get_server_health",
                "config": {
                    "api_tool": {
                        "base_url": "http://localhost:8000/api",
                        "method": "GET",
                        "endpoint": "/info/health",
                    }
                },
                "description": "Use this to get the health of the server and app version.",
                "type": "api",
                "metadata": {},
                "env": {},
                "tags": ["health"],
                "verbose": False,
                "disabled": False,
                "public": False,
            },
        ),
        "api_tool_post_request": Example(
            name="API Tool POST Request",
            description="Use this to make a POST request to an API.",
            value={
                "name": "create_blog_post",
                "config": {
                    "api_tool": {
                        "base_url": "https://jsonplaceholder.typicode.com",
                        "method": "POST",
                        "endpoint": "/posts",
                        "args_schema": {
                            "title": {
                                "type": "str",
                                "description": "The title of the blog post",
                                "required": True,
                            },
                            "body": {
                                "type": "str",
                                "description": "The body of the blog post",
                                "required": True,
                            },
                        },
                        "headers": {
                            "Content-type": "application/json; charset=UTF-8",
                        },
                    },
                },
                "description": "Create a blog post",
                "type": "api",
            },
        ),
        "mcp_sse_server": Example(
            name="MCP Streamable HTTP",
            description="Use this to connect to a MCP server that supports streamable HTTP.",
            value={
                "name": "mcp_sse_server",
                "config": {
                    "mcp_tool": {
                        "orchestra_mcp": {
                            "transport": "sse",
                            "url": "https://mcp.mifune.dev/sse",
                            "headers": {"x-mcp-key": "test1234"},
                        }
                    }
                },
                "description": "Use this MCP server for web_search, web_scrape, and python_repl tools.",
                "type": "mcp",
                "tags": ["mcp", "web", "python"],
                "disabled": False,
                "public": False,
            },
        ),
    }

    LLM_STREAM_EXAMPLES = {
        "stateless_stream_instructions": Example(
            summary="stateless_stream_instructions",
            description="LLM Stateless",
            value={
                "model": "openai:gpt-5-nano",
                "instructions": "You are a weather assistant.",
                "tools": ["get_weather"],
                "input": {
                    "messages": [{"role": "user", "content": "Weather in Dallas?"}],
                },
            },
        ),
        "stateless_stream_system": Example(
            summary="stateless_stream_system",
            description="LLM Stateless",
            value={
                "model": "openai:gpt-5-nano",
                "system": "You are a weather assistant. Only output format in Celsius.",
                "tools": ["get_weather"],
                "input": {
                    "messages": [{"role": "user", "content": "Weather in Dallas?"}],
                },
            },
        ),
        "python_sandbox": Example(
            summary="python_sandbox",
            description="LLM with Python Sandbox",
            value={
                "model": "openai:gpt-4.1-mini",
                "system": "You are a helpful assistant, that can execute python code in a sandbox to complete tasks.",
                "tools": ["python_sandbox"],
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": "Execute python file ./fib.py and return results.",
                        }
                    ],
                    "files": {
                        "/fib.py": {
                            "content": [
                                "def fibonacci(n):",
                                "    sequence = [0, 1]",
                                "    while len(sequence) < n:",
                                "        sequence.append(sequence[-1] + sequence[-2])",
                                "    return sequence[:n]",
                                "",
                                'if __name__ == "__main__":',
                                "    print(fibonacci(10))",
                                "",
                            ],
                            "created_at": "2025-12-23T21:10:06.470896+00:00",
                            "modified_at": "2025-12-23T21:10:06.470896+00:00",
                        }
                    },
                },
                "metadata": get_example_metadata(thread_id=True),
            },
        ),
        "branch_from_checkpoint": Example(
            summary="branch_from_checkpoint",
            description="LLM with Branch from Checkpoint",
            value={
                "model": "openai:gpt-5-nano",
                "system": "You are a helpful assistant.",
                "metadata": get_example_metadata(thread_id=True, checkpoint_id=True),
                "input": {
                    "messages": [{"role": "user", "content": "Weather in Dallas?"}],
                },
            },
        ),
        "assistant_query": Example(
            summary="assistant_query",
            description="LLM with Assistant Query",
            value={
                "input": {
                    "messages": [{"role": "user", "content": "100 USD to CAD?"}],
                },
                "metadata": get_example_metadata(assistant_id=True),
            },
        ),
        "assistant_query_project": Example(
            summary="assistant_query_project",
            description="LLM with Assistant Query",
            value={
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": "100 USD to CAD? Compare against previous exchange rates.",
                        }
                    ],
                },
                "metadata": get_example_metadata(assistant_id=True, project_id=True),
            },
        ),
        "stream_with_custom_modes": Example(
            summary="stream_with_custom_modes",
            description="LLM Stream with custom stream_mode",
            value={
                "model": "openai:gpt-5-nano",
                "system": "You are a helpful assistant.",
                "stream_mode": ["messages", "values", "updates"],
                "input": {
                    "messages": [{"role": "user", "content": "Weather in Dallas?"}],
                },
            },
        ),
    }

    ASSISTANT_EXAMPLES = {
        "currency_agent": Example(
            name="Currency Agent",
            description="Helps with exchange rates for currencies",
            model="openai:gpt-5-nano",
            prompt="You are a helpful assistant.",
            tools=["web_search"],
            mcp=MCP_REQ_BODY_EXAMPLE["mcp"],
            a2a=A2A_DICT_EXAMPLE,
            metadata={},
        ),
    }

    INVOKE_TOOLS_EXAMPLE = [
        {"name": "get_stock_price", "args": {"symbol": "AAPL"}},
        {"name": "get_weather", "args": {"location": "New York"}},
    ]
