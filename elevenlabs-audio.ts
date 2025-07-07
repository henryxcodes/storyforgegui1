import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface VoiceoverResult {
  audioPath: string;
  duration: number;
  fileSize: number;
  format: string;
  characterCount: number;
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId = 'jpjWfzKyhJIgrlqr39h8'; // Your preferred voice
  private defaultModel = 'eleven_monolingual_v1';
  private maxCharacters = 4000;

  constructor(config: ElevenLabsConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Convert text to speech using ElevenLabs API (limited to 4000 characters)
   */
  async textToSpeech(
    text: string,
    options: {
      outputPath?: string;
      voiceId?: string;
      model?: string;
      stability?: number;
      similarityBoost?: number;
      removeSilence?: boolean;
      silenceThreshold?: number;
      silenceLength?: number;
    } = {}
  ): Promise<VoiceoverResult> {
    const {
      outputPath = this.generateOutputPath('mp3'),
      voiceId = this.defaultVoiceId,
      model = this.defaultModel,
      stability = 0.5,
      similarityBoost = 0.5,
      removeSilence = true,  // ElevenLabs: Auto-enabled by default
      silenceThreshold = -45, // ElevenLabs: -45dB threshold (proper setting)
      silenceLength = 45      // ElevenLabs: 45ms minimum silence length
    } = options;

    // Truncate text to 4000 characters if needed
    const truncatedText = text.length > this.maxCharacters 
      ? text.substring(0, this.maxCharacters).trim()
      : text;

    if (text.length > this.maxCharacters) {
      console.log(`⚠️  Text truncated from ${text.length} to ${this.maxCharacters} characters for ElevenLabs`);
    }

    try {
      console.log('🎤 Generating voiceover with ElevenLabs...');
      console.log(`📝 Text length: ${truncatedText.length} characters`);
      console.log(`🎵 Voice ID: ${voiceId}`);
      console.log(`📊 Model: ${model}`);

      const requestData = {
        text: truncatedText,
        model_id: model,
        voice_settings: {
          stability: stability,
          similarity_boost: similarityBoost
        }
      };

      // Make API request
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/text-to-speech/${voiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        data: requestData,
        responseType: 'stream',
        timeout: 300000 // 5 minutes timeout
      });

      // Save audio stream to file
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise(async (resolve, reject) => {
        writer.on('finish', async () => {
          try {
            let finalOutputPath = outputPath;
            
            // Apply silence removal if requested
            if (removeSilence) {
              console.log('🔇 Removing silence from ElevenLabs audio...');
              finalOutputPath = await this.removeSilenceFromAudio(outputPath, 'mp3', silenceThreshold, silenceLength);
            }
            
            const stats = fs.statSync(finalOutputPath);
            const result: VoiceoverResult = {
              audioPath: finalOutputPath,
              duration: this.estimateAudioDuration(truncatedText),
              fileSize: stats.size,
              format: 'mp3',
              characterCount: truncatedText.length
            };

            console.log(`✅ ElevenLabs voiceover generated successfully!`);
            console.log(`📁 Saved to: ${finalOutputPath}`);
            console.log(`📊 File size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`⏱️  Estimated duration: ${Math.round(result.duration)}s`);
            console.log(`📝 Characters used: ${result.characterCount}/${this.maxCharacters}`);
            if (removeSilence) {
              console.log('🔇 Silence removal applied');
            }

            resolve(result);
          } catch (error: any) {
            reject(new Error(`ElevenLabs post-processing failed: ${error.message}`));
          }
        });

        writer.on('error', (error) => {
          console.error('❌ Error writing ElevenLabs audio file:', error);
          reject(new Error(`Failed to save ElevenLabs audio file: ${error.message}`));
        });

        response.data.on('error', (error: any) => {
          console.error('❌ Error receiving ElevenLabs audio data:', error);
          reject(new Error(`Failed to receive ElevenLabs audio data: ${error.message}`));
        });
      });

    } catch (error: any) {
      console.error('❌ ElevenLabs API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid ElevenLabs API key. Please check your ELEVENLABS_API_KEY environment variable.');
      } else if (error.response?.status === 402) {
        throw new Error('Insufficient ElevenLabs credits. Please check your account balance.');
      } else if (error.response?.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`ElevenLabs API error: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  /**
   * Remove silence from audio file using FFmpeg
   */
  private async removeSilenceFromAudio(inputPath: string, format: string, silenceThreshold: number = -45, silenceLength: number = 45): Promise<string> {
    const outputPath = inputPath.replace(`.${format}`, `_no_silence.${format}`);
    
    try {
      // Check if FFmpeg is available
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.warn('⚠️  FFmpeg not found. Silence removal requires FFmpeg to be installed.');
      console.warn('💡 Install FFmpeg: https://ffmpeg.org/download.html');
      return inputPath; // Return original file if FFmpeg is not available
    }

    try {
      // FFmpeg command to remove silence with configurable settings
      const silenceDurationSeconds = silenceLength / 1000; // Convert ms to seconds
      const bufferDuration = 0.023; // 23ms buffer (keep_silence)
      const ffmpegCommand = `ffmpeg -i "${inputPath}" -af "silenceremove=start_periods=1:start_duration=${silenceDurationSeconds}:start_threshold=${silenceThreshold}dB:detection=peak,silenceremove=stop_periods=-1:stop_duration=${silenceDurationSeconds}:stop_threshold=${silenceThreshold}dB:detection=peak,apad=pad_dur=${bufferDuration}" -y "${outputPath}"`;
      
      console.log('🔧 Running FFmpeg silence removal on ElevenLabs audio...');
      await execAsync(ffmpegCommand);
      
      // Check if output file was created successfully
      if (fs.existsSync(outputPath)) {
        // Remove original file
        fs.unlinkSync(inputPath);
        console.log('✅ ElevenLabs silence removal completed');
        return outputPath;
      } else {
        console.warn('⚠️  ElevenLabs silence removal failed, using original file');
        return inputPath;
      }
    } catch (error: any) {
      console.warn('⚠️  FFmpeg silence removal failed for ElevenLabs:', error.message);
      console.warn('💡 Using original ElevenLabs audio file without silence removal');
      return inputPath;
    }
  }

  /**
   * Estimate audio duration based on text length
   */
  private estimateAudioDuration(text: string): number {
    // Average speaking rate: ~150 words per minute
    const words = text.split(/\s+/).length;
    const minutes = words / 150;
    return Math.round(minutes * 60); // Convert to seconds
  }

  /**
   * Generate output file path
   */
  private generateOutputPath(format: string, prefix: string = 'elevenlabs'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${prefix}_${timestamp}.${format}`;
    return path.resolve(process.cwd(), 'output', filename);
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices(): Promise<any[]> {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/voices`,
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      return response.data.voices || [];
    } catch (error: any) {
      console.warn('⚠️  Could not fetch ElevenLabs voices:', error.message);
      return [];
    }
  }

  /**
   * Ensure output directory exists
   */
  static ensureOutputDirectory(): void {
    const outputDir = path.resolve(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }
}

/**
 * Create ElevenLabs service instance with API key from environment
 */
export function createElevenLabsService(apiKey?: string): ElevenLabsService {
  const key = apiKey || process.env.ELEVENLABS_API_KEY;
  
  if (!key) {
    throw new Error(
      'ElevenLabs API key is required. Please:\n' +
      '1. Set ELEVENLABS_API_KEY environment variable, or\n' +
      '2. Use --elevenlabs-key option, or\n' +
      '3. Pass apiKey parameter\n' +
      '💡 Get your API key from: https://elevenlabs.io/app/settings/api-keys'
    );
  }

  console.log(`🔑 Using ElevenLabs API key: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);
  
  return new ElevenLabsService({ apiKey: key });
}

/**
 * Quick text-to-speech function for ElevenLabs (4000 character limit)
 */
export async function generateElevenLabsVoiceover(
  text: string,
  options: {
    apiKey?: string;
    outputPath?: string;
    voiceId?: string;
    model?: string;
    stability?: number;
    similarityBoost?: number;
    removeSilence?: boolean;
    silenceThreshold?: number;
    silenceLength?: number;
  } = {}
): Promise<VoiceoverResult> {
  ElevenLabsService.ensureOutputDirectory();
  
  const service = createElevenLabsService(options.apiKey);
  
  return service.textToSpeech(text, options);
} 