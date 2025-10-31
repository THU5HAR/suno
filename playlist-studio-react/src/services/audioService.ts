import { audioProcessingService } from './audioProcessingService';
import { Song, AudioBuffer, ProcessingState } from '@/types';

export class AudioService {
  private audioBuffers: Map<string, AudioBuffer> = new Map();

  async downloadAndProcessSong(song: Song, onProgress?: (progress: number) => void): Promise<AudioBuffer> {
    if (!song.url) {
      throw new Error('Song URL is required for downloading');
    }

    try {
      const filename = this.generateFilename(song);
      const audioBuffer = await audioProcessingService.downloadAudio(song.url, filename, onProgress);

      // Store the buffer for later use
      this.audioBuffers.set(song.id, audioBuffer);

      return audioBuffer;
    } catch (error) {
      throw new Error(`Failed to download and process song "${song.title}": ${error}`);
    }
  }

  async analyzeSong(song: Song): Promise<{ duration: number; format: string; sampleRate: number }> {
    const audioBuffer = this.audioBuffers.get(song.id);
    if (!audioBuffer) {
      throw new Error(`Audio buffer not found for song "${song.title}". Download the song first.`);
    }

    try {
      return await audioProcessingService.analyzeAudio(audioBuffer);
    } catch (error) {
      throw new Error(`Failed to analyze song "${song.title}": ${error}`);
    }
  }

  async stitchPlaylistSongs(
    songs: Song[],
    crossfadeDuration: number = 2,
    onProgress?: (state: ProcessingState) => void
  ): Promise<AudioBuffer> {
    if (songs.length === 0) {
      throw new Error('No songs provided for stitching');
    }

    try {
      // Step 1: Ensure all songs are downloaded first
      onProgress?.({
        isProcessing: true,
        progress: 0,
        currentOperation: 'Preparing to download songs...',
      });

      const audioBuffers: AudioBuffer[] = [];
      const totalSongs = songs.length;
      const downloadProgressWeight = 50; // 50% of total progress for downloading

      // Download each song that's not already cached
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        let audioBuffer = this.audioBuffers.get(song.id);
        
        if (!audioBuffer) {
          // Show download progress for this song
          onProgress?.({
            isProcessing: true,
            progress: Math.round((i / totalSongs) * downloadProgressWeight),
            currentOperation: `Downloading "${song.title}"... (${i + 1}/${totalSongs})`,
          });

          // Download with progress callback
          audioBuffer = await this.downloadAndProcessSong(song, (downloadProgress) => {
            // Calculate overall progress: base progress + download progress for this song
            const baseProgress = (i / totalSongs) * downloadProgressWeight;
            const songProgress = (downloadProgress / 100) * (downloadProgressWeight / totalSongs);
            onProgress?.({
              isProcessing: true,
              progress: Math.round(baseProgress + songProgress),
              currentOperation: `Downloading "${song.title}"... ${downloadProgress}% (${i + 1}/${totalSongs})`,
            });
          });

          onProgress?.({
            isProcessing: true,
            progress: Math.round(((i + 1) / totalSongs) * downloadProgressWeight),
            currentOperation: `✅ Downloaded "${song.title}" (${i + 1}/${totalSongs})`,
          });
        } else {
          // Song already cached
          onProgress?.({
            isProcessing: true,
            progress: Math.round(((i + 1) / totalSongs) * downloadProgressWeight),
            currentOperation: `✅ Using cached "${song.title}" (${i + 1}/${totalSongs})`,
          });
        }
        
        audioBuffers.push(audioBuffer);
      }

      // Step 2: All songs downloaded, now stitch them
      onProgress?.({
        isProcessing: true,
        progress: downloadProgressWeight,
        currentOperation: 'All songs downloaded! Starting to stitch...',
      });

      // Stitch the audio files (this will take the remaining 50% of progress)
      const stitchProgressCallback = (state: ProcessingState) => {
        // Map stitching progress to 50-100% range
        const stitchProgress = downloadProgressWeight + (state.progress || 0) * (100 - downloadProgressWeight) / 100;
        onProgress?.({
          ...state,
          progress: Math.round(stitchProgress),
          currentOperation: state.currentOperation || 'Stitching audio...',
        });
      };

      const stitchedBuffer = await audioProcessingService.stitchAudioFiles(
        audioBuffers,
        crossfadeDuration,
        stitchProgressCallback
      );

      return stitchedBuffer;
    } catch (error) {
      onProgress?.({
        isProcessing: false,
        progress: 0,
        currentOperation: undefined,
        error: error instanceof Error ? error.message : 'Failed to stitch playlist',
      });
      throw new Error(`Failed to stitch playlist: ${error}`);
    }
  }

  async createBlobUrl(audioBuffer: AudioBuffer): Promise<string> {
    const blob = new Blob([audioBuffer.data], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  async downloadAudioFile(audioBuffer: AudioBuffer): Promise<void> {
    const blob = new Blob([audioBuffer.data], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = audioBuffer.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  clearCache(): void {
    // Clean up blob URLs
    for (const _buffer of this.audioBuffers.values()) {
      // Note: We don't store blob URLs in the buffer, so no cleanup needed here
    }
    this.audioBuffers.clear();
  }

  removeSongFromCache(songId: string): void {
    this.audioBuffers.delete(songId);
  }

  getCachedSongs(): string[] {
    return Array.from(this.audioBuffers.keys());
  }

  isSongCached(songId: string): boolean {
    return this.audioBuffers.has(songId);
  }

  private generateFilename(song: Song): string {
    const title = song.title || 'unknown';
    const artist = song.artist || 'unknown';
    // Sanitize filename
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    const sanitizedArtist = artist.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    return `${sanitizedArtist}-${sanitizedTitle}.mp3`;
  }
}

export const audioService = new AudioService();