import { startAudioPlayerWorklet } from "./audioplayer.js";

function wsurl() {
	const hostname = window.location.hostname;
	const protocol = window.location.protocol;
	const wsprot = protocol === "http:" ? "ws" : "wss";
	return `${wsprot}://${hostname}:${window.location.port}/ws`;
}

function wsconnect() {
	const socket = new WebSocket(wsurl());
	socket.binaryType = "arraybuffer";
	return socket;
}


async function playAudio() {
	const result = await startAudioPlayerWorklet();
	const [playerNode, audioContext] = result;
	audioContext.resume();


	const socket = wsconnect();

	socket.onopen = (event) => {
		//console.log("websocket opened");
	}

	socket.onmessage = (event) => {
		playerNode.port.postMessage(event.data);
	};

	socket.onclose = (event) => {
		//console.log("websocket closed");
	}

	socket.onerror = (event) => {
		console.error('websocket error:',event);
	}

}

window.playAudio = playAudio; // export to global scope
