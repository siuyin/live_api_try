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

function truncate(text,len) {
	let ret = text || "";
	if (text.length > len) {ret = text.substring(0,len) + "..."} 
	return ret;
}

function tokenUsage(usageMetadata) {
	const u = usageMetadata;
	const pt = u.promptTokenCount || 0;
	const rt = u.candidatesTokenCount || 0;
	const tt = u.totalTokenCount || 0;
	return `token usage: ${tt.toLocaleString()} total (${pt.toLocaleString()} prompt + ${rt.toLocaleString()} response)`;
}

function classifyADKEvent(adkEvent) {
	const author = adkEvent.author || "system";
	const ret=[];
	if (adkEvent.turnComplete) { ret.push("turn complete"); }
	else if (adkEvent.interrupted) { ret.push("interrupted"); }
	else if (adkEvent.inputTranscription) { ret.push(`input transciption: ${truncate(adkEvent.inputTranscription.text,60)}`); }
	else if (adkEvent.outputTranscription) { ret.push(`output transciption: ${truncate(adkEvent.outputTranscription.text,60)}`); }
	else if (adkEvent.usageMetadata) { ret.push(tokenUsage(adkEvent.usageMetadata)); }

	return ret;
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
		const adkEvent = JSON.parse(event.data);
		const ret = classifyADKEvent(adkEvent);
		if (ret.length != 0) { console.log(ret); }

		//playerNode.port.postMessage(event.data);
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
