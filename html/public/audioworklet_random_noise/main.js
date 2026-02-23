async function noiseGen() {
	const audioContext = new AudioContext();
	await audioContext.audioWorklet.addModule("random-noise-processor.js");
	const randomNoiseNode = new AudioWorkletNode(
	  audioContext,
	  "my-random-noise-processor",
	);
	randomNoiseNode.connect(audioContext.destination);
}


console.log("main.js loaded");
