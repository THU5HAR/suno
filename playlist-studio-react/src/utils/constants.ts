export const STEPS = {
  AUDIO: 1,
  STITCH: 2,
  VIDEO: 3,
  EXPORT: 4
} as const;

export const STEP_LABELS = {
  [STEPS.AUDIO]: 'Audio Editing',
  [STEPS.VIDEO]: 'Video Design',
  [STEPS.STITCH]: 'Stitch Audio',
  [STEPS.EXPORT]: 'Review & Export'
} as const;

export const AUDIO_CONFIG = {
  crossfadeDuration: 2, // seconds
  sampleRate: 44100,
  channels: 1,
  audioQuality: 2 // FFmpeg quality setting
} as const;

export const FILE_TYPES = {
  EXCEL: ['.xlsx', '.xls'],
  CSV: ['.csv'],
  AUDIO: ['.mp3', '.wav', '.m4a', '.aac'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
} as const;

export const NOTIFICATION_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000
} as const;

export const STORAGE_KEYS = {
  PROJECT_DATA: 'playlistStudioProject',
  USER_PREFERENCES: 'playlistStudioPreferences'
} as const;

export const API_ENDPOINTS = {
  // Add your API endpoints here when implementing backend integration
  UPLOAD: '/api/upload',
  EXPORT: '/api/export'
} as const;
