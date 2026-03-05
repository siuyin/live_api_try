from fastapi import WebSocket, WebSocketDisconnect
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.genai import types


async def websocket_to_liverequestqueue(
    websocket: WebSocket, live_request_queue: LiveRequestQueue
) -> None:
    try:
        while True:
            json_message = await websocket.receive_json()
            if json_message.get("type") == "text":
                live_request_queue.send_content(
                    types.Content(parts=[types.Part(text=json_message["text"])])
                )
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        pass


async def run_live_to_websocket(
    websocket: WebSocket,
    runner: Runner,
    run_config: RunConfig,
    user_id: str,
    session_id: str,
    live_request_queue: LiveRequestQueue,
) -> None:
    """Receives Events from runner.run_live() and sends to WebSocket."""
    async for event in runner.run_live(
        user_id=user_id,
        session_id=session_id,
        live_request_queue=live_request_queue,
        run_config=run_config,
    ):
        event_json = event.model_dump_json(exclude_none=True, by_alias=True)
        await websocket.send_text(event_json)
        # print("run_live: sent event json")


def audio_run_config(
    proactivity: bool | None, affective_dialog: bool | None
) -> RunConfig:
    run_config = RunConfig(
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Fenrir"
                    # voice_name="Leda"
                    # voice_name="Laomedeia"
                    # voice_name="Gacrux"
                    # voice_name="Sulafat"
                )
            )
        ),
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        context_window_compression=types.ContextWindowCompressionConfig(
            trigger_tokens=100000,  # Start compression at ~78% of 128k context
            sliding_window=types.SlidingWindow(
                target_tokens=80000  # Compress to ~62% of context, preserving recent turns
            ),
        ),
        # input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
        proactivity=(
            types.ProactivityConfig(proactive_audio=True) if proactivity else None
        ),
        enable_affective_dialog=affective_dialog if affective_dialog else None,
    )
    return run_config
