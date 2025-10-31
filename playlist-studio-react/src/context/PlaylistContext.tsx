import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Song, Feedback, Asset, ProjectState, StepData, CanvasData, ProcessingState } from '@/types';
import { generateId } from '@/utils/helpers';
import { audioService } from '@/services/audioService';

interface PlaylistContextType {
  // State
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

  // Actions
  addSong: (song: Omit<Song, 'id'>) => void;
  removeSong: (id: string) => void;
  updateSong: (id: string, updates: Partial<Song>) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;

  addFeedback: (feedback: Omit<Feedback, 'id'>) => void;
  removeFeedback: (id: string) => void;

  addAsset: (asset: Omit<Asset, 'id'>) => void;
  removeAsset: (id: string) => void;

  setCurrentStep: (step: number) => void;
  markStepCompleted: (step: number) => void;
  setEditMode: (isEdit: boolean) => void;

  setCurrentVideoUrl: (url?: string) => void;
  setStitchedAudioUrl: (url?: string) => void;
  setIsGenerating: (generating: boolean) => void;

  updateProcessingState: (state: Partial<ProcessingState>) => void;

  saveCanvasData: (canvasData: CanvasData) => void;
  loadProjectData: () => void;
  saveProjectData: () => void;
  clearAll: () => void;

  // Audio processing actions
  downloadSong: (songId: string) => Promise<void>;
  analyzeSong: (songId: string) => Promise<{ duration: number; format: string; sampleRate: number }>;
  stitchPlaylist: (crossfadeDuration?: number) => Promise<void>;
  downloadStitchedAudio: () => Promise<void>;
  clearAudioCache: () => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

type PlaylistAction =
  | { type: 'ADD_SONG'; payload: Song }
  | { type: 'REMOVE_SONG'; payload: string }
  | { type: 'UPDATE_SONG'; payload: { id: string; updates: Partial<Song> } }
  | { type: 'REORDER_SONGS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'SET_PLAYLIST'; payload: Song[] }
  | { type: 'ADD_FEEDBACK'; payload: Feedback }
  | { type: 'REMOVE_FEEDBACK'; payload: string }
  | { type: 'SET_FEEDBACK'; payload: Feedback[] }
  | { type: 'ADD_ASSET'; payload: Asset }
  | { type: 'REMOVE_ASSET'; payload: string }
  | { type: 'SET_ASSETS'; payload: Asset[] }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'MARK_STEP_COMPLETED'; payload: number }
  | { type: 'SET_STEP_COMPLETION'; payload: Record<number, boolean> }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'SET_CURRENT_VIDEO_URL'; payload: string | undefined }
  | { type: 'SET_STITCHED_AUDIO_URL'; payload: string | undefined }
  | { type: 'SET_IS_GENERATING'; payload: boolean }
  | { type: 'UPDATE_PROCESSING_STATE'; payload: Partial<ProcessingState> }
  | { type: 'SAVE_CANVAS_DATA'; payload: CanvasData }
  | { type: 'LOAD_PROJECT_DATA'; payload: Partial<ProjectState> }
  | { type: 'CLEAR_ALL' };

const initialState: ProjectState = {
  playlist: [],
  feedback: [],
  assets: [],
  currentStep: 1,
  stepCompletion: { 1: false, 2: false, 3: false, 4: false },
  stepData: {},
  currentVideoUrl: undefined,
  stitchedAudioUrl: undefined,
  isGenerating: false,
  isEditMode: false,
  processingState: {
    isProcessing: false,
    progress: 0,
    currentOperation: undefined,
    error: undefined,
  },
};

