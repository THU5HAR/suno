/**
 * Transcription Service
 * Handles audio-to-text transcription using Web Speech API or external services
 * Supports multiple languages with auto-detection
 */

interface TranscriptionResult {
  text: string;
  language?: string;
  confidence?: number;
}

interface ComparisonResult {
  match: boolean;
  similarity: number;
  differences?: string[];
}

class TranscriptionService {

  /**
   * Transcribe audio from URL using Hugging Face's free Whisper API
   * 
   * Uses Hugging Face Inference API which is completely free and supports:
   * - Multiple languages (auto-detection)
   * - High accuracy transcription
   * - No API key required for public models
   */
  async transcribeAudio(
    audioUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    try {
      onProgress?.(10);

      // Download audio file
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      onProgress?.(30);

      const audioBlob = await response.blob();
      
      onProgress?.(50);

      // Use backend API endpoint to avoid CORS issues
      // Backend will proxy the request to Hugging Face's free Whisper API
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const backendApiUrl = `${apiBaseUrl}/api/transcribe`;
      
      onProgress?.(70);

      try {
        // Send audio file to backend
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.mp3');
        
        const transcriptResponse = await fetch(backendApiUrl, {
          method: 'POST',
          body: formData,
        });

        if (!transcriptResponse.ok) {
          // If model is loading, wait and retry
          if (transcriptResponse.status === 503) {
            const errorData = await transcriptResponse.json().catch(() => ({}));
            const retryAfter = errorData.retryAfter || 10;
            throw new Error(`Model is loading. Please wait ${retryAfter} seconds and try again.`);
          }
          
          const errorData = await transcriptResponse.json().catch(() => ({ error: transcriptResponse.statusText }));
          throw new Error(errorData.error || errorData.message || `Transcription failed: ${transcriptResponse.statusText}`);
        }

        const result = await transcriptResponse.json();
        onProgress?.(100);
        
        return {
          text: result.text || '',
          language: result.language || 'Unknown',
          confidence: result.confidence || 0.9,
        };
      } catch (apiError: any) {
        // Re-throw with better error message
        throw new Error(apiError.message || 'Transcription service unavailable');
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }




  /**
   * Compare transcribed text with lyrics
   * Uses fuzzy matching to account for slight differences
   */
  compareText(transcribedText: string, lyricsText: string): ComparisonResult {
    // Normalize text (remove punctuation, convert to lowercase, remove extra spaces)
    const normalize = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    const normalizedTranscribed = normalize(transcribedText);
    const normalizedLyrics = normalize(lyricsText);

    // Calculate similarity using Levenshtein distance
    const similarity = this.calculateSimilarity(normalizedTranscribed, normalizedLyrics);
    
    // Consider it a match if similarity is >= 80%
    const match = similarity >= 0.8;

    // Find differences if not matching
    const differences: string[] = [];
    if (!match) {
      const transcribedWords = normalizedTranscribed.split(' ');
      const lyricsWords = normalizedLyrics.split(' ');
      
      // Find words in transcribed that are not in lyrics
      const missingInLyrics = transcribedWords.filter(
        word => word && !lyricsWords.includes(word)
      );
      
      // Find words in lyrics that are not in transcribed
      const missingInTranscribed = lyricsWords.filter(
        word => word && !transcribedWords.includes(word)
      );

      if (missingInLyrics.length > 0) {
        differences.push(`Extra words in transcript: ${missingInLyrics.slice(0, 5).join(', ')}`);
      }
      if (missingInTranscribed.length > 0) {
        differences.push(`Missing words: ${missingInTranscribed.slice(0, 5).join(', ')}`);
      }

      if (differences.length === 0) {
        differences.push('Text structure differs significantly');
      }
    }

    return {
      match,
      similarity,
      differences: differences.length > 0 ? differences : undefined,
    };
  }

  /**
   * Calculate similarity between two texts using Levenshtein distance
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const longer = text1.length > text2.length ? text1 : text2;

    if (longer.length === 0) {
      return 1.0; // Both empty
    }

    const distance = this.levenshteinDistance(text1, text2);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const transcriptionService = new TranscriptionService();

