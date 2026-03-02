class PCMPlayerProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		this.bufferSize = 24000 * 180; // 180 seconds of audio
		this.buffer = new Float32Array(this.bufferSize);
		this.writeIndex = 0;
		this.readIndex = 0;

		this.port.onmessage = (event) => {
			if (event.data.command === "endOfAudio") {
				this.readIndex = this.writeIndex; // clear the buffer
				console.log("endOfAudio received, buffer cleared");
				return;
			}

			const int16Samples = new Int16Array(event.data);
			this._enqueue(int16Samples);
		};
	}

	_enqueue(int16Samples) {
		for (let i=0; i<int16Samples.length; i++) {
			const floatVal = int16Samples[i]/32768;
			this.buffer[this.writeIndex] = floatVal;
			this.writeIndex = (this.writeIndex+1) % this.bufferSize; // incr index, circular buffer

			if (this.writeIndex === this.readIndex) { // overflow: overwrite oldest samples
				this.readIndex = (this.readIndex+1) % this.bufferSize;
			}
		}
	}

	// The browser system calls process() .
	process(inputs, outputs, parameters) {
		const output = outputs[0];
		const framesPerBlock = output[0].length;
		for (let frame=0; frame<framesPerBlock; frame++) {
			output[0][frame] = this.buffer[this.readIndex]; // output[0] is left channel
			if (output.length > 1) { // we also have a right channel
				output[1][frame] = this.buffer[this.readIndex]; // copy the same data to the right channel
			}

			if (this.readIndex != this.writeIndex) { // increment readIndex if there is more data
				this.readIndex = (this.readIndex+1) % this.bufferSize;
			}
		}
		
		return true; // tells the browser to keep the processor alive
	}
}

registerProcessor("pcm-player-processor", PCMPlayerProcessor);
