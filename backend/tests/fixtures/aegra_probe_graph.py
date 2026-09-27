import asyncio
from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class ProbeState(TypedDict, total=False):
    message: str
    result: str
    delay: float


async def respond(state: ProbeState) -> ProbeState:
    await asyncio.sleep(min(float(state.get("delay", 0)), 15))
    return {"result": f"probe:{state.get('message', '')}"}


builder = StateGraph(ProbeState)
builder.add_node("respond", respond)
builder.add_edge(START, "respond")
builder.add_edge("respond", END)
graph = builder.compile()
