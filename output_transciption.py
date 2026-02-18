import asyncio
import pyaudio
from google import genai

client = genai.Client()
model = "gemini-2.5-flash-native-audio-preview-12-2025"
config = {
    "response_modalities": ["AUDIO"],
    "output_audio_transcription": {},
    "system_instruction": "Respond with a clam, authoritative voice as a teacher would speak",
}

# --- pyaudio config ---
FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

pya = pyaudio.PyAudio()
audio_queue_output = asyncio.Queue()
audio_stream = None


async def send_message(session):
    message = "Why is the sky blue?"
    await session.send_client_content(
        turns={"role": "user", "parts": [{"text": message}]},
        turn_complete=True,
    )


async def receive_audio(session):
    """Receives responses from GenAI and puts audio data into the speaker audio queue."""
    while True:
        turn = session.receive()
        async for response in turn:
            if response.server_content and response.server_content.model_turn:
                for part in response.server_content.model_turn.parts:
                    if part.inline_data and isinstance(part.inline_data.data, bytes):
                        audio_queue_output.put_nowait(part.inline_data.data)

            if response.server_content.output_transcription:
                print(
                    response.server_content.output_transcription.text,
                    end="",
                    flush=True,
                )

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


async def main():
    try:
        async with client.aio.live.connect(model=model, config=config) as session:
            async with asyncio.TaskGroup() as tg:
                tg.create_task(send_message(session))
                tg.create_task(receive_audio(session))
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
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Interrupted by user.")
