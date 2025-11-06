export interface Song {
  id: string;
  title: string;
  artist?: string;
  url?: string;
  duration?: string;
  startTime?: string;
  album?: string;
  year?: string;
}

export interface Feedback {
  id: string;
  songIndex: number;
  timestamp: number;
  title: string;
  text: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  file?: File;
}

export interface StepData {
  playlist: Song[];
  feedback: Feedback[];
  assets: Asset[];
  timestamp: string;
  stepNumber: number;
  stitchSettings?: {
    crossfadeDuration?: number;
    delayBetweenSongs?: number;
  };
}

export interface ProjectState {
  playlist: Song[];
  feedback: Feedback[];
  assets: Asset[];
  currentStep: number;
  stepCompletion: Record<number, boolean>;
  stepData: Record<number, StepData>;
  currentVideoUrl?: string;
  stitchedAudioUrl?: string;
  isGenerating: boolean;
  isEditMode: boolean;
  processingState: ProcessingState;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentOperation?: string;
  error?: string;
}

export interface AudioBuffer {
  name: string;
  data: ArrayBuffer;
  originalName: string;
}
