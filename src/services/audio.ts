export class AudioService {
  private static audioCtx: AudioContext | null = null;
  private static isSoundMuted = false;
  private static speechQueue: string[] = [];
  private static isSpeaking = false;
  private static cachedVoices: SpeechSynthesisVoice[] = [];

  private static SOUND_STORAGE_KEY = "hospital_sound_enabled";

  static {
    // Inisialisasi daftar suara saat browser memuat SpeechSynthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      AudioService.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        AudioService.loadVoices();
      };
    }
  }

  private static loadVoices(): void {
    if ("speechSynthesis" in window) {
      this.cachedVoices = window.speechSynthesis.getVoices();
    }
  }

  public static isEnabled(): boolean {
    const saved = localStorage.getItem(this.SOUND_STORAGE_KEY);
    if (saved === null) return true; // Default aktif
    return saved === "true";
  }

  public static setEnabled(enabled: boolean): void {
    localStorage.setItem(this.SOUND_STORAGE_KEY, enabled ? "true" : "false");
    this.isSoundMuted = !enabled;
  }

  /**
   * Mendapatkan voice terbaik dengan dialek/bahasa Indonesia (id-ID)
   */
  private static getIndonesianVoice(): SpeechSynthesisVoice | null {
    if (this.cachedVoices.length === 0 && "speechSynthesis" in window) {
      this.cachedVoices = window.speechSynthesis.getVoices();
    }

    const voices = this.cachedVoices;
    if (voices.length === 0) return null;

    // 1. Cari suara Natural / Online id-ID (Edge/Windows: Gadis, Ardi, atau Chrome: Google Bahasa Indonesia)
    const naturalVoice = voices.find(
      (v) =>
        (v.lang.toLowerCase() === "id-id" || v.lang.toLowerCase().startsWith("id")) &&
        (v.name.toLowerCase().includes("natural") ||
          v.name.toLowerCase().includes("online") ||
          v.name.toLowerCase().includes("google") ||
          v.name.toLowerCase().includes("gadis") ||
          v.name.toLowerCase().includes("ardi"))
    );
    if (naturalVoice) return naturalVoice;

    // 2. Cari suara bahasa Indonesia standar (id-ID atau id)
    const idVoice = voices.find(
      (v) => v.lang.toLowerCase() === "id-id" || v.lang.toLowerCase().startsWith("id")
    );
    if (idVoice) return idVoice;

    // 3. Cari berdasarkan nama suara mengandung "Indonesia"
    const nameMatch = voices.find((v) =>
      v.name.toLowerCase().includes("indonesia")
    );
    if (nameMatch) return nameMatch;

    return null;
  }

  /**
   * Menghasilkan bunyi Chime lonceng antrian dua nada (Ding-Dong)
   * Menggunakan Web Audio API murni (tanpa file eksternal)
   */
  public static async playChime(): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

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
    } catch (e) {
      console.warn("Audio chime tidak dapat diputar:", e);
    }
  }

  /**
   * Mengumumkan nomor tiket dan layanan menggunakan Web Speech API dengan dialek Indonesia
   * Contoh: "Nomor antrean... A... nol... nol... satu... Silakan menuju ke loket Umum 1"
   */
  public static announceQueue(ticketNumber: string, serviceName: string): void {
    if (!this.isEnabled()) return;
    if (!("speechSynthesis" in window)) return;

    // Pisahkan kode dan nomor: misal "A-001" -> "A" dan "001"
    const parts = ticketNumber.split("-");
    const code = (parts[0] ?? "").toUpperCase().trim();
    const num = (parts[1] ?? "").trim();

    // Pelafalan abjad dalam dialek Bahasa Indonesia agar tidak terdengar aksen Inggris
    const letterPronunciation: Record<string, string> = {
      A: "A",
      B: "Bé",
      C: "Cé",
      D: "Dé",
      E: "E",
      F: "Ef",
      G: "Gé",
      H: "Ha",
      I: "I",
      J: "Jé",
      K: "Ka",
      L: "El",
      M: "Em",
      N: "En",
      O: "O",
      P: "Pé",
      Q: "Ki",
      R: "Er",
      S: "Es",
      T: "Té",
      U: "U",
      V: "Fé",
      W: "Wé",
      X: "Eks",
      Y: "Yé",
      Z: "Zet"
    };

    const phoneticCode = letterPronunciation[code] || code;

    // Angka dalam dialek Bahasa Indonesia yang jelas
    const digitWords: Record<string, string> = {
      "0": "nol",
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
      .join(". ");

    // Rapikan nama layanan ke dialek pengumuman loket Indonesia
    let cleanService = serviceName.trim();
    if (
      !cleanService.toLowerCase().startsWith("loket") &&
      !cleanService.toLowerCase().startsWith("poli")
    ) {
      cleanService = `loket ${cleanService}`;
    }

    // Teks pengumuman berintonasi alami Bahasa Indonesia
    const text = `Nomor antrean... ${phoneticCode}... ${spokenDigits}... Silakan menuju ke ${cleanService}.`;

    this.speechQueue.push(text);
    this.processSpeechQueue();
  }

  private static processSpeechQueue(): void {
    if (this.isSpeaking || this.speechQueue.length === 0) return;

    const nextText = this.speechQueue.shift();
    if (!nextText) return;

    this.isSpeaking = true;

    // Pastikan speech synthesis tidak dalam keadaan ter-pause
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Bunyikan chime terlebih dahulu sebelum suara AI berbicara
    this.playChime().then(() => {
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(nextText);

          // Set bahasa dan dialek Indonesia
          utterance.lang = "id-ID";
          utterance.rate = 0.88; // Kecepatan bicara yang tenang dan jelas
          utterance.pitch = 1.05; // Nada intonasi yang ramah

          // Cari dan gunakan voice dialek Indonesia terbaik yang tersedia di browser/OS
          const indonesianVoice = this.getIndonesianVoice();
          if (indonesianVoice) {
            utterance.voice = indonesianVoice;
            utterance.lang = indonesianVoice.lang;
          }

          utterance.onend = () => {
            this.isSpeaking = false;
            setTimeout(() => this.processSpeechQueue(), 350);
          };

          utterance.onerror = (e) => {
            console.warn("Speech synthesis error:", e);
            this.isSpeaking = false;
            setTimeout(() => this.processSpeechQueue(), 200);
          };

          window.speechSynthesis.speak(utterance);
        } catch {
          this.isSpeaking = false;
        }
      }, 700);
    });
  }
}
