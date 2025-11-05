import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/context/NotificationContext';

export interface VideoEditorRef {
  addText: () => void;
  addImage: (imageUrl: string) => void;
  clearCanvas: () => void;
}

interface VideoEditorProps {
  onThumbnailChange?: (thumbnailUrl: string) => void;
}

export const VideoEditor = forwardRef<VideoEditorRef, VideoEditorProps>(({ onThumbnailChange }, ref) => {
  const { playlist } = usePlaylist();
  const { showNotification } = useNotifications();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const textColor = '#FFFFFF'; // Default text color
  const fontSize = 48; // Default font size
  const [showTitle, setShowTitle] = useState(true);
  const [title, setTitle] = useState('My Playlist');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [elements, setElements] = useState<Array<{ id: string; type: string; x: number; y: number; width?: number; height?: number; color?: string; text?: string; imageUrl?: string; fontSize?: number }>>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const canvasScaleRef = useRef({ x: 1, y: 1 });
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderRequestRef = useRef<number | null>(null);

  // Generate unique ID
  const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    addText: () => {
      const text = prompt('Enter text:');
      if (!text) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const newElement = {
        id: generateId(),
        type: 'text',
        x: canvas.width / 2,
        y: canvas.height / 2,
        text: text,
        color: textColor,
        fontSize: fontSize,
        width: text.length * fontSize * 0.6, // Approximate text width
        height: fontSize,
      };
      setElements([...elements, newElement]);
      setSelectedElementId(newElement.id);
      showNotification('Text added', 'success');
    },
    addImage: (imageUrl: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const newElement = {
        id: generateId(),
        type: 'image',
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 200,
        height: 200,
        imageUrl: imageUrl,
      };
      setElements([...elements, newElement]);
      setSelectedElementId(newElement.id);
      showNotification('Image added', 'success');
    },
    clearCanvas: () => {
      if (confirm('Are you sure you want to clear all elements?')) {
        setElements([]);
        setSelectedElementId(null);
        showNotification('Canvas cleared', 'success');
      }
    },
  }), [elements, textColor]);

  // Get canvas coordinates from mouse event
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    canvasScaleRef.current = { x: scaleX, y: scaleY };

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Check if point is inside element bounds
  const isPointInElement = (x: number, y: number, element: typeof elements[0]): boolean => {
    if (!element.width || !element.height) {
      // For elements without width/height (like text), check proximity
      const distance = Math.sqrt(Math.pow(x - element.x, 2) + Math.pow(y - element.y, 2));
      return distance < 50;
    }

    const halfWidth = element.width / 2;
    const halfHeight = element.height / 2;

    if (element.type === 'circle') {
      const distance = Math.sqrt(Math.pow(x - element.x, 2) + Math.pow(y - element.y, 2));
      return distance <= halfWidth;
    }

    // Rectangle, image, text
    return (
      x >= element.x - halfWidth &&
      x <= element.x + halfWidth &&
      y >= element.y - halfHeight &&
      y <= element.y + halfHeight
    );
  };

  // Check if point is on resize handle
  const getResizeHandle = (x: number, y: number, element: typeof elements[0]): string | null => {
    if (!element.width || !element.height) return null;

    const halfWidth = element.width / 2;
    const halfHeight = element.height / 2;
    const handleSize = 10;

    const handles = [
      { name: 'nw', x: element.x - halfWidth, y: element.y - halfHeight },
      { name: 'ne', x: element.x + halfWidth, y: element.y - halfHeight },
      { name: 'sw', x: element.x - halfWidth, y: element.y + halfHeight },
      { name: 'se', x: element.x + halfWidth, y: element.y + halfHeight },
    ];

    for (const handle of handles) {
      if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
        return handle.name;
      }
    }

    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    const clickedElement = elements.find(el => isPointInElement(coords.x, coords.y, el));

    if (clickedElement) {
      setSelectedElementId(clickedElement.id);
      const handle = getResizeHandle(coords.x, coords.y, clickedElement);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
      } else {
        setIsDragging(true);
      }
      setDragStart(coords);
    } else {
      setSelectedElementId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e);
    const selectedElement = elements.find(el => el.id === selectedElementId);

    if (isResizing && selectedElement && resizeHandle) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;

      setElements(elements.map(el => {
        if (el.id === selectedElementId) {
          let newWidth = (el.width || 0);
          let newHeight = (el.height || 0);
          let newX = el.x;
          let newY = el.y;

          if (resizeHandle.includes('e')) {
            newWidth = Math.max(20, (el.width || 0) + deltaX);
          }
          if (resizeHandle.includes('w')) {
            newWidth = Math.max(20, (el.width || 0) - deltaX);
            newX = el.x + deltaX / 2;
          }
          if (resizeHandle.includes('s')) {
            newHeight = Math.max(20, (el.height || 0) + deltaY);
          }
          if (resizeHandle.includes('n')) {
            newHeight = Math.max(20, (el.height || 0) - deltaY);
            newY = el.y + deltaY / 2;
          }

          return { ...el, width: newWidth, height: newHeight, x: newX, y: newY };
        }
        return el;
      }));

      setDragStart(coords);
      requestRender();
    } else if (isDragging && selectedElement) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;

      setElements(elements.map(el => {
        if (el.id === selectedElementId) {
          return { ...el, x: el.x + deltaX, y: el.y + deltaY };
        }
        return el;
      }));

      setDragStart(coords);
      requestRender();
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  // Request animation frame for smooth rendering during drag/resize
  const requestRender = () => {
    if (renderRequestRef.current) {
      cancelAnimationFrame(renderRequestRef.current);
    }
    renderRequestRef.current = requestAnimationFrame(() => {
      renderThumbnail();
    });
  };

  useEffect(() => {
    requestRender();
  }, [backgroundColor, textColor, fontSize, showTitle, title, playlist, elements, selectedElementId]);

  // Re-render during drag/resize
  useEffect(() => {
    if (isDragging || isResizing) {
      requestRender();
    }
  }, [isDragging, isResizing]);

  const renderThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (16:9 aspect ratio)
    canvas.width = 1920;
    canvas.height = 1080;

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title if enabled
    if (showTitle && title) {
      ctx.fillStyle = textColor;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, canvas.width / 2, canvas.height / 3);
    }

    // Draw custom elements
    elements.forEach((element) => {
      ctx.save();
      const isSelected = element.id === selectedElementId;
      const halfWidth = (element.width || 0) / 2;
      const halfHeight = (element.height || 0) / 2;

      if (element.type === 'text') {
        ctx.fillStyle = element.color || textColor;
        const elementFontSize = element.fontSize || fontSize;
        ctx.font = `${elementFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element.text || '', element.x, element.y);
      } else if (element.type === 'image' && element.imageUrl) {
        const cachedImg = loadedImagesRef.current.get(element.id);
        if (cachedImg && cachedImg.complete) {
          ctx.drawImage(cachedImg, element.x - halfWidth, element.y - halfHeight, element.width || 200, element.height || 200);
        } else {
          // Load image if not cached
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            loadedImagesRef.current.set(element.id, img);
            requestRender();
          };
          img.onerror = () => {
            showNotification('Failed to load image', 'error');
          };
          img.src = element.imageUrl;
        }
      }

      // Draw selection border and resize handles
      if (isSelected && element.width && element.height) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(element.x - halfWidth, element.y - halfHeight, element.width, element.height);
        ctx.setLineDash([]);

        // Draw resize handles
        ctx.fillStyle = '#3b82f6';
        const handleSize = 8;
        const handles = [
          { x: element.x - halfWidth, y: element.y - halfHeight }, // nw
          { x: element.x + halfWidth, y: element.y - halfHeight }, // ne
          { x: element.x - halfWidth, y: element.y + halfHeight }, // sw
          { x: element.x + halfWidth, y: element.y + halfHeight }, // se
        ];

        handles.forEach(handle => {
          ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        });
      }

      ctx.restore();
    });

    // Draw playlist items (only if no custom elements or if we want to show them)
    if (playlist.length > 0 && elements.length === 0) {
      const maxItems = 8;
      const itemsToShow = playlist.slice(0, maxItems);
      const startY = showTitle ? canvas.height / 2 : canvas.height / 3;
      const itemHeight = 60;
      const spacing = 20;

      ctx.font = '36px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      itemsToShow.forEach((song, index) => {
        const y = startY + (index * (itemHeight + spacing));
        ctx.fillStyle = textColor;
        ctx.fillText(
          `${index + 1}. ${song.title}${song.artist ? ` - ${song.artist}` : ''}`,
          canvas.width * 0.1,
          y,
          canvas.width * 0.8
        );
      });

      if (playlist.length > maxItems) {
        ctx.fillStyle = textColor;
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `+ ${playlist.length - maxItems} more songs...`,
          canvas.width / 2,
          startY + (maxItems * (itemHeight + spacing))
        );
      }
    }

    // Generate thumbnail URL
    const dataUrl = canvas.toDataURL('image/png');
    setThumbnailUrl(dataUrl);
    onThumbnailChange?.(dataUrl);
  };

  const downloadThumbnail = () => {
    if (!thumbnailUrl) return;

    const link = document.createElement('a');
    link.download = 'playlist-thumbnail.png';
    link.href = thumbnailUrl;
    link.click();
    showNotification('Thumbnail downloaded!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Preview Canvas */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Video Thumbnail Preview</h3>
          <Button variant="secondary" onClick={downloadThumbnail} disabled={!thumbnailUrl}>
            📥 Download Thumbnail
          </Button>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 flex justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto border border-gray-300 rounded cursor-crosshair"
            style={{ maxHeight: '400px' }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>
        {selectedElementId && (
          <div className="mt-2 text-sm text-gray-600">
            💡 Selected element - Click and drag to move, drag corners to resize
          </div>
        )}
      </div>

      {/* Design Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Background Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Background</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Title Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Title</h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={showTitle}
                  onChange={(e) => setShowTitle(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Show Title</span>
              </label>
              {showTitle && (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Playlist Title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Text Properties */}
      {selectedElementId && (() => {
        const selectedElement = elements.find(el => el.id === selectedElementId);
        if (selectedElement?.type === 'text') {
          return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Text Properties</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Content
                  </label>
                  <input
                    type="text"
                    value={selectedElement.text || ''}
                    onChange={(e) => {
                      setElements(elements.map(el => 
                        el.id === selectedElementId 
                          ? { ...el, text: e.target.value, width: e.target.value.length * (selectedElement.fontSize || fontSize) * 0.6 }
                          : el
                      ));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={selectedElement.color || textColor}
                      onChange={(e) => {
                        setElements(elements.map(el => 
                          el.id === selectedElementId 
                            ? { ...el, color: e.target.value }
                            : el
                        ));
                      }}
                      className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedElement.color || textColor}
                      onChange={(e) => {
                        setElements(elements.map(el => 
                          el.id === selectedElementId 
                            ? { ...el, color: e.target.value }
                            : el
                        ));
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size: {selectedElement.fontSize || fontSize}px
                  </label>
                  <input
                    type="range"
                    min="24"
                    max="120"
                    value={selectedElement.fontSize || fontSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setElements(elements.map(el => 
                        el.id === selectedElementId 
                          ? { ...el, fontSize: newSize, width: (el.text || '').length * newSize * 0.6, height: newSize }
                          : el
                      ));
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> This thumbnail will be used as the video cover. You can customize colors, 
          title, and text to match your brand. The playlist will appear as a list below the title.
        </p>
      </div>
    </div>
  );
});

VideoEditor.displayName = 'VideoEditor';

