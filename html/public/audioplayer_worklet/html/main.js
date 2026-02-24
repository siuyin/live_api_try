import { startAudioPlayerWorklet } from "./audioplayer.js";

function wsconnect() {
	const hostname = window.location.hostname;
	const socket = new WebSocket(`wss://${hostname}:8443/ws`);
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