function playlistReducer(state: ProjectState, action: PlaylistAction): ProjectState {
  switch (action.type) {
    case 'ADD_SONG':
      return {
        ...state,
        playlist: [...state.playlist, action.payload],
      };

    case 'REMOVE_SONG':
      return {
        ...state,
        playlist: state.playlist.filter(song => song.id !== action.payload),
      };

    case 'UPDATE_SONG':
      return {
        ...state,
        playlist: state.playlist.map(song =>
          song.id === action.payload.id
            ? { ...song, ...action.payload.updates }
            : song
        ),
      };

    case 'REORDER_SONGS':
      const { fromIndex, toIndex } = action.payload;
      const newPlaylist = [...state.playlist];
      const [movedSong] = newPlaylist.splice(fromIndex, 1);
      newPlaylist.splice(toIndex, 0, movedSong);
      return {
        ...state,
        playlist: newPlaylist,
      };

    case 'SET_PLAYLIST':
      return {
        ...state,
        playlist: action.payload,
      };

    case 'ADD_FEEDBACK':
      return {
        ...state,
        feedback: [...state.feedback, action.payload],
      };

    case 'REMOVE_FEEDBACK':
      return {
        ...state,
        feedback: state.feedback.filter(fb => fb.id !== action.payload),
      };

    case 'SET_FEEDBACK':
      return {
        ...state,
        feedback: action.payload,
      };

    case 'ADD_ASSET':
      return {
        ...state,
        assets: [...state.assets, action.payload],
      };

    case 'REMOVE_ASSET':
      return {
        ...state,
        assets: state.assets.filter(asset => asset.id !== action.payload),
      };

    case 'SET_ASSETS':
      return {
        ...state,
        assets: action.payload,
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };

    case 'MARK_STEP_COMPLETED':
      return {
        ...state,
        stepCompletion: {
          ...state.stepCompletion,
          [action.payload]: true,
        },
      };

    case 'SET_STEP_COMPLETION':
      return {
        ...state,
        stepCompletion: action.payload,
      };

    case 'SET_EDIT_MODE':
      return {
        ...state,
        isEditMode: action.payload,
      };

    case 'SET_CURRENT_VIDEO_URL':
      return {
        ...state,
        currentVideoUrl: action.payload,
      };

    case 'SET_STITCHED_AUDIO_URL':
      return {
        ...state,
        stitchedAudioUrl: action.payload,
      };

    case 'SET_IS_GENERATING':
      return {
        ...state,
        isGenerating: action.payload,
      };

    case 'UPDATE_PROCESSING_STATE':
      return {
        ...state,
        processingState: {
          ...state.processingState,
          ...action.payload,
        },
      };

    case 'SAVE_CANVAS_DATA':
      return {
        ...state,
        stepData: {
          ...state.stepData,
          [state.currentStep]: {
            ...state.stepData[state.currentStep],
            canvasData: action.payload,
            timestamp: new Date().toISOString(),
          } as StepData,
        },
      };

    case 'LOAD_PROJECT_DATA':
      return {
        ...state,
        ...action.payload,
      };

    case 'CLEAR_ALL':
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

interface PlaylistProviderProps {
  children: ReactNode;
}

export const PlaylistProvider: React.FC<PlaylistProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(playlistReducer, initialState);

  // Actions
  const addSong = useCallback((songData: Omit<Song, 'id'>) => {
    const song: Song = {
      ...songData,
      id: generateId(),
    };
    dispatch({ type: 'ADD_SONG', payload: song });
  }, []);

  const removeSong = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_SONG', payload: id });
  }, []);

  const updateSong = useCallback((id: string, updates: Partial<Song>) => {
    dispatch({ type: 'UPDATE_SONG', payload: { id, updates } });
  }, []);

  const reorderSongs = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_SONGS', payload: { fromIndex, toIndex } });
  }, []);

  const addFeedback = useCallback((feedbackData: Omit<Feedback, 'id'>) => {
    const feedback: Feedback = {
      ...feedbackData,
      id: generateId(),
    };
    dispatch({ type: 'ADD_FEEDBACK', payload: feedback });
  }, []);

  const removeFeedback = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FEEDBACK', payload: id });
  }, []);

  const addAsset = useCallback((assetData: Omit<Asset, 'id'>) => {
    const asset: Asset = {
      ...assetData,
      id: generateId(),
    };
    dispatch({ type: 'ADD_ASSET', payload: asset });
  }, []);

  const removeAsset = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ASSET', payload: id });
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  }, []);

  const markStepCompleted = useCallback((step: number) => {
    dispatch({ type: 'MARK_STEP_COMPLETED', payload: step });
  }, []);

  const setEditMode = useCallback((isEdit: boolean) => {
    dispatch({ type: 'SET_EDIT_MODE', payload: isEdit });
  }, []);

  const setCurrentVideoUrl = useCallback((url?: string) => {
    dispatch({ type: 'SET_CURRENT_VIDEO_URL', payload: url });
  }, []);

  const setStitchedAudioUrl = useCallback((url?: string) => {
    dispatch({ type: 'SET_STITCHED_AUDIO_URL', payload: url });
  }, []);

  const setIsGenerating = useCallback((generating: boolean) => {
    dispatch({ type: 'SET_IS_GENERATING', payload: generating });
  }, []);

  const updateProcessingState = useCallback((processingState: Partial<ProcessingState>) => {
    dispatch({ type: 'UPDATE_PROCESSING_STATE', payload: processingState });
  }, []);

  const saveCanvasData = useCallback((canvasData: CanvasData) => {
    dispatch({ type: 'SAVE_CANVAS_DATA', payload: canvasData });
  }, []);

  const loadProjectData = useCallback(() => {
    try {
      const saved = localStorage.getItem('playlistStudioProject');
      if (saved) {
        const projectData = JSON.parse(saved);
        dispatch({ type: 'LOAD_PROJECT_DATA', payload: projectData });
      }
    } catch (error) {
      console.warn('Failed to load project data:', error);
    }
  }, []);

  const saveProjectData = useCallback(() => {
    try {
      const projectData = {
        ...state,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem('playlistStudioProject', JSON.stringify(projectData));
    } catch (error) {
      console.warn('Failed to save project data:', error);
    }
  }, [state]);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
    audioService.clearCache();
  }, []);

  // Audio processing actions
  const downloadSong = useCallback(async (songId: string) => {
    const song = state.playlist.find(s => s.id === songId);
    if (!song) {
      throw new Error('Song not found');
    }

    try {
      updateProcessingState({
        isProcessing: true,
        progress: 0,
        currentOperation: `Downloading ${song.title}`,
      });

      await audioService.downloadAndProcessSong(song, (progress) => {
        updateProcessingState({
          progress,
          currentOperation: `Downloading ${song.title}`,
        });
      });

      updateProcessingState({
        isProcessing: false,
        progress: 100,
        currentOperation: 'Download complete',
      });
    } catch (error) {
      updateProcessingState({
        isProcessing: false,
        progress: 0,
        currentOperation: undefined,
        error: error instanceof Error ? error.message : 'Download failed',
      });
      throw error;
    }
  }, [state.playlist, updateProcessingState]);

  const analyzeSong = useCallback(async (songId: string) => {
    const song = state.playlist.find(s => s.id === songId);
    if (!song) {
      throw new Error('Song not found');
    }

    try {
      updateProcessingState({
        isProcessing: true,
        progress: 0,
        currentOperation: `Analyzing ${song.title}`,
      });

      const analysis = await audioService.analyzeSong(song);

      updateProcessingState({
        isProcessing: false,
        progress: 100,
        currentOperation: 'Analysis complete',
      });

      return analysis;
    } catch (error) {
      updateProcessingState({
        isProcessing: false,
        progress: 0,
        currentOperation: undefined,
        error: error instanceof Error ? error.message : 'Analysis failed',
      });
      throw error;
    }
  }, [state.playlist, updateProcessingState]);

  const stitchPlaylist = useCallback(async (crossfadeDuration: number = 2) => {
    if (state.playlist.length === 0) {
      throw new Error('No songs in playlist to stitch');
    }

    try {
      updateProcessingState({
        isProcessing: true,
        progress: 0,
        currentOperation: 'Preparing to stitch playlist',
      });

      const stitchedBuffer = await audioService.stitchPlaylistSongs(
        state.playlist,
        crossfadeDuration,
        (processingState) => {
          updateProcessingState(processingState);
        }
      );

      // Create blob URL for the stitched audio
      const audioUrl = await audioService.createBlobUrl(stitchedBuffer);
      setStitchedAudioUrl(audioUrl);

      updateProcessingState({
        isProcessing: false,
        progress: 100,
        currentOperation: 'Stitching complete',
      });
    } catch (error) {
      updateProcessingState({
        isProcessing: false,
        progress: 0,
        currentOperation: undefined,
        error: error instanceof Error ? error.message : 'Stitching failed',
      });
      throw error;
    }
  }, [state.playlist, updateProcessingState, setStitchedAudioUrl]);

  const downloadStitchedAudio = useCallback(async () => {
    if (!state.stitchedAudioUrl) {
      throw new Error('No stitched audio available for download');
    }

    try {
      // For now, we'll create a simple download link
      // In a real implementation, you'd want to get the buffer from the service
      const link = document.createElement('a');
      link.href = state.stitchedAudioUrl;
      link.download = 'stitched_playlist.wav';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      throw new Error(`Download failed: ${error}`);
    }
  }, [state.stitchedAudioUrl]);

  const clearAudioCache = useCallback(() => {
    audioService.clearCache();
    setStitchedAudioUrl(undefined);
  }, [setStitchedAudioUrl]);

  const value: PlaylistContextType = {
    // State
    playlist: state.playlist,
    feedback: state.feedback,
    assets: state.assets,
    currentStep: state.currentStep,
    stepCompletion: state.stepCompletion,
    stepData: state.stepData,
    currentVideoUrl: state.currentVideoUrl,
    stitchedAudioUrl: state.stitchedAudioUrl,
    isGenerating: state.isGenerating,
    isEditMode: state.isEditMode,
    processingState: state.processingState,

    // Actions
    addSong,
    removeSong,
    updateSong,
    reorderSongs,
    addFeedback,
    removeFeedback,
    addAsset,
    removeAsset,
    setCurrentStep,
    markStepCompleted,
    setEditMode,
    setCurrentVideoUrl,
    setStitchedAudioUrl,
    setIsGenerating,
    updateProcessingState,
    saveCanvasData,
    loadProjectData,
    saveProjectData,
    clearAll,

    // Audio processing actions
    downloadSong,
    analyzeSong,
    stitchPlaylist,
    downloadStitchedAudio,
    clearAudioCache,
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = (): PlaylistContextType => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
};