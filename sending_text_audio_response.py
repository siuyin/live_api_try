import asyncio
from google import genai
import pyaudio
import sys

client = genai.Client()

# --- pyaudio config ---
FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

pya = pyaudio.PyAudio()

# --- Live API config ---
MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
CONFIG = {
    "response_modalities": ["AUDIO"],
    "system_instruction": "You are a helpful and friendly AI assistant.",
    "speech_config": {
        # "voice_config": {"prebuilt_voice_config": {"voice_name": "Erinome"}}
        "voice_config": {"prebuilt_voice_config": {"voice_name": "Leda"}}
    },
}

audio_queue_output = asyncio.Queue()
audio_queue_mic = asyncio.Queue(maxsize=5)
audio_stream = None


async def send_msg(session):
    """Reads the keyboard for message input, then sends it to the GenAI session."""
    while True:
        msg = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
        await session.send_client_content(
            turns=[{"role": "user", "parts": [{"text": msg}]}], turn_complete=True
        )


async def send_msg_old(session):
    """Sends audio from the mic audio queue to the GenAI session."""
    while True:
        msg = await audio_queue_mic.get()
        await session.send_msg_input(audio=msg)


async def receive_audio(session):
    """Receives responses from GenAI and puts audio data into the speaker audio queue."""
    while True:
        turn = session.receive()
        async for response in turn:
            if response.server_content and response.server_content.model_turn:
                for part in response.server_content.model_turn.parts:
                    if part.inline_data and isinstance(part.inline_data.data, bytes):
                        audio_queue_output.put_nowait(part.inline_data.data)

        # Empty the queue on interruption to stop playback
        while not audio_queue_output.empty():
            audio_queue_output.get_nowait()


async def play_audio():
    """Plays audio from the speaker audio queue."""
    stream = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=RECEIVE_SAMPLE_RATE,
        output=True,
        output_device_index=0,
    )
    while True:
        bytestream = await audio_queue_output.get()
        await asyncio.to_thread(stream.write, bytestream)


async def run():
    """Main function to run the audio loop."""
    try:
        async with client.aio.live.connect(model=MODEL, config=CONFIG) as live_session:
            print("Connected to Gemini. Start entering text followed by <Enter>")
            async with asyncio.TaskGroup() as tg:
                tg.create_task(send_msg(live_session))
                tg.create_task(receive_audio(live_session))
                tg.create_task(play_audio())
    except asyncio.CancelledError:
        pass
    finally:
        if audio_stream:
            audio_stream.close()
        pya.terminate()
        print("\nConnection closed.")


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print("Interrupted by user.")
