// playAudio is the main routine. Start there

import { startAudioPlayerWorklet } from "/static/js/audioplayer.js";
let socket;
let playerNode;
let audioContext;

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

function hasContentParts(adkEvent) {
  if (adkEvent.content && adkEvent.content.parts) {
    return true;
  }
  return false;
}

function hasText(adkEvent) {
  return adkEvent.content.parts.some(p => p.text);
}
function hasAudio(adkEvent) {
  return adkEvent.content.parts.some(p => p.inlineData);
}
function hasExecutableCode(adkEvent) {
  return adkEvent.content.parts.some(p => p.executableCode);
}
function hasCodeExecutionResult(adkEvent) {
  return adkEvent.content.parts.some(p => p.codeExecutionResult);
}

function showExecutableCode(adkEvent) {
  const codePart = adkEvent.content.parts.find(p => p.executableCode);
  if (codePart && codePart.executableCode) {
    const code = codePart.executableCode || "";
    const language = codePart.executableCode.language || "unknown";
    return `executable code (language: ${language} : ${truncate(code,60)})`
  }
  return "";
}

function showCodeExecutionResult(adkEvent) {
  const resultPart = adkEvent.content.parts.find(p => p.codeExecutionResult);
  if (resultPart && resultPart.codeExecutionResult) {
    const outcome = resultPart.codeExecutionResult.outcome || "unknown";
    const output = resultPart.codeExecutionResult.output || "";
    return `code execution result (${outcome} : ${truncate(output,60)})`;
  }
  return "";
}

function showText(adkEvent) {
  const textPart = adkEvent.content.parts.find(p => p.text);
  if (textPart && textPart.text) {
    const text = textPart.text;
    return `text: ${truncate(text,80)}`;
  }
  return "";
}

function base64ToArray(base64) {
  // Convert base64url to standard base64
  // Replace URL-safe characters: - with +, _ with /
  let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  while (standardBase64.length % 4) {
    standardBase64 += '=';
  }

  const binaryString = window.atob(standardBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function showAudio(adkEvent,playerNode) {
  if (!playerNode) {
    console.error("Player node is null");
    return "";
  }
  const audioPart = adkEvent.content.parts.find(p => p.inlineData);
  if (audioPart && audioPart.inlineData) {
    const mimeType = audioPart.inlineData.mimeType || "unknown";
    const dataLength = audioPart.inlineData.data ? audioPart.inlineData.data.length : 0;
    // Base64 string length / 4 * 3 gives approximate bytes
    const byteSize = Math.floor(dataLength * 0.75);

    const data = audioPart.inlineData.data;
    if (mimeType && mimeType.startsWith("audio/pcm") && playerNode) {
      playerNode.port.postMessage(base64ToArray(data));
    }

    return `audio response: ${mimeType} (${byteSize.toLocaleString()} bytes)`;
  }
  return "";
}

function handleADKEvent(adkEvent,playerNode) {
  const author = adkEvent.author || "system";
  const ret=[];
  if (adkEvent.turnComplete) { ret.push("turn complete"); }
  else if (adkEvent.interrupted) { ret.push("interrupted"); }
  else if (adkEvent.inputTranscription) { ret.push(`input transciption: ${truncate(adkEvent.inputTranscription.text,60)}`); }
  else if (adkEvent.outputTranscription) { ret.push(`output transciption: ${truncate(adkEvent.outputTranscription.text,60)}`); }
  else if (adkEvent.usageMetadata) { ret.push(tokenUsage(adkEvent.usageMetadata)); }
  else if (hasContentParts) {
    if (hasExecutableCode(adkEvent)) {const ec=showExecutableCode(adkEvent); if (ec!=""){ret.push(ec)} }
    if (hasCodeExecutionResult(adkEvent)) {const er=showCodeExecutionResult(adkEvent); if (er!=""){ret.push(er)} }
    if (hasText(adkEvent)) {const t=showText(adkEvent); if (t!=""){ret.push(t)} }
    if (hasAudio(adkEvent)) {const ad=showAudio(adkEvent,playerNode); if (ad!=""){ret.push(ad)} }
  }

  return ret;
}

async function playAudio() {
  const result = await startAudioPlayerWorklet();
  [playerNode, audioContext] = result;
  audioContext.resume();

  socket = wsconnect();

  socket.onopen = (event) => {
    console.log("websocket opened");
  }

  socket.onmessage = (event) => {
    const adkEvent = JSON.parse(event.data);
    const ret = handleADKEvent(adkEvent,playerNode);
    if (ret.length != 0) { console.log(ret); }
  };

  socket.onclose = (event) => {
    console.log("websocket closed");
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
