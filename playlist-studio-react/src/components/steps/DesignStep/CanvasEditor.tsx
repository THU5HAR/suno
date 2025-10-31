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
  addImage: (url: string | File, options?: { left?: number; top?: number; width?: number; height?: number }) => Promise<void>;
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
  
  // Keep refs in sync (but don't reload canvas when stepData changes - that causes flicker)
  // We only load canvas data on initial mount, not on every save
  useEffect(() => {
    stepDataRef.current = stepData;
    // Intentionally NOT reloading canvas here - saves happen without needing to reload
  }, [stepData]);

  useEffect(() => {
    saveCanvasDataRef.current = saveCanvasData;
  }, [saveCanvasData]);

  const loadCanvasData = useCallback((data: CanvasData, skipClear: boolean = false) => {
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
      
      // Only clear if we're not skipping (prevents flicker during updates)
      if (!skipClear) {
        canvas.clear();
      }
      
      // Only update background if it's different to prevent unnecessary renders
      const currentBg = (canvas.backgroundColor as string) || '#ffffff';
      const newBg = data.backgroundColor || '#ffffff';
      if (currentBg !== newBg) {
        canvas.setBackgroundColor(newBg, () => {
          canvas.renderAll();
        });
      }

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
          // Handle image loading separately - will be loaded in loadCanvasData
          if (objData.src) {
            // Image will be loaded async
            fabric.Image.fromURL(objData.src, (img: any) => {
              if (img) {
                img.set({
                  left: objData.left || 0,
                  top: objData.top || 0,
                  scaleX: objData.scaleX || 1,
                  scaleY: objData.scaleY || 1,
                });
                if (objData.width) img.scaleToWidth(objData.width);
                if (objData.height) img.scaleToHeight(objData.height);
                canvas.add(img);
                // Don't call renderAll() - Fabric.js auto-renders on add
              }
            }, { crossOrigin: 'anonymous' });
          }
          break;
      }

      if (fabricObject) {
        if (objData.scaleX) fabricObject.scaleX = objData.scaleX;
        if (objData.scaleY) fabricObject.scaleY = objData.scaleY;
        canvas.add(fabricObject);
        // Don't call renderAll() here - Fabric.js auto-renders on add
      }
    });

    // Single render at the end instead of multiple
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
    const objects = canvas.getObjects().map((obj: FabricObject) => {
      const baseObj: any = {
        type: obj.type || 'unknown',
        left: obj.left || 0,
        top: obj.top || 0,
        width: obj.width,
        height: obj.height,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        opacity: obj.opacity,
        stroke: (obj as any).stroke,
        strokeWidth: (obj as any).strokeWidth,
        rx: (obj as any).rx,
        ry: (obj as any).ry,
      };

      // Handle text objects
      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        baseObj.text = (obj as any).text;
        baseObj.fontSize = (obj as any).fontSize;
        baseObj.fontFamily = (obj as any).fontFamily;
        baseObj.fill = (obj as any).fill;
      } else if (obj.type === 'image') {
        // For images, try multiple methods to get the source
        // Fabric.js images can have the source in different places depending on version
        const fabricImage = obj as any;
        let imageSrc: string | undefined;
        
        // Try getElement() method (Fabric.js v5+)
        if (fabricImage.getElement) {
          const imgElement = fabricImage.getElement();
          if (imgElement && imgElement.src) {
            imageSrc = imgElement.src;
          }
        }
        
        // Try getSrc() method (older Fabric.js versions)
        if (!imageSrc && fabricImage.getSrc) {
          imageSrc = fabricImage.getSrc();
        }
        
        // Try direct src property
        if (!imageSrc && fabricImage.src) {
          imageSrc = fabricImage.src;
        }
        
        // Try _element.src (internal property)
        if (!imageSrc && fabricImage._element && fabricImage._element.src) {
          imageSrc = fabricImage._element.src;
        }
        
        // Convert to data URL if it's a blob URL and we need persistence
        if (imageSrc && imageSrc.startsWith('blob:')) {
          // For blob URLs, we might need to convert to data URL for persistence
          // But for now, keep the blob URL - it should work as long as the blob exists
          baseObj.src = imageSrc;
        } else if (imageSrc) {
          baseObj.src = imageSrc;
        }
      } else {
        // For shapes
        baseObj.fill = (obj as any).fill;
      }

      return baseObj;
    });

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

      // Load existing canvas data if available (only on initial load)
      const currentStepData = stepDataRef.current[currentStep];
      if (currentStepData?.canvasData && loadCanvasDataRef.current) {
        // Don't skip clear on initial load - we want a fresh canvas
        loadCanvasDataRef.current(currentStepData.canvasData, false);
      }

      // Track if user is currently dragging/modifying to prevent saves during interaction
      let isDragging = false;
      let isModifying = false;
      
      // Debounced save to prevent too many updates - only save on final actions
      const debouncedSave = () => {
        // Don't save if user is actively dragging or modifying
        if (isDragging || isModifying) {
          return;
        }
        
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => {
          // Double-check we're not in the middle of an interaction
          if (!isDragging && !isModifying && isMounted && fabricCanvasRef.current && exportCanvasDataRef.current) {
            try {
              const canvasData = exportCanvasDataRef.current();
              saveCanvasDataRef.current(canvasData);
            } catch (error) {
              console.error('Error saving canvas data:', error);
            }
          }
        }, 1500); // Increased debounce to prevent flicker
      };

      // Track dragging state
      canvas.on('mouse:down', () => {
        isDragging = true;
      });
      
      canvas.on('object:moving', () => {
        isDragging = true;
      });
      
      canvas.on('object:scaling', () => {
        isModifying = true;
      });
      
      canvas.on('object:rotating', () => {
        isModifying = true;
      });

      // Save on mouse up - this is the key moment to save
      const handleMouseUp = () => {
        isDragging = false;
        isModifying = false;
        // Small delay to ensure all transformations are complete
        setTimeout(() => {
          debouncedSave();
        }, 100);
      };
      canvas.on('mouse:up', handleMouseUp);
      
      // Also save when object modification ends
      canvas.on('object:modified', () => {
        isDragging = false;
        isModifying = false;
        // Small delay to ensure modifications are complete
        setTimeout(() => {
          debouncedSave();
        }, 100);
      });
      
      // Save on object add/remove (these don't cause dragging)
      canvas.on('object:added', debouncedSave);
      canvas.on('object:removed', debouncedSave);
      
      // Store the handlers for cleanup
      (canvas as any)._handleMouseUp = handleMouseUp;
      (canvas as any)._isDragging = isDragging;
      (canvas as any)._isModifying = isModifying;
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
          canvas.off('mouse:down');
          canvas.off('mouse:up');
          canvas.off('object:moving');
          canvas.off('object:scaling');
          canvas.off('object:rotating');
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
      // renderAll() not needed - Fabric.js auto-renders
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
      // renderAll() not needed - Fabric.js auto-renders
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
      // renderAll() not needed - Fabric.js auto-renders
    });
  }, []);

  const addImage = useCallback(async (urlOrFile: string | File, options?: { left?: number; top?: number; width?: number; height?: number }) => {
    if (!fabricCanvasRef.current) return;

    try {
      let imageUrl: string;
      
      if (urlOrFile instanceof File) {
        imageUrl = URL.createObjectURL(urlOrFile);
      } else {
        imageUrl = urlOrFile;
      }

      initFabric().then((fabricLib) => {
        if (!fabricLib || !fabricCanvasRef.current) return;
        
        const Image = fabricLib.Image;
        if (!Image) {
          console.error('Image class not found in Fabric.js');
          return;
        }

        Image.fromURL(imageUrl, (img: any) => {
          if (!img || !fabricCanvasRef.current) return;

          const canvas = fabricCanvasRef.current;
          const canvasWidth = canvas.width || 1280;
          const canvasHeight = canvas.height || 720;

          // Set position
          const left = options?.left ?? canvasWidth / 2;
          const top = options?.top ?? canvasHeight / 2;

          img.set({
            left: left - (options?.width ? options.width / 2 : img.width! / 2),
            top: top - (options?.height ? options.height / 2 : img.height! / 2),
          });

          // Scale if dimensions provided
          if (options?.width) {
            img.scaleToWidth(options.width);
          } else if (options?.height) {
            img.scaleToHeight(options.height);
          }

          canvas.add(img);
          // renderAll() not needed - Fabric.js auto-renders

          // Cleanup object URL if it was created from a file
          if (urlOrFile instanceof File) {
            // Don't revoke immediately, keep for canvas rendering
            // URL will be cleaned up when component unmounts or new image is added
          }
        }, { crossOrigin: 'anonymous' });
      });
    } catch (error) {
      console.error('Failed to add image to canvas:', error);
    }
  }, []);

  // Expose methods for parent components via ref
  useImperativeHandle(ref, () => ({
    addRectangle,
    addCircle,
    addText,
    addImage,
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