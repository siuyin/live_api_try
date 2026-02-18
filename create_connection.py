import asyncio
from google import genai

client = genai.Client()

model = "gemini-2.5-flash-native-audio-preview-12-2025"
config = {"response_modalities": ["AUDIO"]}


async def main():
    async with client.aio.live.connect(model=model, config=config) as session:
        print("Session started")
        # Send content...


if __name__ == "__main__":
    asyncio.run(main())
