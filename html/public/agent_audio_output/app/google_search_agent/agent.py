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


def call_grab_car(pickup_address: str, destination_address) -> dict:
    """calls grab car for pickup at pickup_address for destination: destination_address. Returns status and pickup location."""
    print(
        f"calling grab car for pickup at {pickup_address} for destination: {destination_address}"
    )
    return {"status": "success", "pickup": "level 2 private hire pickup point"}


# Default models for Live API with native audio support:
# - Gemini Live API: gemini-2.5-flash-native-audio-preview-12-2025
# - Vertex AI Live API: gemini-live-2.5-flash-native-audio
agent = Agent(
    name="google_search_agent",
    model=os.getenv(
        "DEMO_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"
    ),
    tools=[google_search, turn_on_the_lights, turn_off_the_lights, call_grab_car],
    instruction="You are a helpful assistant that can search the web, turn on or off lights, can call a grab car. Respond with the tone a good friend.",
)
