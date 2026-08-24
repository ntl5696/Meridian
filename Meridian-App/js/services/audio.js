/* FLOWSTATE - AUDIO SYSTEM (WEB AUDIO API) */

class FlowAudioController {
    constructor() {
        this.ctx = null;
        this.typewriterVolume = 0.75;
        this.ambientVolume = 0.40;
        
        this.isTypewriterEnabled = false;
        this.isAmbientEnabled = false;
        this.isBellEnabled = true;
        
        this.typewriterProfile = 'mechanical';
        this.ambientProfile = 'brown';
        
        this.ambientSource = null;
        this.ambientGainNode = null;
        
        // Audio Buffers cache
        this.noiseBuffers = {
            white: null,
            pink: null,
            brown: null
        };
    }

    /**
     * Initializes the AudioContext upon user interaction.
     */
    init() {
        if (this.ctx) return;
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.error("Web Audio API is not supported in this browser.");
            return;
        }
        
        this.ctx = new AudioContextClass();
        
        // Pre-generate noise buffers
        this.noiseBuffers.white = this.generateWhiteNoiseBuffer();
        this.noiseBuffers.pink = this.generatePinkNoiseBuffer();
        this.noiseBuffers.brown = this.generateBrownNoiseBuffer();
    }

    /**
     * White Noise buffer generator
     */
    generateWhiteNoiseBuffer() {
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = sampleRate * 2; // 2 seconds loop
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    /**
     * Pink Noise buffer generator (Paul Kellet's refined method)
     */
    generatePinkNoiseBuffer() {
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; // Gain compensation
            b6 = white * 0.115926;
        }
        return buffer;
    }

    /**
     * Brown Noise buffer generator (Random Walk filter)
     */
    generateBrownNoiseBuffer() {
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Gain compensation
        }
        return buffer;
    }

    /**
     * Plays a synthesized key click sound.
     */
    playKeyClick(isSpace = false) {
        if (!this.isTypewriterEnabled) return;
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const time = this.ctx.currentTime;
        
        // 1. Noise click component (the contact transient)
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = this.noiseBuffers.white;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        const noiseGain = this.ctx.createGain();
        
        // 2. Tonal component (the resonance body of the key)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        // Combined master gain
        const masterGain = this.ctx.createGain();
        masterGain.gain.setValueAtTime(this.typewriterVolume, time);
        masterGain.connect(this.ctx.destination);
        
        // Connections
        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        
        osc.connect(oscGain);
        oscGain.connect(masterGain);

        // Sound characteristics based on profiles
        if (this.typewriterProfile === 'mechanical') {
            // High-pitched tactile mechanical switch
            const pitchRandom = (Math.random() - 0.5) * 150;
            const clickFreq = (isSpace ? 400 : 800) + pitchRandom;
            
            // Oscillator config
            osc.type = 'sine';
            osc.frequency.setValueAtTime(clickFreq, time);
            osc.frequency.exponentialRampToValueAtTime(clickFreq * 0.4, time + 0.03);
            
            oscGain.gain.setValueAtTime(0.3, time);
            oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
            
            // Noise click config
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.setValueAtTime(2500, time);
            
            noiseGain.gain.setValueAtTime(0.8, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
            
            osc.start(time);
            osc.stop(time + 0.04);
            noiseNode.start(time);
            noiseNode.stop(time + 0.02);
            
        } else if (this.typewriterProfile === 'vintage') {
            // Heavy, metallic vintage typewriter slam
            const pitchRandom = (Math.random() - 0.5) * 80;
            const clickFreq = (isSpace ? 200 : 350) + pitchRandom;
            
            // Oscillator config (heavier low-end thud)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(clickFreq, time);
            osc.frequency.exponentialRampToValueAtTime(clickFreq * 0.2, time + 0.06);
            
            oscGain.gain.setValueAtTime(0.4, time);
            oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
            
            // Bandpass filter on noise to simulate heavy mechanical lever movement
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1000 + (Math.random() * 200), time);
            noiseFilter.Q.setValueAtTime(3, time);
            
            noiseGain.gain.setValueAtTime(1.0, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
            
            // Add a slight metallic spring resonance
            const metalOsc = this.ctx.createOscillator();
            const metalGain = this.ctx.createGain();
            metalOsc.type = 'sine';
            metalOsc.frequency.setValueAtTime(2800 + (Math.random() - 0.5) * 500, time);
            metalGain.gain.setValueAtTime(0.04, time);
            metalGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
            
            metalOsc.connect(metalGain);
            metalGain.connect(masterGain);
            
            osc.start(time);
            osc.stop(time + 0.08);
            noiseNode.start(time);
            noiseNode.stop(time + 0.05);
            metalOsc.start(time);
            metalOsc.stop(time + 0.15);
            
        } else if (this.typewriterProfile === 'bubble') {
            // Chippy Bubble - soft pop clicks
            const pitchRandom = (Math.random() - 0.5) * 200;
            const clickFreq = (isSpace ? 350 : 600) + pitchRandom;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(clickFreq, time);
            osc.frequency.exponentialRampToValueAtTime(clickFreq * 0.7, time + 0.02);
            
            oscGain.gain.setValueAtTime(0.6, time);
            oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
            
            // Noise config (almost none)
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(4000, time);
            noiseGain.gain.setValueAtTime(0.1, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.008);
            
            osc.start(time);
            osc.stop(time + 0.03);
            noiseNode.start(time);
            noiseNode.stop(time + 0.01);
        }
    }

    /**
     * Synthesizes a vintage mechanical typewriter bell for carriage return (Enter key)
     */
    playBell() {
        if (!this.isTypewriterEnabled || !this.isBellEnabled) return;
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const time = this.ctx.currentTime;
        
        // Bell consists of two high-frequency oscillators to create metallic ring
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        
        const gain1 = this.ctx.createGain();
        const gain2 = this.ctx.createGain();
        
        const filter = this.ctx.createBiquadFilter();
        const masterBellGain = this.ctx.createGain();
        
        // High frequencies typical of a small steel bell
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1480, time);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1920, time); // anharmonic metal overtone
        
        gain1.gain.setValueAtTime(0.3, time);
        gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
        
        gain2.gain.setValueAtTime(0.15, time);
        gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, time);
        
        masterBellGain.gain.setValueAtTime(this.typewriterVolume * 0.8, time);
        
        // Connections
        osc1.connect(gain1);
        osc2.connect(gain2);
        
        gain1.connect(filter);
        gain2.connect(filter);
        
        filter.connect(masterBellGain);
        masterBellGain.connect(this.ctx.destination);
        
        osc1.start(time);
        osc2.start(time);
        
        osc1.stop(time + 0.7);
        osc2.stop(time + 0.5);
    }

    /**
     * Starts the ambient focus noise loop
     */
    startAmbient() {
        if (!this.isAmbientEnabled) return;
        
        this.init();
        if (!this.ctx) return;
        
        // Resume context if suspended
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        // Stop active ambient loop first
        this.stopAmbient();
        
        const time = this.ctx.currentTime;
        
        // Create nodes
        this.ambientSource = this.ctx.createBufferSource();
        
        // Select appropriate buffer
        const buffer = this.noiseBuffers[this.ambientProfile] || this.noiseBuffers.brown;
        this.ambientSource.buffer = buffer;
        this.ambientSource.loop = true;
        
        // Create filter to make noise smooth/gentle
        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        // Brown noise is already bassy, white needs heavier filtering
        const filterCutoff = this.ambientProfile === 'white' ? 500 : this.ambientProfile === 'pink' ? 800 : 1200;
        lowpass.frequency.setValueAtTime(filterCutoff, time);
        
        this.ambientGainNode = this.ctx.createGain();
        // Ramp gain smoothly
        this.ambientGainNode.gain.setValueAtTime(0.001, time);
        this.ambientGainNode.gain.linearRampToValueAtTime(this.ambientVolume * 0.35, time + 1.5);
        
        // Connect
        this.ambientSource.connect(lowpass);
        lowpass.connect(this.ambientGainNode);
        this.ambientGainNode.connect(this.ctx.destination);
        
        this.ambientSource.start(time);
    }

    /**
     * Stops the active ambient noise loop with a quick fade-out to prevent clicks.
     */
    stopAmbient() {
        if (!this.ambientSource || !this.ctx) return;
        
        const sourceToStop = this.ambientSource;
        const gainToFade = this.ambientGainNode;
        const time = this.ctx.currentTime;
        
        try {
            // Fade out within 150ms
            gainToFade.gain.setValueAtTime(gainToFade.gain.value, time);
            gainToFade.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
            
            setTimeout(() => {
                try {
                    sourceToStop.stop();
                    sourceToStop.disconnect();
                } catch(e) {}
            }, 200);
        } catch(e) {
            // Fallback if audio node fails
            try { sourceToStop.stop(); } catch(e) {}
        }
        
        this.ambientSource = null;
        this.ambientGainNode = null;
    }

    /**
     * Updates typewriter volume level
     */
    setTypewriterVolume(volumePercent) {
        this.typewriterVolume = volumePercent / 100;
    }

    /**
     * Updates ambient volume level and ramps current node gain if playing
     */
    setAmbientVolume(volumePercent) {
        this.ambientVolume = volumePercent / 100;
        if (this.ambientGainNode && this.ctx) {
            const time = this.ctx.currentTime;
            this.ambientGainNode.gain.linearRampToValueAtTime(this.ambientVolume * 0.35, time + 0.2);
        }
    }
}

// Global Single Instance
const flowAudio = new FlowAudioController();
window.flowAudio = flowAudio;
