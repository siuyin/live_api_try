// wsconnect is the main routine. Start there.

import { startAudioPlayerWorklet } from "./audioplayer.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

const userId = "demo-user";
const sessionId = "demo-session-" + Math.random().toString(36).substring(7);
let socket;
let playerNode;
let audioContext;

async function wsconnect() {
  socket = new WebSocket(wsurl());
  socket.binaryType = "arraybuffer";

  socket.onopen = (event) => {
    console.log("websocket opened");
    setConnectedCheckbox(true);
  }

  socket.onmessage = (event) => {
    const adkEvent = JSON.parse(event.data);
    const ret = handleADKEvent(adkEvent,playerNode);
    if (ret.length != 0) { console.log(ret); }
  };

  socket.onclose = (event) => {
    console.log("websocket closed");
    setConnectedCheckbox(false);
    //setTimeout(function () {
    //  console.log("Reconnecting...");
    //  wsconnect();
    //}, 5000);
  }

  socket.onerror = (event) => {
    console.error('websocket error:',event);
  }

  const result = await startAudioPlayerWorklet();
  [playerNode, audioContext] = result;
}

function setConnectedCheckbox(val) {
  const cb = document.getElementById("connected");
  cb.checked = val;
}

function enableAudio(){
  audioContext.resume();
  console.log("audioContext resumed: audio enabled");
}

function handleRunConfigChange() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log("reconnecting after run configuration change");
    socket.close();
    // connectWebsocket() will be called by onclose handler after delay
  }
}

function wsurl() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const wsprot = protocol === "http:" ? "ws" : "wss";
  return `${wsprot}://${hostname}:${window.location.port}/ws/${userId}/${sessionId}?affective_dialog=true`;
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

function showOutputTranscription(adkEvent){
  if (!adkEvent.outputTranscription) {return "";}

  workingindicator(false); // turn off spinner

  const tgt=document.getElementById("agentresponse");
  if (!adkEvent.outputTranscription.finished) {
    tgt.append(adkEvent.outputTranscription.text);
  }
  return `output transciption: ${truncate(adkEvent.outputTranscription.text,60)}`;
}

async function handleTurnComplete() {
  const tgt=document.getElementById("agentresponse");
  const hr=document.createElement("hr");
  tgt.append(hr);
  const md = marked.parse(tgt.innerHTML);
  const sanitized = DOMPurify.sanitize(md);
  tgt.innerHTML = sanitized;
  await MathJax.typesetPromise([tgt]);
  return "turn complete";
}

function handleADKEvent(adkEvent,playerNode) {
  const author = adkEvent.author || "system";
  const ret=[];
  if (adkEvent.turnComplete) { ret.push(handleTurnComplete()); }
  else if (adkEvent.interrupted) { ret.push("interrupted"); }
  else if (adkEvent.inputTranscription) { ret.push(`input transciption: ${truncate(adkEvent.inputTranscription.text,60)}`); }
  else if (adkEvent.outputTranscription) { const ot=showOutputTranscription(adkEvent); if (ot!=""){ret.push(ot)}}
  else if (adkEvent.usageMetadata) { ret.push(tokenUsage(adkEvent.usageMetadata)); }
  else if (hasContentParts) {
    if (hasExecutableCode(adkEvent)) {const ec=showExecutableCode(adkEvent); if (ec!=""){ret.push(ec)} }
    if (hasCodeExecutionResult(adkEvent)) {const er=showCodeExecutionResult(adkEvent); if (er!=""){ret.push(er)} }
    if (hasText(adkEvent)) {const t=showText(adkEvent); if (t!=""){ret.push(t)} }
    if (hasAudio(adkEvent)) {const ad=showAudio(adkEvent,playerNode); if (ad!=""){ret.push(ad)} }
  }

  return ret;
}


async function sendMessage(msg) {
  workingindicator(true);
  await socket.send(JSON.stringify({type: "text", text: msg}));
  console.log(`sent ${msg}`);
}

wsconnect();

function workingindicator(state) {
  const wi=document.getElementById("workingindicator");
  if (state==true) {
    wi.classList.add("spinner");
    return;
  }
  wi.classList.remove("spinner");
}
// export to global scope
window.enableAudio = enableAudio;
window.wsconnect = wsconnect;
window.sendMessage = sendMessage;
