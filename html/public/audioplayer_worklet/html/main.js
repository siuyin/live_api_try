import { startAudioPlayerWorklet } from "./audioplayer.js";

function wsconnect() {
	const socket = new WebSocket("ws://localhost:8080/ws");
	socket.binaryType = "arraybuffer";
	return socket;
}

async function playAudio() {
	const result = await startAudioPlayerWorklet();
	const [playerNode, audioContext] = result;


	const socket = wsconnect();

	socket.onmessage = (event) => {
		playerNode.port.postMessage(event.data);
		audioContext.resume();
	};
}

window.playAudio = playAudio; // export to global scope

