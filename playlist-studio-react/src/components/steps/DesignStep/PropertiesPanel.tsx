import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useCanvas } from '@/context/CanvasContext';
import { Button } from '@/components/ui/Button';
import { X, Type, Move, RotateCw, Palette, Sliders } from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
  const { canvasEditorRef } = useCanvas();
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const canvas = canvasEditorRef.current?.getCanvas();
    if (!canvas) return;

    const updateSelection = () => {
      // Debounce updates to prevent excessive re-renders
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          // Extract relevant properties to create a plain object for React state
          setSelectedObject({
            left: activeObject.left,
            top: activeObject.top,
            width: activeObject.width,
            height: activeObject.height,
            scaleX: activeObject.scaleX,
            scaleY: activeObject.scaleY,
            angle: activeObject.angle,
            opacity: activeObject.opacity,
            fill: activeObject.fill,
            type: activeObject.type,
            text: (activeObject as any).text,
            fontSize: (activeObject as any).fontSize,
            fontFamily: (activeObject as any).fontFamily,
          });
        } else {
          setSelectedObject(null);
        }
      }, 50); // Small debounce to batch rapid updates
    };

    // Use 'object:selected' instead of 'selection:created' for better performance
    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      setSelectedObject(null);
    });
    canvas.on('object:modified', updateSelection);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      canvas.off('selection:created', updateSelection);
      canvas.off('selection:updated', updateSelection);
      canvas.off('selection:cleared', () => setSelectedObject(null));
      canvas.off('object:modified', updateSelection);
    };
  }, [canvasEditorRef]);

  if (!selectedObject) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="text-center py-12 text-gray-400">
          <Sliders size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select an object to edit properties</p>
        </div>
      </div>
    );
  }

  const handlePropertyChange = useCallback((property: string, value: any) => {
    const canvas = canvasEditorRef.current?.getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Update property - Fabric.js will handle rendering efficiently
    activeObject.set(property, value);
    canvas.renderAll();
    
    // Update local state after a brief delay to reflect changes
    setTimeout(() => {
      const updated = canvas.getActiveObject();
      if (updated) {
        setSelectedObject({
          left: updated.left,
          top: updated.top,
          width: updated.width,
          height: updated.height,
          scaleX: updated.scaleX,
          scaleY: updated.scaleY,
          angle: updated.angle,
          opacity: updated.opacity,
          fill: updated.fill,
          type: updated.type,
          text: (updated as any).text,
          fontSize: (updated as any).fontSize,
          fontFamily: (updated as any).fontFamily,
        });
      }
    }, 10);
  }, [canvasEditorRef]);

  const handleDelete = useCallback(() => {
    const canvas = canvasEditorRef.current?.getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.remove(activeObject);
    canvas.renderAll();
    setSelectedObject(null);
  }, [canvasEditorRef]);

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
          <button
            onClick={() => {
              const canvas = canvasEditorRef.current?.getCanvas();
              canvas?.discardActiveObject();
              canvas?.renderAll();
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Position & Size */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Move size={16} className="text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">Position & Size</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">X</label>
              <input
                type="number"
                value={Math.round(selectedObject.left || 0)}
                onChange={(e) => handlePropertyChange('left', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Y</label>
              <input
                type="number"
                value={Math.round(selectedObject.top || 0)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handlePropertyChange('top', val);
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Width</label>
              <input
                type="number"
                value={Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}
                onChange={(e) => {
                  const newWidth = parseFloat(e.target.value) || 0;
                  const canvas = canvasEditorRef.current?.getCanvas();
                  const activeObject = canvas?.getActiveObject();
                  if (!canvas || !activeObject) return;
                  
                  activeObject.set('scaleX', newWidth / (selectedObject.width || 1));
                  canvas.renderAll();
                  
                  setTimeout(() => {
                    const updated = canvas.getActiveObject();
                    if (updated) {
                      setSelectedObject({
                        left: updated.left,
                        top: updated.top,
                        width: updated.width,
                        height: updated.height,
                        scaleX: updated.scaleX,
                        scaleY: updated.scaleY,
                        angle: updated.angle,
                        opacity: updated.opacity,
                        fill: updated.fill,
                        type: updated.type,
                        text: (updated as any).text,
                        fontSize: (updated as any).fontSize,
                        fontFamily: (updated as any).fontFamily,
                      });
                    }
                  }, 10);
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Height</label>
              <input
                type="number"
                value={Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}
                onChange={(e) => {
                  const newHeight = parseFloat(e.target.value) || 0;
                  const canvas = canvasEditorRef.current?.getCanvas();
                  const activeObject = canvas?.getActiveObject();
                  if (!canvas || !activeObject) return;
                  
                  activeObject.set('scaleY', newHeight / (selectedObject.height || 1));
                  canvas.renderAll();
                  
                  setTimeout(() => {
                    const updated = canvas.getActiveObject();
                    if (updated) {
                      setSelectedObject({
                        left: updated.left,
                        top: updated.top,
                        width: updated.width,
                        height: updated.height,
                        scaleX: updated.scaleX,
                        scaleY: updated.scaleY,
                        angle: updated.angle,
                        opacity: updated.opacity,
                        fill: updated.fill,
                        type: updated.type,
                        text: (updated as any).text,
                        fontSize: (updated as any).fontSize,
                        fontFamily: (updated as any).fontFamily,
                      });
                    }
                  }, 10);
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        {(selectedObject.type === 'rect' || selectedObject.type === 'circle' || selectedObject.type === 'textbox' || selectedObject.type === 'image') && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <RotateCw size={16} className="text-gray-500" />
              <h4 className="text-sm font-medium text-gray-700">Rotation</h4>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={Math.round(selectedObject.angle || 0)}
              onChange={(e) => handlePropertyChange('angle', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-xs text-gray-500 mt-1">
              {Math.round(selectedObject.angle || 0)}°
            </div>
          </div>
        )}

        {/* Fill Color (for shapes) */}
        {(selectedObject.type === 'rect' || selectedObject.type === 'circle') && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={16} className="text-gray-500" />
              <h4 className="text-sm font-medium text-gray-700">Fill</h4>
            </div>
            <input
              type="color"
              value={selectedObject.fill || '#000000'}
              onChange={(e) => handlePropertyChange('fill', e.target.value)}
              className="w-full h-10 rounded border border-gray-300 cursor-pointer"
            />
          </div>
        )}

        {/* Text Properties */}
        {(selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text') && (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Type size={16} className="text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">Text</h4>
              </div>
              <textarea
                value={selectedObject.text || ''}
                onChange={(e) => handlePropertyChange('text', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-600 mb-1">Font Size</label>
              <input
                type="number"
                min="8"
                max="200"
                value={selectedObject.fontSize || 20}
                onChange={(e) => handlePropertyChange('fontSize', parseFloat(e.target.value) || 20)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-600 mb-1">Text Color</label>
              <input
                type="color"
                value={selectedObject.fill || '#000000'}
                onChange={(e) => handlePropertyChange('fill', e.target.value)}
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-600 mb-1">Font Family</label>
              <select
                value={selectedObject.fontFamily || 'Arial'}
                onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Palatino">Palatino</option>
                <option value="Garamond">Garamond</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
                <option value="Trebuchet MS">Trebuchet MS</option>
              </select>
            </div>
          </>
        )}

        {/* Opacity */}
        <div className="mb-6">
          <label className="block text-xs text-gray-600 mb-2">Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedObject.opacity !== undefined ? selectedObject.opacity : 1}
            onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-xs text-gray-500 mt-1">
            {Math.round((selectedObject.opacity !== undefined ? selectedObject.opacity : 1) * 100)}%
          </div>
        </div>

        {/* Delete Button */}
        <Button
          onClick={handleDelete}
          variant="danger"
          className="w-full"
          size="sm"
        >
          Delete Object
        </Button>
      </div>
    </div>
  );
};

