import React from 'react';
import { useCanvas } from '@/context/CanvasContext';
import { useNotifications } from '@/context/NotificationContext';
import { AssetLibrary } from './AssetLibrary';
import { Square, Circle, Type, Shapes, Folder } from 'lucide-react';

export const ElementsPanel: React.FC = () => {
  const { canvasEditorRef } = useCanvas();
  const { showNotification } = useNotifications();

  const handleAddShape = (type: 'rectangle' | 'circle' | 'text') => {
    if (!canvasEditorRef.current) return;

    try {
      if (type === 'rectangle' && canvasEditorRef.current.addRectangle) {
        canvasEditorRef.current.addRectangle();
      } else if (type === 'circle' && canvasEditorRef.current.addCircle) {
        canvasEditorRef.current.addCircle();
      } else if (type === 'text' && canvasEditorRef.current.addText) {
        canvasEditorRef.current.addText();
      }
    } catch (error) {
      console.error('Failed to add shape:', error);
      showNotification('Failed to add element', 'error');
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <Shapes size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Elements</h2>
        </div>

        <div className="space-y-6">
          {/* Shapes */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Shapes</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAddShape('rectangle')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                title="Add Rectangle"
              >
                <Square size={24} className="text-gray-600 group-hover:text-blue-600 mb-2" />
                <span className="text-xs text-gray-600 group-hover:text-blue-600">Rectangle</span>
              </button>

              <button
                onClick={() => handleAddShape('circle')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                title="Add Circle"
              >
                <Circle size={24} className="text-gray-600 group-hover:text-blue-600 mb-2" />
                <span className="text-xs text-gray-600 group-hover:text-blue-600">Circle</span>
              </button>
            </div>
          </div>

          {/* Text */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Text</h3>
            <button
              onClick={() => handleAddShape('text')}
              className="w-full flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              title="Add Text"
            >
              <Type size={24} className="text-gray-600 group-hover:text-blue-600 mb-2" />
              <span className="text-xs text-gray-600 group-hover:text-blue-600">Add Text</span>
            </button>
          </div>

          {/* Assets */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Folder size={16} className="text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assets</h3>
            </div>
            <AssetLibrary
              onAssetSelect={async (asset) => {
                if (asset.type === 'image' && canvasEditorRef.current?.addImage) {
                  try {
                    await canvasEditorRef.current.addImage(asset.url);
                    showNotification(`Added ${asset.name} to canvas`, 'success');
                  } catch (error) {
                    showNotification('Failed to add image to canvas', 'error');
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

