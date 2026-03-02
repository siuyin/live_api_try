import { startAudioPlayerWorklet } from "/static/js/audioplayer.js";
let socket;

function wsurl() {
	const userId = "demo-user";
	const sessionId = "demo-session-" + Math.random().toString(36).substring(7);
	const hostname = window.location.hostname;
	const protocol = window.location.protocol;
	const wsprot = protocol === "http:" ? "ws" : "wss";
	return `${wsprot}://${hostname}:${window.location.port}/ws/${userId}/${sessionId}`;
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


	socket = wsconnect();

	socket.onopen = (event) => {
		console.log("websocket opened");
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

async function sendMessage(msg) {
	await socket.send(JSON.stringify({type: "text", text: msg}));
	console.log(`sent ${msg}`);
}

// export to global scope
window.playAudio = playAudio;
window.sendMessage = sendMessage;
