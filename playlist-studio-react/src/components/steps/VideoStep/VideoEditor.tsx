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
  const { playlist, stitchedAudioUrl } = usePlaylist();
  const { showNotification } = useNotifications();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const textColor = '#FFFFFF'; // Default text color
  const fontSize = 48; // Default font size for custom elements
  const [showTitle, setShowTitle] = useState(true);
  const [title, setTitle] = useState('My Playlist');
  const [titleFontSize, setTitleFontSize] = useState(48);
  const [titlePosition, setTitlePosition] = useState({ x: 50, y: 33.33 }); // Percentage values
  const [titleFontFamily, setTitleFontFamily] = useState('Arial');
  const [showTitleBorder, setShowTitleBorder] = useState(false); // Show/hide border for title
  const [titleBorderColor, setTitleBorderColor] = useState('#FFFFFF'); // Border color for title
  const [titleBorderWidth, setTitleBorderWidth] = useState(2); // Border width for title
  const [titleBorderRadius, setTitleBorderRadius] = useState(0); // Border radius for title
  const [playlistPosition, setPlaylistPosition] = useState({ x: 50, y: 50 }); // X is always centered (50%), Y is percentage
  const [playlistFontSize, setPlaylistFontSize] = useState(36); // Font size for playlist text
  const [playlistTextColor, setPlaylistTextColor] = useState('#FFFFFF'); // Text color for playlist
  const [showPlaylistBorder, setShowPlaylistBorder] = useState(false); // Show/hide border
  const [playlistBorderColor, setPlaylistBorderColor] = useState('#FFFFFF'); // Border color
  const [playlistBorderWidth, setPlaylistBorderWidth] = useState(2); // Border width
  const [playlistBorderRadius, setPlaylistBorderRadius] = useState(0); // Border radius (rounded corners)
  const [isDraggingPlaylist, setIsDraggingPlaylist] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [elements, setElements] = useState<Array<{ id: string; type: string; x: number; y: number; width?: number; height?: number; color?: string; text?: string; imageUrl?: string; fontSize?: number }>>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<'title' | 'playlist' | 'element' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingTitle, setIsDraggingTitle] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const canvasScaleRef = useRef({ x: 1, y: 1 });
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderRequestRef = useRef<number | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);

  // Generate unique ID
  const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Calculate start times for each song (cumulative based on durations)
  const calculateSongStartTimes = () => {
    const parseDuration = (durationStr: string): number => {
      const parts = durationStr.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return 180; // default 3 minutes
    };

    // Get delay from stitch settings (default 0)
    const delayBetweenSongs = 0; // TODO: Get from context if stored

    let accumulatedTime = 0;
    return playlist.map((song, index) => {
      const startTime = accumulatedTime;
      const songDuration = song.duration ? parseDuration(song.duration) : 180;
      accumulatedTime += songDuration;
      
      // Add delay after each song except the last one
      if (index < playlist.length - 1 && delayBetweenSongs > 0) {
        accumulatedTime += delayBetweenSongs;
      }
      
      return {
        songId: song.id,
        startTime,
        endTime: accumulatedTime,
        formattedTime: formatTime(startTime),
      };
    });
  };

  // Get current playing song based on playback time
  const getCurrentSong = () => {
    const songStartTimes = calculateSongStartTimes();
    return songStartTimes.find(
      (song, index) => 
        currentPlaybackTime >= song.startTime && 
        (index === songStartTimes.length - 1 || currentPlaybackTime < songStartTimes[index + 1].startTime)
    );
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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

  // Check if point is on the playlist area
  const isPointOnPlaylist = (x: number, y: number): boolean => {
    if (playlist.length === 0) return false;
    
    const canvas = canvasRef.current;
    if (!canvas) return false;
    
    const songsPerColumn = 5;
    const adjustedItemHeight = playlistFontSize * 1.5;
    const adjustedSpacing = playlistFontSize * 0.5;
    const playlistHeight = songsPerColumn * (adjustedItemHeight + adjustedSpacing);
    const columnWidth = canvas.width * 0.35;
    const columnSpacing = canvas.width * 0.1;
    const playlistWidth = columnWidth * 2 + columnSpacing;
    
    // Calculate playlist position (centered by default, but movable)
    const playlistX = playlistPosition.x === 50 
      ? (canvas.width - playlistWidth) / 2
      : (canvas.width * playlistPosition.x) / 100 - (playlistWidth / 2);
    const playlistY = (canvas.height * playlistPosition.y) / 100;
    
    return (
      x >= playlistX &&
      x <= playlistX + playlistWidth &&
      y >= playlistY &&
      y <= playlistY + playlistHeight
    );
  };

  // Check if point is on the title text
  const isPointOnTitle = (x: number, y: number): boolean => {
    if (!showTitle || !title) return false;
    
    const canvas = canvasRef.current;
    if (!canvas) return false;
    
    const titleX = (canvas.width * titlePosition.x) / 100;
    const titleY = (canvas.height * titlePosition.y) / 100;
    
    // Measure text width and height
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    ctx.font = `bold ${titleFontSize}px ${titleFontFamily}`;
    const metrics = ctx.measureText(title);
    const textWidth = metrics.width;
    const textHeight = titleFontSize;
    
    // Check if click is within text bounds (centered text)
    const halfWidth = textWidth / 2;
    const halfHeight = textHeight / 2;
    
    return (
      x >= titleX - halfWidth &&
      x <= titleX + halfWidth &&
      y >= titleY - halfHeight &&
      y <= titleY + halfHeight
    );
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    
    // Check if clicking on custom elements first (highest priority)
    const clickedElement = elements.find(el => isPointInElement(coords.x, coords.y, el));
    
    if (clickedElement) {
      setSelectedElementId(clickedElement.id);
      setSelectedComponent('element');
      const handle = getResizeHandle(coords.x, coords.y, clickedElement);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
      } else {
        setIsDragging(true);
      }
      setDragStart(coords);
      return;
    }
    
    // Check if clicking on playlist
    if (playlist.length > 0 && isPointOnPlaylist(coords.x, coords.y)) {
      setSelectedComponent('playlist');
      setSelectedElementId(null); // Deselect other elements
      // Start dragging immediately on click and hold
      setIsDraggingPlaylist(true);
      setDragStart(coords);
      return;
    }
    
    // Check if clicking on title
    if (showTitle && title && isPointOnTitle(coords.x, coords.y)) {
      setSelectedComponent('title');
      setSelectedElementId(null); // Deselect other elements
      // Start dragging immediately on click and hold
      setIsDraggingTitle(true);
      setDragStart(coords);
      return;
    }
    
    // Deselect everything if clicking on empty space
    setSelectedElementId(null);
    setSelectedComponent(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e);

    // Handle playlist dragging (both horizontal and vertical, but starts centered)
    if (isDraggingPlaylist) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;
      
      setPlaylistPosition(prev => {
        const newX = prev.x + (deltaX / canvas.width) * 100;
        const newY = prev.y + (deltaY / canvas.height) * 100;
        
        // Clamp to canvas bounds
        return {
          x: Math.max(0, Math.min(100, newX)),
          y: Math.max(0, Math.min(100, newY)),
        };
      });
      
      setDragStart(coords); // Update drag start for smooth dragging
      requestRender();
      return;
    }

    // Handle title dragging
    if (isDraggingTitle) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;
      
      setTitlePosition(prev => {
        const newX = prev.x + (deltaX / canvas.width) * 100;
        const newY = prev.y + (deltaY / canvas.height) * 100;
        
        // Clamp to canvas bounds
        return {
          x: Math.max(0, Math.min(100, newX)),
          y: Math.max(0, Math.min(100, newY)),
        };
      });
      
      setDragStart(coords); // Update drag start for smooth dragging
      requestRender();
      return;
    }

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
    setIsDraggingTitle(false);
    setIsDraggingPlaylist(false);
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

  // Update playback time from audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDraggingTimeline) {
        setCurrentPlaybackTime(audio.currentTime);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentPlaybackTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isDraggingTimeline]);

  useEffect(() => {
    requestRender();
      }, [backgroundColor, textColor, fontSize, showTitle, title, titleFontSize, titlePosition, titleFontFamily, showTitleBorder, titleBorderColor, titleBorderWidth, titleBorderRadius, playlistPosition, playlistFontSize, playlistTextColor, showPlaylistBorder, playlistBorderColor, playlistBorderWidth, playlistBorderRadius, playlist, elements, selectedElementId, selectedComponent, isDraggingTitle, isDraggingPlaylist, currentPlaybackTime]);

  // Re-render during drag/resize
  useEffect(() => {
    if (isDragging || isResizing || isDraggingTitle || isDraggingPlaylist) {
      requestRender();
    }
  }, [isDragging, isResizing, isDraggingTitle, isDraggingPlaylist]);

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
          ctx.save();
          ctx.fillStyle = textColor;
          ctx.font = `bold ${titleFontSize}px ${titleFontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const titleX = (canvas.width * titlePosition.x) / 100;
          const titleY = (canvas.height * titlePosition.y) / 100;
          
          // Measure text for visual feedback
          const metrics = ctx.measureText(title);
          const textWidth = metrics.width;
          const textHeight = titleFontSize;
          
          // Draw border around title if enabled
          if (showTitleBorder) {
            ctx.strokeStyle = titleBorderColor;
            ctx.lineWidth = titleBorderWidth;
            ctx.beginPath();
            const padding = 10;
            const borderX = titleX - textWidth / 2 - padding;
            const borderY = titleY - textHeight / 2 - padding;
            const borderWidth = textWidth + (padding * 2);
            const borderHeight = textHeight + (padding * 2);
            
            if (titleBorderRadius > 0) {
              // Rounded rectangle
              const radius = titleBorderRadius;
              ctx.moveTo(borderX + radius, borderY);
              ctx.lineTo(borderX + borderWidth - radius, borderY);
              ctx.quadraticCurveTo(borderX + borderWidth, borderY, borderX + borderWidth, borderY + radius);
              ctx.lineTo(borderX + borderWidth, borderY + borderHeight - radius);
              ctx.quadraticCurveTo(borderX + borderWidth, borderY + borderHeight, borderX + borderWidth - radius, borderY + borderHeight);
              ctx.lineTo(borderX + radius, borderY + borderHeight);
              ctx.quadraticCurveTo(borderX, borderY + borderHeight, borderX, borderY + borderHeight - radius);
              ctx.lineTo(borderX, borderY + radius);
              ctx.quadraticCurveTo(borderX, borderY, borderX + radius, borderY);
            } else {
              // Regular rectangle
              ctx.rect(borderX, borderY, borderWidth, borderHeight);
            }
            ctx.stroke();
          }
          
          // Draw selection indicator if title is selected (overlay on top)
          if (selectedComponent === 'title') {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
              titleX - textWidth / 2 - 5,
              titleY - textHeight / 2 - 5,
              textWidth + 10,
              textHeight + 10
            );
            ctx.setLineDash([]);
          }

          ctx.fillText(title, titleX, titleY);
          ctx.restore();
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

    // Draw playlist items (always show when playlist has songs)
    if (playlist.length > 0) {
      ctx.save();
      
      const maxItems = 10;
      const itemsToShow = playlist.slice(0, maxItems);
      const columnWidth = canvas.width * 0.35; // Width for each column
      const columnSpacing = canvas.width * 0.1; // Space between columns
      const songsPerColumn = 5;
      
      // Calculate playlist position (centered by default, but movable)
      const totalPlaylistWidth = (columnWidth * 2) + columnSpacing;
      // Use playlistPosition.x, but if it's 50 (default center), calculate actual center
      const playlistX = playlistPosition.x === 50 
        ? (canvas.width - totalPlaylistWidth) / 2
        : (canvas.width * playlistPosition.x) / 100 - (totalPlaylistWidth / 2);
      const playlistY = (canvas.height * playlistPosition.y) / 100;

      // Calculate start times for songs
      const songStartTimes = calculateSongStartTimes();
      const startTimesMap = new Map(songStartTimes.map(st => [st.songId, st.formattedTime]));

      // Draw selection indicator if playlist is selected
      if (selectedComponent === 'playlist') {
        const adjustedItemHeight = playlistFontSize * 1.5;
        const adjustedSpacing = playlistFontSize * 0.5;
        const playlistHeight = songsPerColumn * (adjustedItemHeight + adjustedSpacing);
        const playlistWidth = columnWidth * 2 + columnSpacing;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          playlistX - 5,
          playlistY - 5,
          playlistWidth + 10,
          playlistHeight + 10
        );
        ctx.setLineDash([]);
      }

      ctx.font = `${playlistFontSize}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Get current playing song
      const currentSong = getCurrentSong();

      // Adjust item height based on font size
      const adjustedItemHeight = playlistFontSize * 1.5;
      const adjustedSpacing = playlistFontSize * 0.5;

      // Draw border around entire playlist if enabled
      if (showPlaylistBorder) {
        const adjustedItemHeight = playlistFontSize * 1.5;
        const adjustedSpacing = playlistFontSize * 0.5;
        const playlistHeight = songsPerColumn * (adjustedItemHeight + adjustedSpacing);
        const playlistWidth = columnWidth * 2 + columnSpacing;
        
        ctx.strokeStyle = playlistBorderColor;
        ctx.lineWidth = playlistBorderWidth;
        ctx.beginPath();
        if (playlistBorderRadius > 0) {
          // Rounded rectangle
          const radius = playlistBorderRadius;
          ctx.moveTo(playlistX + radius, playlistY);
          ctx.lineTo(playlistX + playlistWidth - radius, playlistY);
          ctx.quadraticCurveTo(playlistX + playlistWidth, playlistY, playlistX + playlistWidth, playlistY + radius);
          ctx.lineTo(playlistX + playlistWidth, playlistY + playlistHeight - radius);
          ctx.quadraticCurveTo(playlistX + playlistWidth, playlistY + playlistHeight, playlistX + playlistWidth - radius, playlistY + playlistHeight);
          ctx.lineTo(playlistX + radius, playlistY + playlistHeight);
          ctx.quadraticCurveTo(playlistX, playlistY + playlistHeight, playlistX, playlistY + playlistHeight - radius);
          ctx.lineTo(playlistX, playlistY + radius);
          ctx.quadraticCurveTo(playlistX, playlistY, playlistX + radius, playlistY);
        } else {
          // Regular rectangle
          ctx.rect(playlistX, playlistY, playlistWidth, playlistHeight);
        }
        ctx.stroke();
      }

      itemsToShow.forEach((song, index) => {
        // Determine which column (0 = left, 1 = right)
        const column = Math.floor(index / songsPerColumn);
        const rowInColumn = index % songsPerColumn;
        
        const x = playlistX + (column * (columnWidth + columnSpacing));
        const y = playlistY + (rowInColumn * (adjustedItemHeight + adjustedSpacing));
        
        const startTime = startTimesMap.get(song.id) || '0:00';
        const isCurrentSong = currentSong && song.id === currentSong.songId;
        
        // Draw highlight background for current song
        if (isCurrentSong) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Blue highlight background
          ctx.fillRect(
            x - 10,
            y - 5,
            columnWidth + 20,
            adjustedItemHeight + 10
          );
        }
        
        // Draw song text with different color for current song
        ctx.fillStyle = isCurrentSong ? '#3b82f6' : playlistTextColor; // Blue for current, custom color for others
        const songText = `${index + 1}. ${song.title}${song.artist ? ` - ${song.artist}` : ''}`;
        const timestampText = `[${startTime}]`;
        
        // Measure text to position timestamp
        const songTextWidth = ctx.measureText(songText).width;
        const maxWidth = columnWidth - 100; // Leave space for timestamp
        
        // Draw song title
        ctx.fillText(
          songText,
          x,
          y,
          maxWidth
        );
        
        // Draw timestamp next to song name (slightly smaller font)
        const timestampFontSize = Math.max(20, playlistFontSize * 0.75);
        ctx.font = `${timestampFontSize}px Arial`;
        ctx.fillStyle = isCurrentSong ? '#3b82f6' : playlistTextColor;
        ctx.globalAlpha = 0.8; // Slightly transparent for timestamp
        ctx.fillText(
          timestampText,
          x + Math.min(songTextWidth, maxWidth) + 10,
          y + 4, // Slight vertical offset
          columnWidth * 0.3
        );
        ctx.globalAlpha = 1.0; // Reset alpha
        
        // Reset font for next iteration
        ctx.font = `${playlistFontSize}px Arial`;
      });

      if (playlist.length > maxItems) {
        ctx.fillStyle = playlistTextColor;
        const adjustedItemHeight = playlistFontSize * 1.5;
        const adjustedSpacing = playlistFontSize * 0.5;
        const moreSongsFontSize = Math.max(24, playlistFontSize * 0.85);
        ctx.font = `${moreSongsFontSize}px Arial`;
        ctx.textAlign = 'center';
        const lastRowY = playlistY + (songsPerColumn * (adjustedItemHeight + adjustedSpacing));
        ctx.fillText(
          `+ ${playlist.length - maxItems} more songs...`,
          canvas.width / 2,
          lastRowY
        );
      }
      
      ctx.restore();
    }

    // Generate thumbnail URL
    const dataUrl = canvas.toDataURL('image/png');
    setThumbnailUrl(dataUrl);
    onThumbnailChange?.(dataUrl);
    
    // Save thumbnail settings to context for review step
    if (typeof window !== 'undefined' && (window as any).saveThumbnailData) {
      (window as any).saveThumbnailData({
        thumbnailUrl: dataUrl,
        title,
        titlePosition,
        titleFontSize,
        titleFontFamily,
        playlistPosition,
        showTitle,
        backgroundColor,
      });
    }
  };

  const downloadThumbnail = () => {
    if (!thumbnailUrl) return;

    const link = document.createElement('a');
    link.download = 'playlist-thumbnail.png';
    link.href = thumbnailUrl;
    link.click();
    showNotification('Thumbnail downloaded!', 'success');
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !stitchedAudioUrl) {
      showNotification('Please stitch your playlist first to preview audio', 'warning');
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentPlaybackTime(time);
  };

  const songStartTimes = calculateSongStartTimes();
  const totalDuration = songStartTimes.length > 0 
    ? songStartTimes[songStartTimes.length - 1].endTime 
    : 0;

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
        {selectedComponent && (
          <div className="mt-2 text-sm text-gray-600">
            {selectedComponent === 'title' && '💡 Title selected - Click and drag to move'}
            {selectedComponent === 'playlist' && '💡 Playlist selected - Click and drag to move'}
            {selectedComponent === 'element' && '💡 Element selected - Click and drag to move, drag corners to resize'}
          </div>
        )}
      </div>

      {/* Compact Audio Player */}
      {stitchedAudioUrl && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            src={stitchedAudioUrl}
            className="hidden"
          />
          
          {/* Compact Media Player */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <Button
              onClick={handlePlayPause}
              variant={isPlaying ? "secondary" : "primary"}
              size="sm"
              className="flex-shrink-0"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </Button>
            
            {/* Time Display */}
            <span className="text-xs text-gray-600 min-w-[45px]">
              {formatTime(currentPlaybackTime)}
            </span>
            
            {/* Timeline */}
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max={totalDuration}
                step="0.1"
                value={currentPlaybackTime}
                onChange={(e) => {
                  const time = Number(e.target.value);
                  setCurrentPlaybackTime(time);
                  handleSeek(time);
                }}
                onMouseDown={() => setIsDraggingTimeline(true)}
                onMouseUp={() => setIsDraggingTimeline(false)}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentPlaybackTime / totalDuration) * 100}%, #e5e7eb ${(currentPlaybackTime / totalDuration) * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>
            
            {/* Total Duration */}
            <span className="text-xs text-gray-600 min-w-[45px] text-right">
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>
      )}

      {/* Component Properties - Only show selected component */}
      {selectedComponent === 'title' && (
        <div className="bg-white rounded-lg border border-blue-500 border-2 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Title Properties ✓ Selected</h3>
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
                <>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rename Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Playlist Title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Font Family */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Family
                    </label>
                    <select
                      value={titleFontFamily}
                      onChange={(e) => setTitleFontFamily(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Comic Sans MS">Comic Sans MS</option>
                      <option value="Impact">Impact</option>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Size: {titleFontSize}px
                    </label>
                    <input
                      type="range"
                      min="24"
                      max="120"
                      value={titleFontSize}
                      onChange={(e) => setTitleFontSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Border Options */}
                  <div className="border-t border-gray-200 pt-4 mb-3">
                    <label className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        checked={showTitleBorder}
                        onChange={(e) => setShowTitleBorder(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Border</span>
                    </label>
                    
                    {showTitleBorder && (
                      <div className="space-y-3 ml-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Border Color
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={titleBorderColor}
                              onChange={(e) => setTitleBorderColor(e.target.value)}
                              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={titleBorderColor}
                              onChange={(e) => setTitleBorderColor(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="#FFFFFF"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Border Width: {titleBorderWidth}px
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={titleBorderWidth}
                            onChange={(e) => setTitleBorderWidth(Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Corner Radius: {titleBorderRadius}px
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            value={titleBorderRadius}
                            onChange={(e) => setTitleBorderRadius(Number(e.target.value))}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">Set to 0 for sharp corners</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Position Info */}
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                    <p className="mb-1">
                      <strong>Position:</strong> X: {titlePosition.x.toFixed(1)}%, Y: {titlePosition.y.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      💡 Click and drag the title on the canvas to reposition it
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Background Settings - Always visible */}
      {!selectedComponent && (
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
      )}

      {/* Playlist Settings (when selected) */}
      {selectedComponent === 'playlist' && (
        <div className="bg-white rounded-lg border border-blue-500 border-2 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Playlist Properties ✓ Selected</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size: {playlistFontSize}px
              </label>
              <input
                type="range"
                min="20"
                max="72"
                value={playlistFontSize}
                onChange={(e) => setPlaylistFontSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={playlistTextColor}
                  onChange={(e) => setPlaylistTextColor(e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={playlistTextColor}
                  onChange={(e) => setPlaylistTextColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Border Options */}
            <div className="border-t border-gray-200 pt-4">
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={showPlaylistBorder}
                  onChange={(e) => setShowPlaylistBorder(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Show Border</span>
              </label>
              
              {showPlaylistBorder && (
                <div className="space-y-3 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Border Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={playlistBorderColor}
                        onChange={(e) => setPlaylistBorderColor(e.target.value)}
                        className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={playlistBorderColor}
                        onChange={(e) => setPlaylistBorderColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Border Width: {playlistBorderWidth}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={playlistBorderWidth}
                      onChange={(e) => setPlaylistBorderWidth(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Corner Radius: {playlistBorderRadius}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={playlistBorderRadius}
                      onChange={(e) => setPlaylistBorderRadius(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Set to 0 for sharp corners</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p className="mb-1">
                <strong>Position:</strong> X: {playlistPosition.x.toFixed(1)}%, Y: {playlistPosition.y.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                💡 Click and drag the playlist on the canvas to reposition it
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Songs:</strong> {playlist.length}</p>
              <p><strong>Display:</strong> {Math.min(playlist.length, 10)} of {playlist.length} songs</p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Element Properties */}
      {selectedComponent === 'element' && selectedElementId && (() => {
        const selectedElement = elements.find(el => el.id === selectedElementId);
        if (selectedElement?.type === 'text') {
          return (
            <div className="bg-white rounded-lg border border-blue-500 border-2 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Text Element Properties ✓ Selected</h3>
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
        } else if (selectedElement?.type === 'image') {
          return (
            <div className="bg-white rounded-lg border border-blue-500 border-2 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Image Element Properties ✓ Selected</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  <p className="mb-1">
                    <strong>Position:</strong> X: {selectedElement.x.toFixed(0)}, Y: {selectedElement.y.toFixed(0)}
                  </p>
                  <p className="mb-1">
                    <strong>Size:</strong> {selectedElement.width?.toFixed(0)} × {selectedElement.height?.toFixed(0)} px
                  </p>
                  <p className="text-xs text-gray-500">
                    💡 Click and drag to move, drag corners to resize
                  </p>
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

