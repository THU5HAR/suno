/**
 * Service for extracting audio from YouTube and other video platforms
 */

export interface AudioExtractionResult {
  success: boolean;
  audioUrl: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string | null;
  videoId: string;
  format: {
    container: string;
    codec: string;
    bitrate: number | null;
    quality: string | null;
  };
}

export class AudioExtractionService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Extract audio URL from various platforms (YouTube, Suno, etc.)
   * Returns a direct audio stream URL that can be used for playback
   */
  async extractAudioFromYouTube(
    videoUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<AudioExtractionResult> {
    try {
      onProgress?.(10);

      // Validate URL format
      if (!videoUrl || !videoUrl.trim()) {
        throw new Error('Video URL is required');
      }

      onProgress?.(30);

      // Call backend API to extract audio (supports YouTube, Suno, etc.)
      let response: Response;
      try {
        response = await fetch(`${this.apiBaseUrl}/api/extract-audio?url=${encodeURIComponent(videoUrl)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (fetchError: any) {
        // Check if it's a network error (backend not running)
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
          throw new Error(`Cannot connect to backend server at ${this.apiBaseUrl}. Please ensure the backend is running.`);
        }
        throw fetchError;
      }

      onProgress?.(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || errorData.details || `Failed to extract audio: ${response.statusText}`);
      }

      const result = await response.json();
      onProgress?.(90);

      if (!result.success) {
        throw new Error(result.error || 'Audio extraction failed');
      }

      // Proxy through backend to avoid CORS issues for both YouTube and Suno URLs
      // YouTube CDN URLs often have CORS restrictions, and Suno URLs may also have issues
      let finalAudioUrl = result.audioUrl;
      const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
      const isSuno = videoUrl.includes('suno.com') || videoUrl.includes('suno.ai');
      
      if (isYouTube || isSuno) {
        // Always proxy extracted URLs through backend to avoid CORS issues
        finalAudioUrl = `${this.apiBaseUrl}/api/extract-audio/proxy?url=${encodeURIComponent(result.audioUrl)}`;
      }

      onProgress?.(100);

      return {
        ...result,
        audioUrl: finalAudioUrl, // Use proxied URL for Suno
      };
    } catch (error: any) {
      console.error('Audio extraction error:', error);
      throw new Error(`Failed to extract audio: ${error.message}`);
    }
  }

  /**
   * Download audio stream from various platforms
   * This creates a blob URL that can be used for playback
   */
  async downloadAudioStream(
    videoUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      onProgress?.(10);

      // First get the audio URL
      const extractionResult = await this.extractAudioFromYouTube(videoUrl, (progress) => {
        onProgress?.(progress * 0.5); // First half of progress
      });

      onProgress?.(60);

      // Download the audio file
      const audioResponse = await fetch(extractionResult.audioUrl);
      
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
      }

      onProgress?.(80);

      const audioBlob = await audioResponse.blob();
      const blobUrl = URL.createObjectURL(audioBlob);

      onProgress?.(100);

      return blobUrl;
    } catch (error: any) {
      console.error('Audio download error:', error);
      throw new Error(`Failed to download audio stream: ${error.message}`);
    }
  }
}

export const audioExtractionService = new AudioExtractionService();

