interface SpeechRecognitionResultLike {
  0?: {
    transcript?: string;
  };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export interface VoiceCaptureResult {
  blob: Blob;
  file: File;
  objectUrl: string;
  mimeType: string;
  durationSeconds: number;
  transcript: string;
  transcriptSupported: boolean;
}

export class BrowserVoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recognition: SpeechRecognitionLike | null = null;
  private chunks: Blob[] = [];
  private mimeType = "audio/webm";
  private transcript = "";
  private durationSeconds = 0;
  private timerId: number | null = null;
  private stopResolver: ((value: VoiceCaptureResult | null) => void) | null = null;

  constructor(
    private readonly options: {
      onTick?: (seconds: number) => void;
      onRecognitionError?: (message: string) => void;
    } = {}
  ) {}

  static isRecordingSupported() {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined"
    );
  }

  static isSpeechRecognitionSupported() {
    return Boolean(this.getSpeechRecognitionCtor());
  }

  async start() {
    if (!BrowserVoiceRecorder.isRecordingSupported()) {
      throw new Error("当前浏览器不支持录音");
    }

    this.dispose();
    this.chunks = [];
    this.transcript = "";
    this.durationSeconds = 0;
    this.options.onTick?.(0);

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.mediaStream);
    this.mimeType = this.mediaRecorder.mimeType || "audio/webm";

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const resolver = this.stopResolver;
      const blob =
        this.chunks.length > 0
          ? new Blob(this.chunks, { type: this.mimeType })
          : null;

      this.stopTimer();
      this.stopRecognition();
      this.stopTracks();

      if (!resolver || !blob) {
        resolver?.(null);
        this.stopResolver = null;
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const file = new File([blob], this.buildFileName(), {
        type: this.mimeType
      });

      resolver({
        blob,
        file,
        objectUrl,
        mimeType: this.mimeType,
        durationSeconds: Math.max(1, this.durationSeconds),
        transcript: this.transcript.trim(),
        transcriptSupported: BrowserVoiceRecorder.isSpeechRecognitionSupported()
      });
      this.stopResolver = null;
    };

    this.mediaRecorder.start();
    this.startTimer();
    this.startRecognition();
  }

  async stop() {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
      this.dispose();
      return null;
    }

    return new Promise<VoiceCaptureResult | null>((resolve) => {
      this.stopResolver = resolve;
      this.mediaRecorder?.stop();
    });
  }

  dispose() {
    this.stopTimer();
    this.stopRecognition(true);
    this.stopTracks();

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    this.mediaRecorder = null;
    this.chunks = [];
    this.stopResolver = null;
  }

  private startRecognition() {
    const RecognitionCtor = BrowserVoiceRecorder.getSpeechRecognitionCtor();
    if (!RecognitionCtor) {
      return;
    }

    this.recognition = new RecognitionCtor();
    this.recognition.lang = "zh-CN";
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.onresult = (event) => {
      const transcriptParts: string[] = [];

      for (let index = 0; index < event.results.length; index += 1) {
        const segment = event.results[index]?.[0]?.transcript?.trim();

        if (segment) {
          transcriptParts.push(segment);
        }
      }

      this.transcript = transcriptParts.join("").replace(/\s+/g, " ").trim();
    };
    this.recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }

      this.options.onRecognitionError?.("语音转写暂时不可用，本次将仅发送录音文件");
    };

    try {
      this.recognition.start();
    } catch {
      this.recognition = null;
    }
  }

  private stopRecognition(silent = false) {
    if (!this.recognition) {
      return;
    }

    try {
      if (silent) {
        this.recognition.abort();
      } else {
        this.recognition.stop();
      }
    } catch {
      // ignore browser-specific shutdown failures
    }

    this.recognition = null;
  }

  private startTimer() {
    this.stopTimer();
    this.timerId = window.setInterval(() => {
      this.durationSeconds += 1;
      this.options.onTick?.(this.durationSeconds);
    }, 1000);
  }

  private stopTimer() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private stopTracks() {
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
  }

  private buildFileName() {
    return `voice-${Date.now()}.webm`;
  }

  private static getSpeechRecognitionCtor() {
    if (typeof window === "undefined") {
      return null;
    }

    const value = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    return typeof value === "function" ? value : null;
  }
}

export function canSpeakText() {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

export function stopSpeaking() {
  if (!canSpeakText()) {
    return;
  }

  window.speechSynthesis.cancel();
}

export function speakText(text: string) {
  if (!canSpeakText() || !text.trim()) {
    return false;
  }

  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = "zh-CN";
  utterance.rate = 0.96;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}
