import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { CanvasData, VideoGenerationOptions, ProcessingState, AudioBuffer } from '@/types';

class VideoGenerationService {
  private ffmpeg: FFmpeg;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
    // Capture FFmpeg logs for debugging
    this.ffmpeg.on('log', ({ message, type }) => {
      if (type === 'info') {
        console.log('[FFmpeg Video]', message);
      } else if (type === 'fferr') {
        console.error('[FFmpeg Video Error]', message);
      }
    });

    // Track progress
    this.ffmpeg.on('progress', ({ progress }) => {
      console.log(`Video generation progress: ${(progress * 100).toFixed(2)}%`);
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
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      
      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });
      this.isLoaded = true;
      console.log('FFmpeg loaded successfully for video generation');
    } catch (error) {
      console.error('FFmpeg load error:', error);
      throw new Error(`Failed to load FFmpeg: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Convert blob URL to data URL for persistence
   */
  private async blobToDataURL(blobUrl: string): Promise<string> {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to convert blob to data URL:', error);
      throw error;
    }
  }

  /**
   * Convert canvas data to a PNG image blob
   * Renders all canvas objects including shapes, text, and images
   */
  private async canvasDataToImage(
    canvasData: CanvasData,
    width: number,
    height: number
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Converting canvas data to image:', {
          backgroundColor: canvasData.backgroundColor,
          objectCount: canvasData.objects.length,
          objects: canvasData.objects.map(obj => ({ type: obj.type, left: obj.left, top: obj.top }))
        });

        // Create a temporary canvas to render the design
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Set background color
        ctx.fillStyle = canvasData.backgroundColor || '#000000';
        ctx.fillRect(0, 0, width, height);

        // Render all objects
        for (const obj of canvasData.objects) {
          ctx.save();

          // Apply transformations
          const objLeft = obj.left || 0;
          const objTop = obj.top || 0;
          const objWidth = obj.width || 0;
          const objHeight = obj.height || 0;
          const scaleX = obj.scaleX || 1;
          const scaleY = obj.scaleY || 1;
          const angle = obj.angle || 0;
          const opacity = obj.opacity !== undefined ? obj.opacity : 1;

          // Move to object position
          ctx.translate(objLeft, objTop);
          
          // Apply rotation
          if (angle !== 0) {
            ctx.rotate((angle * Math.PI) / 180);
          }
          
          // Apply scaling
          if (scaleX !== 1 || scaleY !== 1) {
            ctx.scale(scaleX, scaleY);
          }

          // Apply opacity
          ctx.globalAlpha = opacity;

          // Draw based on type
          if (obj.type === 'rect' || obj.type === 'rectangle') {
            ctx.fillStyle = obj.fill || '#000000';
            if (obj.stroke && obj.strokeWidth) {
              ctx.strokeStyle = obj.stroke;
              ctx.lineWidth = obj.strokeWidth;
              ctx.fillRect(-objWidth / 2, -objHeight / 2, objWidth, objHeight);
              ctx.strokeRect(-objWidth / 2, -objHeight / 2, objWidth, objHeight);
            } else {
              ctx.fillRect(-objWidth / 2, -objHeight / 2, objWidth, objHeight);
            }
          } else if (obj.type === 'circle') {
            ctx.fillStyle = obj.fill || '#000000';
            const radius = objWidth / 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            if (obj.stroke && obj.strokeWidth) {
              ctx.strokeStyle = obj.stroke;
              ctx.lineWidth = obj.strokeWidth;
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.fill();
            }
          } else if (obj.type === 'text' || obj.type === 'textbox' || obj.type === 'i-text') {
            ctx.fillStyle = obj.fill || '#000000';
            ctx.font = `${obj.fontSize || 20}px ${obj.fontFamily || 'Arial'}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(obj.text || 'Text', 0, 0);
          } else if (obj.type === 'image' && obj.src) {
            // Load and draw image
            try {
              let imageSrc = obj.src;
              
              // Convert blob URL to data URL for better persistence
              if (imageSrc.startsWith('blob:')) {
                try {
                  console.log('Converting blob URL to data URL:', imageSrc);
                  imageSrc = await this.blobToDataURL(imageSrc);
                  console.log('Successfully converted blob URL');
                } catch (blobError) {
                  console.warn('Failed to convert blob URL, using original:', blobError);
                  // Continue with blob URL, might still work
                }
              }

              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              await new Promise<void>((imgResolve, imgReject) => {
                const timeout = setTimeout(() => {
                  console.error('Image load timeout:', imageSrc);
                  imgReject(new Error('Image load timeout'));
                }, 10000); // 10 second timeout

                img.onload = () => {
                  clearTimeout(timeout);
                  try {
                    const imgWidth = objWidth || img.width;
                    const imgHeight = objHeight || img.height;
                    console.log('Drawing image:', { imgWidth, imgHeight, src: imageSrc.substring(0, 50) });
                    ctx.drawImage(
                      img,
                      -imgWidth / 2,
                      -imgHeight / 2,
                      imgWidth,
                      imgHeight
                    );
                    imgResolve();
                  } catch (drawError) {
                    console.error('Error drawing image:', drawError);
                    imgReject(drawError);
                  }
                };
                img.onerror = (error) => {
                  clearTimeout(timeout);
                  console.error('Failed to load image:', imageSrc, error);
                  // Continue with other objects even if one image fails
                  imgResolve(); // Resolve instead of reject to continue
                };
                img.src = imageSrc;
              });
            } catch (imgError) {
              console.error('Error processing image object:', imgError);
              // Continue with other objects even if one image fails
            }
          }

          ctx.restore();
        }

        console.log('Canvas rendering complete, converting to blob...');
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('Successfully created image blob, size:', blob.size);
            resolve(blob);
          } else {
            console.error('Failed to create image blob from canvas');
            reject(new Error('Failed to create image blob from canvas'));
          }
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate video from canvas image and audio
   */
  async generateVideo(
    audioBuffer: AudioBuffer,
    canvasData: CanvasData,
    options: VideoGenerationOptions,
    onProgress?: (state: ProcessingState) => void
  ): Promise<Blob> {
    await this.loadFFmpeg();

    try {
      onProgress?.({
        isProcessing: true,
        progress: 0,
        currentOperation: 'Preparing video generation',
      });

      // Step 1: Convert canvas to image
      onProgress?.({
        isProcessing: true,
        progress: 10,
        currentOperation: 'Converting canvas to image',
      });

      const imageBlob = await this.canvasDataToImage(canvasData, options.width, options.height);
      const imageArrayBuffer = await imageBlob.arrayBuffer();
      
      // Step 2: Prepare files for FFmpeg
      const imageFileName = `thumbnail_${Date.now()}.png`;
      const audioFileName = `audio_${Date.now()}.wav`;
      const outputFileName = `output_${Date.now()}.mp4`;

      onProgress?.({
        isProcessing: true,
        progress: 20,
        currentOperation: 'Writing files to FFmpeg',
      });

      // Write image file
      await this.ffmpeg.writeFile(imageFileName, new Uint8Array(imageArrayBuffer));

      // Write audio file
      await this.ffmpeg.writeFile(audioFileName, new Uint8Array(audioBuffer.data));

      onProgress?.({
        isProcessing: true,
        progress: 40,
        currentOperation: 'Generating video',
      });

      // Step 3: Generate video with FFmpeg
      // Using loop input to repeat the image, and combining with audio
      await this.ffmpeg.exec([
        '-loop', '1',
        '-i', imageFileName,
        '-i', audioFileName,
        '-c:v', 'libx264',
        '-t', options.duration.toString(),
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        '-y', // Overwrite output file
        outputFileName
      ]);

      onProgress?.({
        isProcessing: true,
        progress: 90,
        currentOperation: 'Reading generated video',
      });

      // Step 4: Read the output video
      const outputData = await this.ffmpeg.readFile(outputFileName);
      const outputBuffer = outputData as Uint8Array;
      // Create a copy to ensure we have a proper ArrayBuffer (not SharedArrayBuffer)
      const arrayBuffer = new ArrayBuffer(outputBuffer.byteLength);
      const uint8Array = new Uint8Array(arrayBuffer);
      uint8Array.set(outputBuffer);
      const videoBlob = new Blob([uint8Array], { type: 'video/mp4' });

      // Cleanup
      await this.cleanupFiles([imageFileName, audioFileName, outputFileName]);

      onProgress?.({
        isProcessing: false,
        progress: 100,
        currentOperation: 'Video generation complete',
      });

      return videoBlob;
    } catch (error) {
      onProgress?.({
        isProcessing: false,
        progress: 0,
        currentOperation: undefined,
        error: error instanceof Error ? error.message : 'Video generation failed',
      });
      throw new Error(`Video generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupFiles(fileNames: string[]): Promise<void> {
    for (const fileName of fileNames) {
      try {
        await this.ffmpeg.deleteFile(fileName);
      } catch (error) {
        console.warn(`Failed to cleanup file ${fileName}:`, error);
      }
    }
  }

  /**
   * Get video duration from a video blob
   */
  async getVideoDuration(videoBlob: Blob): Promise<number> {
    await this.loadFFmpeg();

    try {
      const inputFileName = `video_${Date.now()}.mp4`;
      const outputFileName = `info_${Date.now()}.json`;

      // Write video file
      const arrayBuffer = await videoBlob.arrayBuffer();
      await this.ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));

      // Get video info using ffprobe-like functionality
      // Note: This is a simplified approach. For production, you might want to use a proper metadata extraction
      // For now, we'll estimate based on file size or use the audio duration
      
      // Clean up
      await this.cleanupFiles([inputFileName, outputFileName]);

      // Return a default duration - in production, parse the actual metadata
      return 0;
    } catch (error) {
      console.error('Failed to get video duration:', error);
      return 0;
    }
  }
}

export const videoGenerationService = new VideoGenerationService();

