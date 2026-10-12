export class AudioService {
    static audioCtx = null;
    static isSoundMuted = false;
    static speechQueue = [];
    static isSpeaking = false;
    static SOUND_STORAGE_KEY = "hospital_sound_enabled";
    static isEnabled() {
        const saved = localStorage.getItem(this.SOUND_STORAGE_KEY);
        if (saved === null)
            return true; // Default aktif
        return saved === "true";
    }
    static setEnabled(enabled) {
        localStorage.setItem(this.SOUND_STORAGE_KEY, enabled ? "true" : "false");
        this.isSoundMuted = !enabled;
    }
    /**
     * Menghasilkan bunyi Chime lonceng antrian dua nada (Ding-Dong)
     * Menggunakan Web Audio API murni (tanpa file mp3 eksternal)
     */
    static async playChime() {
        if (!this.isEnabled())
            return;
        try {
            const AudioContextClass = window.AudioContext ||
                window.webkitAudioContext;
            if (!AudioContextClass)
                return;
            if (!this.audioCtx || this.audioCtx.state === "closed") {
                this.audioCtx = new AudioContextClass();
            }
            if (this.audioCtx.state === "suspended") {
                await this.audioCtx.resume();
            }
            const ctx = this.audioCtx;
            const now = ctx.currentTime;
            // Nada 1 (Ding - 659.25 Hz / E5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.6);
            // Nada 2 (Dong - 523.25 Hz / C5)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(523.25, now + 0.35);
            gain2.gain.setValueAtTime(0.35, now + 0.35);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.35);
            osc2.stop(now + 1.1);
        }
        catch (e) {
            console.warn("Audio chime tidak dapat diputar:", e);
        }
    }
    /**
     * Mengumumkan nomor tiket dan layanan menggunakan Web Speech API
     * Contoh: "Nomor antrian A, kosong, kosong, satu. Silakan menuju ke loket UMUM 1"
     */
    static announceQueue(ticketNumber, serviceName) {
        if (!this.isEnabled())
            return;
        if (!("speechSynthesis" in window))
            return;
        // Pisahkan format kode dan digit angka: misal "A-001" -> "A" dan "0", "0", "1"
        const parts = ticketNumber.split("-");
        const code = parts[0] ?? "";
        const num = parts[1] ?? "";
        const digitWords = {
            "0": "kosong",
            "1": "satu",
            "2": "dua",
            "3": "tiga",
            "4": "empat",
            "5": "lima",
            "6": "enam",
            "7": "tujuh",
            "8": "delapan",
            "9": "sembilan"
        };
        const spokenDigits = num
            .split("")
            .map((d) => digitWords[d] || d)
            .join(", ");
        const text = `Nomor antrian, ${code}, ${spokenDigits}. Silakan menuju ke ${serviceName}`;
        this.speechQueue.push(text);
        this.processSpeechQueue();
    }
    static processSpeechQueue() {
        if (this.isSpeaking || this.speechQueue.length === 0)
            return;
        const nextText = this.speechQueue.shift();
        if (!nextText)
            return;
        this.isSpeaking = true;
        // Bunyikan chime terlebih dahulu sebelum berbicara
        this.playChime().then(() => {
            setTimeout(() => {
                try {
                    const utterance = new SpeechSynthesisUtterance(nextText);
                    utterance.lang = "id-ID";
                    utterance.rate = 0.95;
                    utterance.pitch = 1.0;
                    // Cari suara bahasa Indonesia jika tersedia di browser
                    const voices = window.speechSynthesis.getVoices();
                    const idVoice = voices.find((v) => v.lang.startsWith("id"));
                    if (idVoice) {
                        utterance.voice = idVoice;
                    }
                    utterance.onend = () => {
                        this.isSpeaking = false;
                        setTimeout(() => this.processSpeechQueue(), 300);
                    };
                    utterance.onerror = () => {
                        this.isSpeaking = false;
                        setTimeout(() => this.processSpeechQueue(), 200);
                    };
                    window.speechSynthesis.speak(utterance);
                }
                catch {
                    this.isSpeaking = false;
                }
            }, 700);
        });
    }
}
