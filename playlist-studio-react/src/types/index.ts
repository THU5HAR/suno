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

export interface CanvasObject {
  type: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  fill?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  angle?: number;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
}

export interface CanvasData {
  backgroundColor: string;
  objects: CanvasObject[];
}

export interface StepData {
  playlist: Song[];
  feedback: Feedback[];
  assets: Asset[];
  canvasData?: CanvasData;
  timestamp: string;
  stepNumber: number;
}

export interface ProjectState {
  playlist: Song[];
  feedback: Feedback[];
  assets: Asset[];
  currentStep: number;
  stepCompletion: Record<number, boolean>;
  stepData: Record<number, StepData>;
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
