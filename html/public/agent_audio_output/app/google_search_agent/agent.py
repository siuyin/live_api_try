import os

from google.adk.agents import Agent
from google.adk.tools import google_search


def turn_on_the_lights() -> dict:
    """turns on the lights"""
    print("lights on")
    return {"status": "success", "lights": "on"}


def turn_off_the_lights() -> dict:
    """turns off the lights"""
    print("lights off")
    return {"status": "success", "lights": "off"}


# Default models for Live API with native audio support:
# - Gemini Live API: gemini-2.5-flash-native-audio-preview-12-2025
# - Vertex AI Live API: gemini-live-2.5-flash-native-audio
agent = Agent(
    name="google_search_agent",
    model=os.getenv(
        "DEMO_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"
    ),
    tools=[google_search, turn_on_the_lights, turn_off_the_lights],
    instruction="You are a helpful assistant that can search the web and turn on or off lights. Respond with the tone a good friend.",
)
