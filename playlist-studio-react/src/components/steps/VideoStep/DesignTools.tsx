import React from 'react';
import { Button } from '@/components/ui/Button';
import { Type, Image, Trash2 } from 'lucide-react';

interface DesignToolsProps {
  onAddText: () => void;
  onAddImage: () => void;
  onClearCanvas: () => void;
}

export const DesignTools: React.FC<DesignToolsProps> = ({
  onAddText,
  onAddImage,
  onClearCanvas,
}) => {
  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Design Tools
      </div>
      
      <div className="space-y-2">
        <Button
          onClick={onAddText}
          variant="secondary"
          className="w-full justify-start"
          aria-label="Add Text"
        >
          <Type size={18} className="mr-2" />
          Add Text
        </Button>
        
        <Button
          onClick={onAddImage}
          variant="secondary"
          className="w-full justify-start"
          aria-label="Add Image"
        >
          <Image size={18} className="mr-2" />
          Add Image
        </Button>
        
        <div className="pt-2 border-t border-gray-200">
          <Button
            onClick={onClearCanvas}
            variant="secondary"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            aria-label="Clear Canvas"
          >
            <Trash2 size={18} className="mr-2" />
            Clear Canvas
          </Button>
        </div>
      </div>
    </div>
  );
};

