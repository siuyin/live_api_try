import { startAudioPlayerWorklet } from "./audioplayer.js";

function wsconnect() {
	const socket = new WebSocket("wss://ln03.beyondbroadcast.com:8443/ws");
	socket.binaryType = "arraybuffer";
	return socket;
}

async function playAudio() {
	const result = await startAudioPlayerWorklet();
	const [playerNode, audioContext] = result;
	audioContext.resume();


	const socket = wsconnect();

	socket.onmessage = (event) => {
		playerNode.port.postMessage(event.data);
	};
}

window.playAudio = playAudio; // export to global scope

