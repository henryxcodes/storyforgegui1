import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FishAudioConfig {
  apiKey: string;
  model?: string;
  voice?: string;
  format?: 'mp3' | 'wav' | 'opus';
  speed?: number;
  volume?: number;
}

export interface VoiceoverResult {
  audioPath: string;
  duration: number;
  fileSize: number;
  format: string;
}

export class FishAudioService {
  private apiKey: string;
  private baseUrl = 'https://api.fish.audio/v1';
  private defaultModel = 's1';
  private defaultVoiceId = 'c54cdcf2baad4f56be377a2473730942'; // Your custom voice model

  constructor(config: FishAudioConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Convert text to speech using Fish Audio API
   */
  async textToSpeech(
    text: string, 
    options: {
      outputPath?: string;
      model?: string;
      format?: 'mp3' | 'wav' | 'opus';
      speed?: number;
      volume?: number;
      referenceId?: string;
      referenceAudioPath?: string;
      removeSilence?: boolean;
      silenceThreshold?: number;
      silenceLength?: number;
    } = {}
  ): Promise<VoiceoverResult> {
    const {
      outputPath = this.generateOutputPath(options.format || 'mp3'),
      model = this.defaultModel,
      format = 'mp3',
      speed = 1.0,
      volume = 0,
      referenceId = this.defaultVoiceId, // Use your voice ID as default
        referenceAudioPath,
        removeSilence = true  // Fish Audio: Auto-enabled by default
    } = options;

    try {
      console.log('🎤 Generating voiceover with Fish Audio...');
      console.log(`📝 Text length: ${text.length} characters`);
      console.log(`🎵 Model: ${model}`);
      console.log(`📊 Format: ${format}, Speed: ${speed}x, Volume: ${volume}dB`);

      // Ensure we're using the required voice ID
      if (!referenceId) {
        throw new Error(`Voice ID is required. Expected: ${this.defaultVoiceId}`);
      }

      if (referenceId !== this.defaultVoiceId) {
        throw new Error(`Only voice ID ${this.defaultVoiceId} is allowed. Received: ${referenceId}`);
      }

      // Prepare request data with mandatory voice ID
      const requestData: any = {
        text: text.trim(),
        format: format,
        normalize: true,
        latency: 'normal',
        reference_id: referenceId, // Always use the voice ID
        ...(speed !== 1.0 && { 
          prosody: { 
            speed: Math.max(0.5, Math.min(2.0, speed)),
            volume: Math.max(-20, Math.min(20, volume))
          }
        })
      };

      // Block reference audio - only voice ID allowed
      if (referenceAudioPath) {
        throw new Error(`Reference audio is not allowed. Only voice ID ${this.defaultVoiceId} is permitted.`);
      }

      // Make API request
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/tts`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'model': model
        },
        data: requestData,
        responseType: 'stream',
        timeout: 300000 // 5 minutes timeout for long texts
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
              console.log('🔇 Removing silence from audio...');
              finalOutputPath = await this.removeSilenceFromAudio(outputPath, format, options.silenceThreshold, options.silenceLength);
            }
            
            const stats = fs.statSync(finalOutputPath);
          const result: VoiceoverResult = {
              audioPath: finalOutputPath,
            duration: this.estimateAudioDuration(text, speed),
            fileSize: stats.size,
            format: format
          };

          console.log(`✅ Voiceover generated successfully!`);
            console.log(`📁 Saved to: ${finalOutputPath}`);
          console.log(`📊 File size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`⏱️  Estimated duration: ${Math.round(result.duration)}s`);
            if (removeSilence) {
              console.log('🔇 Silence removal applied');
            }

          resolve(result);
          } catch (error: any) {
            reject(new Error(`Post-processing failed: ${error.message}`));
          }
        });

        writer.on('error', (error) => {
          console.error('❌ Error writing audio file:', error);
          reject(new Error(`Failed to save audio file: ${error.message}`));
        });

        response.data.on('error', (error: any) => {
          console.error('❌ Error receiving audio data:', error);
          reject(new Error(`Failed to receive audio data: ${error.message}`));
        });
      });

    } catch (error: any) {
      console.error('❌ Fish Audio API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Fish Audio API key. Please check your FISH_API_KEY environment variable.');
      } else if (error.response?.status === 402) {
        throw new Error('Insufficient Fish Audio credits. Please check your account balance.');
      } else if (error.response?.status === 429) {
        throw new Error('Fish Audio rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Fish Audio API error: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  /**
   * Get available voices/models from Fish Audio
   */
  async getAvailableVoices(): Promise<any[]> {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/models`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data || [];
    } catch (error: any) {
      console.warn('⚠️  Could not fetch available voices:', error.message);
      return [];
    }
  }

  /**
   * Split long text into chunks for better TTS processing
   */
  private splitTextIntoChunks(text: string, maxChunkSize: number = 1500): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    console.log(`📝 Text is ${text.length} characters, splitting into chunks of max ${maxChunkSize} chars...`);

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
      
      if (potentialChunk.length <= maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        // If a single sentence is too long, split it by words
        if (trimmedSentence.length > maxChunkSize) {
          const words = trimmedSentence.split(/\s+/);
          let wordChunk = '';
          for (const word of words) {
            const potentialWordChunk = wordChunk + (wordChunk ? ' ' : '') + word;
            if (potentialWordChunk.length <= maxChunkSize) {
              wordChunk = potentialWordChunk;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
              }
              wordChunk = word;
            }
          }
          if (wordChunk) {
            currentChunk = wordChunk;
          }
        } else {
        currentChunk = trimmedSentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    console.log(`✂️  Split into ${chunks.length} chunks, average ${Math.round(chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length)} chars per chunk`);

    return chunks;
  }

  /**
   * Process long text by splitting into chunks and combining audio
   */
  async processLongText(
    text: string,
    options: {
      outputPath?: string;
      model?: string;
      format?: 'mp3' | 'wav' | 'opus';
      speed?: number;
      volume?: number;
      referenceId?: string;
      referenceAudioPath?: string;
      maxChunkSize?: number;
      removeSilence?: boolean;
      silenceThreshold?: number;
      silenceLength?: number;
    } = {}
  ): Promise<VoiceoverResult> {
    const { maxChunkSize = 1500, ...ttsOptions } = options; // Reduced from 2000 to 1500 for better reliability
    
    console.log(`🎤 Processing text of ${text.length} characters with Fish Audio...`);
    
    const chunks = this.splitTextIntoChunks(text, maxChunkSize);

    if (chunks.length === 1) {
      console.log('📝 Text fits in single chunk, processing directly...');
      return this.textToSpeech(text, ttsOptions);
    }

    console.log(`📝 Processing long text in ${chunks.length} chunks...`);
    
    const tempFiles: string[] = [];
    const outputPath = ttsOptions.outputPath || this.generateOutputPath(ttsOptions.format || 'mp3');

    try {
      // Process chunks in parallel batches to avoid rate limiting
      const batchSize = 8; // Process 8 chunks at a time
      const batches: string[][] = [];
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        batches.push(chunks.slice(i, i + batchSize));
      }
      
      console.log(`🚀 Processing ${chunks.length} chunks in ${batches.length} parallel batches of ${batchSize}...`);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} chunks...`);
        
        // Process current batch in parallel
        const batchPromises = batch.map(async (chunk, localIndex) => {
          const globalIndex = batchIndex * batchSize + localIndex;
          const tempPath = this.generateOutputPath(ttsOptions.format || 'mp3', `chunk_${globalIndex}`);
          
          console.log(`🎤 Processing chunk ${globalIndex + 1}/${chunks.length} (${chunk.length} chars)...`);
          
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              await this.textToSpeech(chunk, {
                ...ttsOptions,
                outputPath: tempPath,
                removeSilence: false // Apply silence removal only at the end
              });
              
              return { index: globalIndex, path: tempPath };
              
            } catch (error: any) {
              retryCount++;
              console.warn(`⚠️  Chunk ${globalIndex + 1} failed (attempt ${retryCount}/${maxRetries}): ${error.message}`);
              
              if (retryCount >= maxRetries) {
                throw new Error(`Failed to process chunk ${globalIndex + 1} after ${maxRetries} attempts: ${error.message}`);
              }
              
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
          }
        });
        
        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Sort results by index and add to tempFiles array
        batchResults
          .filter((result): result is { index: number; path: string } => result !== undefined)
          .sort((a, b) => a.index - b.index)
          .forEach(result => tempFiles.push(result.path));
          
        // Small delay between batches to be nice to the API
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('🔗 Combining audio chunks...');
      
      // Combine audio files
        await this.combineAudioFiles(tempFiles, outputPath);

      // Apply silence removal if requested
      let finalOutputPath = outputPath;
      if (ttsOptions.removeSilence) {
        console.log('🔇 Removing silence from combined audio...');
        finalOutputPath = await this.removeSilenceFromAudio(outputPath, ttsOptions.format || 'mp3', ttsOptions.silenceThreshold, ttsOptions.silenceLength);
      }

      // Clean up temp files
      tempFiles.forEach(file => {
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.warn(`⚠️  Could not delete temp file: ${file}`);
        }
      });

      const stats = fs.statSync(finalOutputPath);
      const result = {
        audioPath: finalOutputPath,
        duration: this.estimateAudioDuration(text, ttsOptions.speed || 1.0),
        fileSize: stats.size,
        format: ttsOptions.format || 'mp3'
      };
      
      console.log(`✅ Fish Audio processing complete! Generated ${chunks.length} chunks, combined into ${(result.fileSize / 1024 / 1024).toFixed(2)} MB file`);
      
      return result;

    } catch (error) {
      // Clean up temp files on error
      tempFiles.forEach(file => {
        try {
          fs.unlinkSync(file);
        } catch {}
      });
      throw error;
    }
  }

  /**
   * Combine multiple audio files into one using FFmpeg for better quality
   */
  private async combineAudioFiles(inputFiles: string[], outputPath: string): Promise<void> {
    console.log('🔗 Combining audio chunks...');
    
    // Try FFmpeg first for better quality
    try {
      await execAsync('ffmpeg -version');
      
      // Create a list file for FFmpeg
      const listFilePath = outputPath.replace('.mp3', '_list.txt');
      const listContent = inputFiles.map(file => `file '${file}'`).join('\n');
      fs.writeFileSync(listFilePath, listContent);
      
      // Use FFmpeg to concatenate with re-encoding for consistency
      const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c:a libmp3lame -b:a 128k -y "${outputPath}"`;
      
      console.log('🔧 Using FFmpeg for high-quality audio combination...');
      await execAsync(ffmpegCommand);
      
      // Clean up list file
      fs.unlinkSync(listFilePath);
      
      console.log('✅ Audio chunks combined with FFmpeg');
      return;
      
    } catch (error) {
      console.warn('⚠️  FFmpeg not available, falling back to simple concatenation...');
    }
    
    // Fallback to simple concatenation
    console.log('🔗 Using simple concatenation for audio combination...');
    const writeStream = fs.createWriteStream(outputPath);
    
    for (const file of inputFiles) {
      const data = fs.readFileSync(file);
      writeStream.write(data);
    }
    
    writeStream.end();
    
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log('✅ Audio chunks combined with simple concatenation');
        resolve();
      });
      writeStream.on('error', reject);
    });
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
      // silenceremove filter: removes silence at beginning and end
      // Using user-specified threshold and minimum silence length
      const silenceDurationSeconds = silenceLength / 1000; // Convert ms to seconds
      const bufferDuration = 0.04; // 40ms buffer (keep_silence)
      const ffmpegCommand = `ffmpeg -i "${inputPath}" -af "silenceremove=start_periods=1:start_duration=${silenceDurationSeconds}:start_threshold=${silenceThreshold}dB:detection=peak,silenceremove=stop_periods=-1:stop_duration=${silenceDurationSeconds}:stop_threshold=${silenceThreshold}dB:detection=peak,apad=pad_dur=${bufferDuration}" -y "${outputPath}"`;
      
      console.log('🔧 Running FFmpeg silence removal...');
      await execAsync(ffmpegCommand);
      
      // Check if output file was created successfully
      if (fs.existsSync(outputPath)) {
        // Remove original file
        fs.unlinkSync(inputPath);
        console.log('✅ Silence removal completed');
        return outputPath;
      } else {
        console.warn('⚠️  Silence removal failed, using original file');
        return inputPath;
      }
    } catch (error: any) {
      console.warn('⚠️  FFmpeg silence removal failed:', error.message);
      console.warn('💡 Using original audio file without silence removal');
      return inputPath;
    }
  }

  /**
   * Estimate audio duration based on text length and speech speed
   */
  private estimateAudioDuration(text: string, speed: number = 1.0): number {
    // Average speaking rate: ~150 words per minute
    // Adjust for speed multiplier
    const words = text.split(/\s+/).length;
    const baseMinutes = words / 150;
    const adjustedMinutes = baseMinutes / speed;
    return Math.round(adjustedMinutes * 60); // Convert to seconds
  }

  /**
   * Generate output file path
   */
  private generateOutputPath(format: string, prefix: string = 'voiceover'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${prefix}_${timestamp}.${format}`;
    return path.resolve(process.cwd(), 'output', filename);
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
 * Create Fish Audio service instance with API key from environment
 */
export function createFishAudioService(apiKey?: string): FishAudioService {
  // Hardcoded Fish Audio API key for easy testing
  const hardcodedKey = 'c844305717fe4290ba5421f0a3a59b9a'; // Your actual Fish Audio API key
  
  const key = apiKey || process.env.FISH_API_KEY || hardcodedKey;
  
  if (!key) {
    throw new Error(
      'Fish Audio API key is required. Set FISH_API_KEY environment variable or pass apiKey parameter.'
    );
  }

  console.log(`🔑 Using Fish Audio API key: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);

  return new FishAudioService({ apiKey: key });
}

/**
 * Quick text-to-speech function
 */
export async function generateVoiceover(
  text: string,
  options: {
    apiKey?: string;
    outputPath?: string;
    model?: string;
    format?: 'mp3' | 'wav' | 'opus';
    speed?: number;
    volume?: number;
    referenceId?: string;
    referenceAudioPath?: string;
    removeSilence?: boolean;
    silenceThreshold?: number;
    silenceLength?: number;
  } = {}
): Promise<VoiceoverResult> {
  FishAudioService.ensureOutputDirectory();
  
  const service = createFishAudioService(options.apiKey);
  
  // Use processLongText for better handling of long stories
  return service.processLongText(text, {
    ...options,
    referenceAudioPath: options.referenceAudioPath
  });
} 