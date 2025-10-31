import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { CanvasData } from '@/types';

// Fabric.js import - using dynamic import to handle module loading
let fabric: any = null;
const initFabric = async () => {
  if (fabric) return fabric;
  const fabricModule = await import('fabric');
  // Handle different export patterns
  fabric = (fabricModule as any).fabric || fabricModule.default || fabricModule;
  return fabric;
};

// Fabric.js types
type FabricCanvas = any;
type FabricObject = any;

interface CanvasEditorProps {
  width?: number;
  height?: number;
  className?: string;
}

export interface CanvasEditorRef {
  addRectangle: () => void;
  addCircle: () => void;
  addText: () => void;
  clearCanvas: () => void;
  loadCanvasData: (data: CanvasData) => void;
  exportCanvasData: () => CanvasData;
  getCanvas: () => FabricCanvas | null;
}

export const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(({
  width = 800,
  height = 600,
  className = '',
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const { saveCanvasData, stepData, currentStep } = usePlaylist();
  const [isInitialized, setIsInitialized] = useState(false);
  const initStepRef = useRef<number>(currentStep);
  const stepDataRef = useRef(stepData);
  const saveCanvasDataRef = useRef(saveCanvasData);
  const loadCanvasDataRef = useRef<((data: CanvasData) => void) | null>(null);
  const exportCanvasDataRef = useRef<(() => CanvasData) | null>(null);
  
  // Keep refs in sync
  useEffect(() => {
    stepDataRef.current = stepData;
  }, [stepData]);

  useEffect(() => {
    saveCanvasDataRef.current = saveCanvasData;
  }, [saveCanvasData]);

  const loadCanvasData = useCallback((data: CanvasData) => {
    if (!fabricCanvasRef.current) return;

    initFabric().then((fabricLib) => {
      if (!fabricLib) return;
      
      const Rect = fabricLib.Rect;
      const Circle = fabricLib.Circle;
      const Textbox = fabricLib.Textbox || fabricLib.IText;

      if (!Rect || !Circle || !Textbox) {
        console.error('Fabric shapes not found. Available:', Object.keys(fabricLib));
        return;
      }
      
      const canvas = fabricCanvasRef.current!;
      
    canvas.clear();
      canvas.setBackgroundColor(data.backgroundColor || '#ffffff', () => {
        canvas.renderAll();
      });

    // Load objects
    data.objects.forEach(objData => {
        let fabricObject: any = null;

      switch (objData.type) {
        case 'rect':
          fabricObject = new Rect({
            left: objData.left,
            top: objData.top,
            width: objData.width || 100,
            height: objData.height || 100,
            fill: objData.fill || '#ff0000',
          });
          break;
        case 'circle':
          fabricObject = new Circle({
            left: objData.left,
            top: objData.top,
            radius: (objData.width || 50) / 2,
            fill: objData.fill || '#00ff00',
          });
          break;
        case 'text':
            fabricObject = new Textbox(objData.text || 'Text', {
            left: objData.left,
            top: objData.top,
              width: objData.width || 200,
            fontSize: objData.fontSize || 20,
            fontFamily: objData.fontFamily || 'Arial',
            fill: objData.fill || '#000000',
          });
          break;
        case 'image':
          // Handle image loading separately
          break;
      }

      if (fabricObject) {
        if (objData.scaleX) fabricObject.scaleX = objData.scaleX;
        if (objData.scaleY) fabricObject.scaleY = objData.scaleY;
        canvas.add(fabricObject);
      }
    });

    canvas.renderAll();
    });
  }, []);

  // Set refs when callbacks are created
  useEffect(() => {
    loadCanvasDataRef.current = loadCanvasData;
  }, [loadCanvasData]);

  const exportCanvasData = useCallback((): CanvasData => {
    if (!fabricCanvasRef.current) {
      return {
        backgroundColor: '#ffffff',
        objects: [],
      };
    }

    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects().map((obj: FabricObject) => ({
      type: obj.type || 'unknown',
      left: obj.left || 0,
      top: obj.top || 0,
      width: obj.width,
      height: obj.height,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      fill: (obj as any).fill,
      text: (obj as any).text,
      fontSize: (obj as any).fontSize,
      fontFamily: (obj as any).fontFamily,
      angle: obj.angle,
      opacity: obj.opacity,
      stroke: (obj as any).stroke,
      strokeWidth: (obj as any).strokeWidth,
      rx: (obj as any).rx,
      ry: (obj as any).ry,
    }));

    return {
      backgroundColor: (canvas.backgroundColor as string) || '#ffffff',
      objects,
    };
  }, []);

  // Set refs when callbacks are created
  useEffect(() => {
    exportCanvasDataRef.current = exportCanvasData;
  }, [exportCanvasData]);

  // Separate effect to handle step changes
  useEffect(() => {
    if (initStepRef.current !== currentStep) {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      setIsInitialized(false);
      initStepRef.current = currentStep;
    }
  }, [currentStep]);

  // Main initialization effect - only runs when canvas ref or dimensions change
  useEffect(() => {
    if (!canvasRef.current || isInitialized || initStepRef.current !== currentStep) return;

    let isMounted = true;
    let saveTimeout: NodeJS.Timeout | null = null;

    // Initialize Fabric.js
    initFabric().then((fabricLib) => {
      if (!isMounted || !fabricLib || !canvasRef.current) {
        return;
      }

      // Fabric.js v5 exports Canvas class
      const FabricCanvas = fabricLib.Canvas || (fabricLib as any).FabricCanvas;

      if (!FabricCanvas) {
        console.error('FabricCanvas not found. Available keys:', Object.keys(fabricLib));
        return;
      }

      // Initialize Fabric.js canvas
      const canvas = new FabricCanvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
      });

      if (!isMounted) {
        canvas.dispose();
        return;
      }

      fabricCanvasRef.current = canvas;
      setIsInitialized(true);

      // Load existing canvas data if available
      const currentStepData = stepDataRef.current[currentStep];
      if (currentStepData?.canvasData && loadCanvasDataRef.current) {
        loadCanvasDataRef.current(currentStepData.canvasData);
      }

      // Debounced save to prevent too many updates - only save on final actions
      const debouncedSave = () => {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => {
          if (isMounted && fabricCanvasRef.current && exportCanvasDataRef.current) {
            try {
              const canvasData = exportCanvasDataRef.current();
              saveCanvasDataRef.current(canvasData);
            } catch (error) {
              console.error('Error saving canvas data:', error);
            }
          }
        }, 1000); // Increased debounce to prevent flicker
      };

      // Only listen to final events, not intermediate dragging
      canvas.on('object:added', debouncedSave);
      canvas.on('object:removed', debouncedSave);
      canvas.on('object:modified', debouncedSave);
      
      // Save on mouse up to capture final position after moving/scaling (this is the key)
      const handleMouseUp = () => {
        debouncedSave();
      };
      canvas.on('mouse:up', handleMouseUp);
      
      // Store the handler for cleanup
      (canvas as any)._handleMouseUp = handleMouseUp;
    }).catch((error) => {
      console.error('Failed to load Fabric.js:', error);
    });

    return () => {
      isMounted = false;
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      if (fabricCanvasRef.current) {
        // Remove event listeners
        try {
          const canvas = fabricCanvasRef.current;
          canvas.off('object:added');
          canvas.off('object:removed');
          canvas.off('object:modified');
          if ((canvas as any)._handleMouseUp) {
            canvas.off('mouse:up', (canvas as any)._handleMouseUp);
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
        try {
          fabricCanvasRef.current.dispose();
        } catch (e) {
          // Ignore disposal errors
        }
        fabricCanvasRef.current = null;
      }
      setIsInitialized(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, isInitialized, currentStep]);

  const clearCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.setBackgroundColor('#ffffff', () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.renderAll();
      }
    });
  }, []);

  const addRectangle = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    initFabric().then((fabricLib) => {
      if (!fabricLib) return;
      const Rect = fabricLib.Rect;
      if (!Rect) {
        console.error('Rect not found');
        return;
      }
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: '#ff0000',
    });

      fabricCanvasRef.current!.add(rect);
      fabricCanvasRef.current!.renderAll();
    });
  }, []);

  const addCircle = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    initFabric().then((fabricLib) => {
      if (!fabricLib) return;
      const Circle = fabricLib.Circle;
      if (!Circle) {
        console.error('Circle not found');
        return;
      }
    const circle = new Circle({
      left: 200,
      top: 200,
      radius: 50,
      fill: '#00ff00',
    });

      fabricCanvasRef.current!.add(circle);
      fabricCanvasRef.current!.renderAll();
    });
  }, []);

  const addText = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    initFabric().then((fabricLib) => {
      if (!fabricLib) return;
      const Textbox = fabricLib.Textbox || fabricLib.IText;
      if (!Textbox) {
        console.error('Textbox not found. Available:', Object.keys(fabricLib).filter(k => k.toLowerCase().includes('text')));
        return;
      }
      const text = new Textbox('Hello World', {
      left: 300,
      top: 300,
        width: 200,
      fontSize: 20,
      fill: '#000000',
        fontFamily: 'Arial',
      });

      fabricCanvasRef.current!.add(text);
      fabricCanvasRef.current!.renderAll();
    });
  }, []);


  // Expose methods for parent components via ref
  useImperativeHandle(ref, () => ({
    addRectangle,
    addCircle,
    addText,
    clearCanvas,
    loadCanvasData,
    exportCanvasData,
    getCanvas: () => fabricCanvasRef.current,
  }));

  return (
    <div className={`canvas-editor ${className}`}>
      <div className="canvas-container border border-gray-300 rounded-lg overflow-hidden flex justify-center">
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
});

CanvasEditor.displayName = 'CanvasEditor';