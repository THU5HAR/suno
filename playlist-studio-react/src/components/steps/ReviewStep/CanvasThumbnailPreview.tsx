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
    const renderObjects = async () => {
      for (const obj of canvasData.objects) {
        ctx.save();

        // Apply transformations
        const objLeft = obj.left || 0;
        const objTop = obj.top || 0;
        const objWidth = obj.width || 0;
        const objHeight = obj.height || 0;
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        const angle = obj.angle || 0;
        const opacity = obj.opacity !== undefined ? obj.opacity : 1;

        ctx.translate(objLeft, objTop);
        if (angle !== 0) {
          ctx.rotate((angle * Math.PI) / 180);
        }
        if (scaleX !== 1 || scaleY !== 1) {
          ctx.scale(scaleX, scaleY);
        }

        ctx.globalAlpha = opacity;

        // Draw based on type
        if (obj.type === 'rect' || obj.type === 'rectangle') {
          ctx.fillStyle = obj.fill || '#000000';
          if (obj.stroke && obj.strokeWidth) {
            ctx.strokeStyle = obj.stroke;
            ctx.lineWidth = obj.strokeWidth;
            ctx.fillRect(-objWidth / 2, -objHeight / 2, objWidth, objHeight);
            ctx.strokeRect(-objWidth / 2, -objHeight / 2, objWidth, objHeight);
          } else {
            ctx.fillRect(-objWidth / 2, -objHeight / 2, objWidth, objHeight);
          }
        } else if (obj.type === 'circle') {
          ctx.fillStyle = obj.fill || '#000000';
          const radius = objWidth / 2;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          if (obj.stroke && obj.strokeWidth) {
            ctx.strokeStyle = obj.stroke;
            ctx.lineWidth = obj.strokeWidth;
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fill();
          }
        } else if (obj.type === 'text' || obj.type === 'textbox' || obj.type === 'i-text') {
          ctx.fillStyle = obj.fill || '#000000';
          ctx.font = `${obj.fontSize || 20}px ${obj.fontFamily || 'Arial'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(obj.text || 'Text', 0, 0);
        } else if (obj.type === 'image' && obj.src) {
          // Load and draw image
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                try {
                  const imgWidth = objWidth || img.width;
                  const imgHeight = objHeight || img.height;
                  ctx.drawImage(
                    img,
                    -imgWidth / 2,
                    -imgHeight / 2,
                    imgWidth,
                    imgHeight
                  );
                  resolve();
                } catch (drawError) {
                  console.error('Error drawing image:', drawError);
                  reject(drawError);
                }
              };
              img.onerror = () => {
                console.error('Failed to load image:', obj.src);
                resolve(); // Continue even if image fails
              };
              if (obj.src) {
                img.src = obj.src;
              } else {
                resolve(); // Skip if no src
              }
            });
          } catch (imgError) {
            console.error('Error processing image object:', imgError);
            // Continue with other objects even if one image fails
          }
        }

        ctx.restore();
      }
    };

    renderObjects().catch(console.error);
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

