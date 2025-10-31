export const STEPS = {
  AUDIO: 1,
  DESIGN: 2,
  REVIEW: 3,
  EXPORT: 4
} as const;

export const STEP_LABELS = {
  [STEPS.AUDIO]: 'Audio Editing',
  [STEPS.DESIGN]: 'Video Design',
  [STEPS.REVIEW]: 'Review & Export',
  [STEPS.EXPORT]: 'Final Export'
} as const;

export const CANVAS_CONFIG = {
  width: 1280,
  height: 720,
  backgroundColor: '#000000'
} as const;

export const VIDEO_CONFIG = {
  width: 1280,
  height: 720,
  sidebarWidth: 300,
  frameRate: 30,
  audioBitrate: '128k'
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