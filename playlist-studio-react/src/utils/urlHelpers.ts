// URL helper functions for detecting and handling different URL types

export const isYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  const normalizedUrl = url.trim().toLowerCase();
  return (
    normalizedUrl.includes('youtube.com/watch') ||
    normalizedUrl.includes('youtu.be/') ||
    normalizedUrl.includes('youtube.com/embed/')
  );
};

export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

export const isGoogleDriveUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('drive.google.com');
};

export const isDirectAudioUrl = (url: string): boolean => {
  if (!url) return false;
  const normalizedUrl = url.trim().toLowerCase();
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm'];
  return audioExtensions.some(ext => normalizedUrl.includes(ext));
};

export const convertGoogleDriveUrl = (url: string): string | null => {
  if (!isGoogleDriveUrl(url)) return null;
  
  const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
  }
  
  return null;
};

export const validateAudioUrl = (url: string): {
  isValid: boolean;
  error?: string;
  urlType?: 'youtube' | 'google_drive' | 'direct' | 'unknown';
} => {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  // Check if it's a YouTube URL
  if (isYouTubeUrl(trimmedUrl)) {
    return {
      isValid: false,
      error: 'YouTube URLs are not directly supported. Please use a direct audio file URL or convert the YouTube video to an audio file first.',
      urlType: 'youtube',
    };
  }

  // Validate URL format
  try {
    new URL(trimmedUrl);
  } catch (e) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // Check if it's Google Drive
  if (isGoogleDriveUrl(trimmedUrl)) {
    return { isValid: true, urlType: 'google_drive' };
  }

  // Check if it's a direct audio URL
  if (isDirectAudioUrl(trimmedUrl)) {
    return { isValid: true, urlType: 'direct' };
  }

  // Generic valid URL
  return { isValid: true, urlType: 'unknown' };
};

