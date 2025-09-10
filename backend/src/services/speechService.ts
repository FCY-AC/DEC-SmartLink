import {
  SpeechConfig,
  AudioConfig,
  SpeechRecognizer,
  PushAudioInputStream,
  ResultReason,
  CancellationDetails,
  CancellationReason,
} from 'microsoft-cognitiveservices-speech-sdk';
import { broadcastToLecture } from './socketService';

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

const useMock = !AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION;

if (useMock) {
  console.warn('⚠️ Azure Speech Services not configured, will use mock mode');
  console.log('Current AZURE_SPEECH_KEY:', AZURE_SPEECH_KEY ? 'SET' : 'NOT SET');
  console.log('Current AZURE_SPEECH_REGION:', AZURE_SPEECH_REGION ? 'SET' : 'NOT SET');
} else {
  console.log('✅ Azure Speech Services configured');
  console.log('Region:', AZURE_SPEECH_REGION);
}

let recognizer: SpeechRecognizer | null = null;
let pushStream: PushAudioInputStream | null = null;

export const startContinuousRecognition = (lectureId: string, language: string = 'en-US') => {
  if (useMock) {
    console.log('[MOCK] Starting continuous recognition for', lectureId);
    return;
  }
  if (recognizer) {
    console.warn('Recognition already in progress. Please stop the current session first.');
    return;
  }

  try {
    const speechConfig = SpeechConfig.fromSubscription(AZURE_SPEECH_KEY!, AZURE_SPEECH_REGION!);
    speechConfig.speechRecognitionLanguage = language;

    pushStream = PushAudioInputStream.create();
    const audioConfig = AudioConfig.fromStreamInput(pushStream);
    
    recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognized = (_s, e) => {
      if (e.result.reason === ResultReason.RecognizedSpeech) {
        const text = e.result.text;
        console.log(`[RECOGNIZED] Text: ${text}`);
        broadcastToLecture(lectureId, 'new-subtitle', {
          text: text,
          timestamp: new Date().toISOString(),
        });
      }
    };

    recognizer.canceled = (_s, e) => {
      console.error(`[CANCELED] Reason: ${e.reason}`);
      if (e.reason === CancellationReason.Error) {
        console.error(`[CANCELED] ErrorDetails: ${e.errorDetails}`);
      }
      stopContinuousRecognition();
    };

    recognizer.sessionStopped = (_s, _e) => {
      console.log('Session stopped.');
      stopContinuousRecognition();
    };
    
    recognizer.startContinuousRecognitionAsync(
      () => {
        console.log('🎤 Continuous recognition started for lecture:', lectureId);
      },
      (err) => {
        console.error('Error starting recognition:', err);
        stopContinuousRecognition();
      }
    );
  } catch (error) {
    console.error('Failed to initialize recognizer:', error);
  }
};

export const pushAudioChunk = (chunk: Buffer) => {
  if (useMock || !pushStream) {
    return;
  }
  
  try {
    // 將 Buffer 轉換為 ArrayBuffer
    const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
    pushStream.write(arrayBuffer);
  } catch (error) {
    console.error('Failed to write audio chunk:', error);
  }
};

export const stopContinuousRecognition = () => {
  if (useMock) {
    console.log('[MOCK] Stopping continuous recognition.');
    return;
  }
  if (recognizer) {
    recognizer.stopContinuousRecognitionAsync(
      () => {
        console.log('🎤 Continuous recognition stopped.');
        recognizer?.close();
        recognizer = null;
        pushStream?.close();
        pushStream = null;
      },
      (err) => {
        console.error('Error stopping recognition:', err);
        recognizer = null;
        pushStream = null;
      }
    );
  }
};
