import React, { useEffect, useRef } from 'react';
import { CanvasData } from '@/types';

interface CanvasThumbnailPreviewProps {
  canvasData: CanvasData;
  width?: number;
  height?: number;
  className?: string;
}

export const CanvasThumbnailPreview: React.FC<CanvasThumbnailPreviewProps> = ({
  canvasData,
  width = 1280,
  height = 720,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = canvasData.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Render objects
    canvasData.objects.forEach((obj) => {
      ctx.save();

      // Apply transformations
      ctx.translate(obj.left, obj.top);
      if (obj.angle) {
        ctx.rotate((obj.angle * Math.PI) / 180);
      }
      if (obj.scaleX) ctx.scale(obj.scaleX, obj.scaleY || obj.scaleX);

      // Draw based on type
      if (obj.type === 'rect' || obj.type === 'rectangle') {
        ctx.fillStyle = obj.fill || '#000000';
        ctx.fillRect(0, 0, obj.width || 100, obj.height || 100);
      } else if (obj.type === 'circle') {
        ctx.fillStyle = obj.fill || '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, (obj.width || 50) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (obj.type === 'text' || obj.type === 'textbox') {
        ctx.fillStyle = obj.fill || '#000000';
        ctx.font = `${obj.fontSize || 20}px ${obj.fontFamily || 'Arial'}`;
        ctx.fillText(obj.text || 'Text', 0, 0);
      }

      ctx.restore();
    });
  }, [canvasData, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};

