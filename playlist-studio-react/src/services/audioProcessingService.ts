import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { AudioBuffer, ProcessingState } from '@/types';

class AudioProcessingService {
  private ffmpeg: FFmpeg;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
    // Capture FFmpeg logs for debugging
    this.ffmpeg.on('log', ({ message, type }) => {
      if (type === 'info') {
        console.log('[FFmpeg]', message);
      } else if (type === 'fferr') {
        console.error('[FFmpeg Error]', message);
      }
    });
  }

  private async loadFFmpeg(): Promise<void> {
    if (this.isLoaded) return;
    if (this.isLoading) {
      // Wait for ongoing load to complete
      while (this.isLoading && !this.isLoaded) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;
    try {
      // Use the correct version that matches @ffmpeg/ffmpeg package version
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      
      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });
      this.isLoaded = true;
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('FFmpeg load error:', error);
      throw new Error(`Failed to load FFmpeg: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isLoading = false;
    }
  }

  async downloadAudio(url: string, filename: string, onProgress?: (progress: number) => void): Promise<AudioBuffer> {
    try {
      onProgress?.(0);

      // Check for YouTube URLs
      const trimmedUrl = url.trim().toLowerCase();
      if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
        throw new Error(
          'YouTube URLs are not directly supported. ' +
          'Please convert the YouTube video to an audio file (MP3, WAV, etc.) and use a direct download link. ' +
          'You can use services like ytmp3.cc or download the audio and upload to Google Drive.'
        );
      }

      // Handle Google Drive URLs - convert sharing links to direct download
      let downloadUrl = url.trim();
      if (downloadUrl.includes('drive.google.com')) {
        const fileIdMatch = downloadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          downloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        }
      }

      const response = await fetch(downloadUrl, {
        mode: 'cors',
      });
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          received += value.length;

          if (total > 0) {
            onProgress?.(Math.round((received / total) * 100));
          }
        }
      }

      const blob = new Blob(chunks as BlobPart[]);
      const arrayBuffer = await blob.arrayBuffer();

      onProgress?.(100);

      return {
        name: filename,
        data: arrayBuffer,
        originalName: filename,
      };
    } catch (error) {
      throw new Error(`Audio download failed: ${error}`);
    }
  }

  async analyzeAudio(audioBuffer: AudioBuffer): Promise<{ duration: number; format: string; sampleRate: number }> {
    await this.loadFFmpeg();

    try {
      const inputFileName = `input_${Date.now()}.${this.getFileExtension(audioBuffer.name)}`;
      
      // Write input file
      await this.ffmpeg.writeFile(inputFileName, new Uint8Array(audioBuffer.data));

      // Get audio info using FFmpeg (not ffprobe - not available in wasm version)
      // Use -f null and capture stderr for duration info, then parse it
      let stderrOutput = '';
      
      // Capture logs for debugging - store handler reference for cleanup
      const logHandler = ({ message }: { message: string }) => {
        stderrOutput += message + '\n';
      };
      
      this.ffmpeg.on('log', logHandler);

      // Run ffmpeg to get info (will fail but gives us metadata)
      try {
        await this.ffmpeg.exec([
          '-i', inputFileName,
          '-f', 'null',
          '-'
        ]);
      } catch (execError) {
        // FFmpeg outputs metadata to stderr, this is expected
        // Parse duration from stderr output
      }

      // Remove log handler
      this.ffmpeg.off('log', logHandler);

      // Parse duration from stderr (format: Duration: HH:MM:SS.ms)
      const durationMatch = stderrOutput.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      let duration = 0;
      if (durationMatch) {
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseFloat(durationMatch[3]);
        duration = hours * 3600 + minutes * 60 + seconds;
      }

      // Parse sample rate (format: Audio: ... 44100 Hz)
      const sampleRateMatch = stderrOutput.match(/(\d{4,})\s*Hz/);
      const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 44100;

      // Clean up
      await this.ffmpeg.deleteFile(inputFileName);

      return {
        duration: duration || 0,
        format: this.getFileExtension(audioBuffer.name),
        sampleRate,
      };
    } catch (error) {
      console.error('Audio analysis error:', error);
      // Return default values if analysis fails
      return {
        duration: 0,
        format: this.getFileExtension(audioBuffer.name),
        sampleRate: 44100,
      };
    }
  }

  async stitchAudioFiles(
    audioBuffers: AudioBuffer[],
    _crossfadeDuration: number = 2, // Reserved for future crossfade feature
    onProgress?: (progress: ProcessingState) => void
  ): Promise<AudioBuffer> {
    await this.loadFFmpeg();

    try {
      onProgress?.({
        isProcessing: true,
        progress: 0,
        currentOperation: 'Preparing audio files',
      });

      const inputFiles: string[] = [];
      const tempFiles: string[] = [];

      // Step 1: Write all input files and convert to consistent WAV format
      onProgress?.({
        isProcessing: true,
        progress: 5,
        currentOperation: 'Converting files to WAV format...',
      });

      const wavFiles: string[] = [];
      for (let i = 0; i < audioBuffers.length; i++) {
        const inputFileName = `input_${i}_${Date.now()}.${this.getFileExtension(audioBuffers[i].name)}`;
        const wavFileName = `temp_${i}_${Date.now()}.wav`;

        try {
          // Write original file
          await this.ffmpeg.writeFile(inputFileName, new Uint8Array(audioBuffers[i].data));
          inputFiles.push(inputFileName);

          // Convert to WAV with consistent format
          await this.ffmpeg.exec([
            '-i', inputFileName,
            '-acodec', 'pcm_s16le',
            '-ar', '44100',
            '-ac', '2',
            '-y', // Overwrite output file
            wavFileName
          ]);

          wavFiles.push(wavFileName);
          tempFiles.push(wavFileName);

          onProgress?.({
            isProcessing: true,
            progress: Math.round(5 + (i / audioBuffers.length) * 40),
            currentOperation: `Converted file ${i + 1}/${audioBuffers.length} to WAV`,
          });
        } catch (convertError) {
          console.error(`Failed to convert file ${i}:`, convertError);
          throw new Error(`Failed to convert audio file ${i + 1}: ${convertError}`);
        }
      }

      // Step 2: Create concat demuxer file
      onProgress?.({
        isProcessing: true,
        progress: 50,
        currentOperation: 'Creating concatenation file...',
      });

      const concatFile = `concat_${Date.now()}.txt`;
      // Concat demuxer requires absolute paths, but we're using relative paths in virtual FS
      // Format: file 'path/to/file.wav'
      const concatContent = wavFiles.map(file => `file '${file}'`).join('\n');
      await this.ffmpeg.writeFile(concatFile, new TextEncoder().encode(concatContent));
      tempFiles.push(concatFile);

      // Step 3: Concatenate files
      onProgress?.({
        isProcessing: true,
        progress: 55,
        currentOperation: 'Concatenating audio files...',
      });

      const outputFileName = `stitched_${Date.now()}.wav`;

      // Simple concatenation - crossfade can be added later if needed
      // Using concat demuxer which is simpler and more reliable
      try {
        await this.ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', concatFile,
          '-c', 'copy', // Use copy for lossless concatenation of same format files
          '-y',
          outputFileName
        ]);
      } catch (concatError) {
        console.error('Concat failed, trying with re-encoding:', concatError);
        // If copy fails, try re-encoding
        await this.ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', concatFile,
          '-acodec', 'pcm_s16le',
          '-ar', '44100',
          '-ac', '2',
          '-y',
          outputFileName
        ]);
      }

      onProgress?.({
        isProcessing: true,
        progress: 90,
        currentOperation: 'Reading stitched audio...',
      });

      // Read the output file
      const outputData = await this.ffmpeg.readFile(outputFileName);
      const outputBuffer = outputData as Uint8Array;

      if (!outputBuffer || outputBuffer.length === 0) {
        throw new Error('Stitched audio file is empty');
      }

      // Clean up all temporary files
      for (const file of [...inputFiles, ...tempFiles, outputFileName]) {
        try {
          await this.ffmpeg.deleteFile(file);
        } catch (e) {
          console.warn(`Failed to delete temp file ${file}:`, e);
        }
      }

      onProgress?.({
        isProcessing: false,
        progress: 100,
        currentOperation: 'Complete',
      });

      return {
        name: 'stitched_audio.wav',
        data: outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength) as ArrayBuffer,
        originalName: 'stitched_audio.wav',
      };
    } catch (error) {
      console.error('Stitching error details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onProgress?.({
        isProcessing: false,
        progress: 0,
        currentOperation: undefined,
        error: `Stitching failed: ${errorMessage}`,
      });
      throw new Error(`Audio stitching failed: ${errorMessage}`);
    }
  }

  // Reserved for future crossfade feature
  // private buildCrossfadeFilter(segmentCount: number, crossfadeDuration: number): string {
  //   if (segmentCount <= 1) return '';
  //   const filters: string[] = [];
  //   for (let i = 0; i < segmentCount - 1; i++) {
  //     filters.push(
  //       `[${i}][${i + 1}]acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[a${i}]`
  //     );
  //   }
  //   const concatInputs = Array.from({ length: segmentCount - 1 }, (_, i) => `[a${i}]`).join('');
  //   filters.push(`${concatInputs}concat=n=${segmentCount - 1}:v=0:a=1[aout]`);
  //   return filters.join(';') + ';[aout]';
  // }

  private getFileExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    // Map common audio extensions
    const extensionMap: { [key: string]: string } = {
      'mp3': 'mp3',
      'wav': 'wav',
      'flac': 'flac',
      'aac': 'aac',
      'ogg': 'ogg',
      'm4a': 'm4a',
      'webm': 'webm',
    };
    return extensionMap[ext || ''] || 'mp3';
  }

  async convertToSupportedFormat(audioBuffer: AudioBuffer, targetFormat: 'wav' | 'mp3' = 'wav'): Promise<AudioBuffer> {
    await this.loadFFmpeg();

    try {
      const inputFileName = `input_${Date.now()}.${this.getFileExtension(audioBuffer.name)}`;
      const outputFileName = `output_${Date.now()}.${targetFormat}`;

      // Write input file
      await this.ffmpeg.writeFile(inputFileName, new Uint8Array(audioBuffer.data));

      // Convert to target format
      const codec = targetFormat === 'mp3' ? 'libmp3lame' : 'pcm_s16le';
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-acodec', codec,
        '-ar', '44100',
        '-ac', '2',
        outputFileName
      ]);

      // Read the output file
      const outputData = await this.ffmpeg.readFile(outputFileName);
      const outputBuffer = outputData as Uint8Array;

      // Clean up
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      return {
        name: `converted.${targetFormat}`,
        data: outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength) as ArrayBuffer,
        originalName: audioBuffer.originalName,
      };
    } catch (error) {
      throw new Error(`Format conversion failed: ${error}`);
    }
  }
}

export const audioProcessingService = new AudioProcessingService();