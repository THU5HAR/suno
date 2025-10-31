import { Song, Feedback } from '@/types';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const parseDuration = (durationStr: string): number => {
  const [minutes, seconds] = durationStr.split(':').map(Number);
  return minutes * 60 + seconds;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const calculateTotalDuration = (playlist: Song[]): number => {
  return playlist.reduce((total, song) => {
    if (song.duration) {
      const [minutes, seconds] = song.duration.split(':').map(Number);
      return total + minutes * 60 + seconds;
    }
    return total + 180; // Default 3 minutes if no duration
  }, 0);
};

export const validateSong = (song: Partial<Song>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!song.title || !song.title.trim()) {
    errors.push('Song title is required');
  }

  if (song.url && !isValidUrl(song.url)) {
    errors.push('Invalid URL format');
  }

  if (song.duration && !isValidDuration(song.duration)) {
    errors.push('Invalid duration format (use MM:SS)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidDuration = (duration: string): boolean => {
  const durationRegex = /^\d{1,2}:\d{2}$/;
  if (!durationRegex.test(duration)) return false;

  const [minutes, seconds] = duration.split(':').map(Number);
  return minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds <= 59;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait) as any;
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const groupFeedbackBySong = (feedback: Feedback[]): Record<string, Feedback[]> => {
  return feedback.reduce((acc, fb) => {
    if (!acc[fb.title]) {
      acc[fb.title] = [];
    }
    acc[fb.title].push(fb);
    return acc;
  }, {} as Record<string, Feedback[]>);
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export interface ParsedSong {
  title: string;
  artist?: string;
  url?: string;
  duration?: string;
  album?: string;
  year?: string;
}

export const parseCSV = async (file: File): Promise<ParsedSong[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV file must contain at least a header row and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const songs: ParsedSong[] = [];

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            // Simple CSV parsing (doesn't handle quoted fields with commas)
            const values = lines[i].split(',').map(v => v.trim());
            const song: Partial<ParsedSong> = {};

            headers.forEach((header, index) => {
              const value = values[index]?.trim() || '';
              if (header.includes('title') || header === 'song' || header === 'track') {
                song.title = value;
              } else if (header.includes('artist') || header === 'performer' || header === 'band') {
                song.artist = value;
              } else if (header.includes('url') || header === 'link' || header === 'source') {
                song.url = value;
              } else if (header.includes('duration') || header === 'length' || header === 'time') {
                song.duration = value;
              } else if (header.includes('album')) {
                song.album = value;
              } else if (header.includes('year') || header === 'release') {
                song.year = value;
              }
            });

            if (song.title) {
              songs.push(song as ParsedSong);
            }
          }
        }

        if (songs.length === 0) {
          throw new Error('No valid songs found in CSV file. Please ensure the file contains "title" column.');
        }

        resolve(songs);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read CSV file'));
    reader.readAsText(file);
  });
};

export const parseExcel = async (file: File): Promise<ParsedSong[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Dynamic import of xlsx to avoid SSR issues
      const XLSX = await import('xlsx');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row');
          }

          const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
          const songs: ParsedSong[] = [];

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.length > 0) {
              const song: Partial<ParsedSong> = {};

              headers.forEach((header, index) => {
                const value = row[index] ? String(row[index]).trim() : '';

                if (header.includes('title') || header === 'song' || header === 'track') {
                  song.title = value;
                } else if (header.includes('artist') || header === 'performer' || header === 'band') {
                  song.artist = value;
                } else if (header.includes('url') || header === 'link' || header === 'source') {
                  song.url = value;
                } else if (header.includes('duration') || header === 'length' || header === 'time') {
                  song.duration = value;
                } else if (header.includes('album')) {
                  song.album = value;
                } else if (header.includes('year') || header === 'release') {
                  song.year = value;
                }
              });

              if (song.title) {
                songs.push(song as ParsedSong);
              }
            }
          }

          if (songs.length === 0) {
            throw new Error('No valid songs found in Excel file. Please ensure columns contain "title" information.');
          }

          resolve(songs);
        } catch (error: any) {
          reject(new Error(`Excel parsing failed: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      reject(new Error(`Failed to load Excel parser: ${error.message}`));
    }
  });
};

export const createPlaceholderAudio = (): ArrayBuffer => {
  // Create a simple sine wave audio buffer for demonstration
  const sampleRate = 44100;
  const duration = 30; // 30 seconds
  const frequency = 440; // A4 note
  const samples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + samples * 2); // WAV header + 16-bit samples
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);

  // Generate sine wave
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0x7FFF;
    view.setInt16(44 + i * 2, sample, true);
  }

  return buffer;
};