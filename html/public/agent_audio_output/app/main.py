import asyncio

from dotenv import load_dotenv
from pathlib import Path
from typing import Annotated

from datastar_py.fastapi import (
    DatastarResponse,
    ReadSignals,
    ServerSentEventGenerator as sse,
)
from fastapi import FastAPI, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from websocket_funcs import (
    audio_run_config,
    websocket_to_liverequestqueue,
    run_live_to_websocket,
)

# Load environment variables from .env file BEFORE importing agent
load_dotenv(Path(__file__).parent / ".env")

# Import agent after loading environment variables
# pylint: disable=wrong-import-position
from google_search_agent.agent import agent  # noqa: E402

APP_NAME = "audio_output"
app = FastAPI()

# Mount static files
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

session_service = InMemorySessionService()
runner = Runner(app_name=APP_NAME, agent=agent, session_service=session_service)


@app.get("/")
async def root():
    """Serve the index.html page."""
    return FileResponse(Path(__file__).parent / "static" / "index.html")


async def patch_response_div(prompt):
    yield sse.patch_elements(f"""<div id="response">{prompt}</div>""")


@app.post("/prompt", response_class=StreamingResponse)
async def receive_prompt(prompt: Annotated[str, Form()]):
    return DatastarResponse(patch_response_div(prompt))


@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: str,
    proactivity: bool = False,
    affective_dialog: bool = False,
) -> None:
    """WebSocket endpoint for bidirectional streaming with ADK.

    Args:
        websocket: The WebSocket connection
        user_id: User identifier
        session_id: Session identifier
        proactivity: Enable proactive audio (native audio models only)
        affective_dialog: Enable affective dialog (native audio models only)
    """
    await websocket.accept()
    run_config = audio_run_config(proactivity, affective_dialog)

    # Get or create session (handles both new sessions and reconnections)
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )

    live_request_queue = LiveRequestQueue()

    try:
        await asyncio.gather(
            websocket_to_liverequestqueue(websocket, live_request_queue),
            run_live_to_websocket(
                websocket, runner, run_config, user_id, session_id, live_request_queue
            ),
        )
    except WebSocketDisconnect:
        print("WebSocket Disconnected")
    except Exception as e:
        print(f"Unexpected error in streaming tasks: {e}")
    finally:
        live_request_queue.close()
