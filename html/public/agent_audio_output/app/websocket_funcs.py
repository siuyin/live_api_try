import json

from fastapi import WebSocket
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.genai import types


async def websocket_to_liverequestqueue(
    websocket: WebSocket, live_request_queue: LiveRequestQueue
) -> None:
    while True:
        message = await websocket.receive()
        if "text" in message:
            json_message = json.loads(message["text"])
            if json_message.get("type") == "text":
                live_request_queue.send_content(
                    types.Content(parts=[types.Part(text=json_message["text"])])
                )
                print(f"sent {json_message['text']} to live_request_queue")


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


def audio_run_config(
    proactivity: bool | None, affective_dialog: bool | None
) -> RunConfig:
    run_config = RunConfig(
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Gacrux"
                    # voice_name="Sulafat"
                )
            )
        ),
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        # input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
        proactivity=(
            types.ProactivityConfig(proactive_audio=True) if proactivity else None
        ),
        enable_affective_dialog=affective_dialog if affective_dialog else None,
    )
    return run_config
