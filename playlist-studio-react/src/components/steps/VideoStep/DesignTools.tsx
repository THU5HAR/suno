import React, { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Type, Image, Trash2 } from 'lucide-react';

interface DesignToolsProps {
  onAddText: () => void;
  onAddImage: (imageUrl: string) => void;
  onClearCanvas: () => void;
}

export const DesignTools: React.FC<DesignToolsProps> = ({
  onAddText,
  onAddImage,
  onClearCanvas,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Convert file to data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      if (imageUrl) {
        onAddImage(imageUrl);
      }
    };
    reader.onerror = () => {
      alert('Failed to read image file');
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload-input"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
            className="w-full justify-start"
            aria-label="Add Image"
          >
            <Image size={18} className="mr-2" />
            Add Image
          </Button>
        </div>
        
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

