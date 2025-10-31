import React, { createContext, useContext, useRef, ReactNode } from 'react';
import type { CanvasEditorRef } from '@/components/steps/DesignStep';

interface CanvasContextType {
  canvasEditorRef: React.RefObject<CanvasEditorRef | null>;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const CanvasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const canvasEditorRef = useRef<CanvasEditorRef | null>(null);

  return (
    <CanvasContext.Provider value={{ canvasEditorRef }}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = (): CanvasContextType => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};

