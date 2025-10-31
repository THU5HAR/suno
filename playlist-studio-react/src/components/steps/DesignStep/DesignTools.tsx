import React from 'react';
import { Button } from '@/components/ui/Button';
import { Square, Circle, Type, Image, Trash2, Download, Upload } from 'lucide-react';

interface DesignToolsProps {
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddText: () => void;
  onAddImage: () => void;
  onClearCanvas: () => void;
  onExportCanvas: () => void;
  onImportCanvas: () => void;
  className?: string;
}

export const DesignTools: React.FC<DesignToolsProps> = ({
  onAddRectangle,
  onAddCircle,
  onAddText,
  onAddImage,
  onClearCanvas,
  onExportCanvas,
  onImportCanvas,
  className = '',
}) => {
  return (
    <div className={`design-tools bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Design Tools</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button
          onClick={onAddRectangle}
          className="flex items-center justify-center gap-2"
          size="sm"
        >
          <Square size={16} />
          Rectangle
        </Button>

        <Button
          onClick={onAddCircle}
          className="flex items-center justify-center gap-2"
          size="sm"
        >
          <Circle size={16} />
          Circle
        </Button>

        <Button
          onClick={onAddText}
          className="flex items-center justify-center gap-2"
          size="sm"
        >
          <Type size={16} />
          Text
        </Button>

        <Button
          onClick={onAddImage}
          className="flex items-center justify-center gap-2"
          size="sm"
        >
          <Image size={16} />
          Image
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium mb-2">Canvas Actions</h4>
        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={onClearCanvas}
            variant="danger"
            className="flex items-center justify-center gap-2"
            size="sm"
          >
            <Trash2 size={16} />
            Clear Canvas
          </Button>

          <Button
            onClick={onExportCanvas}
            variant="secondary"
            className="flex items-center justify-center gap-2"
            size="sm"
          >
            <Download size={16} />
            Export
          </Button>

          <Button
            onClick={onImportCanvas}
            variant="secondary"
            className="flex items-center justify-center gap-2"
            size="sm"
          >
            <Upload size={16} />
            Import
          </Button>
        </div>
      </div>
    </div>
  );
};