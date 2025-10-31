import React, { useState, useRef } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { Asset } from '@/types';
import { Button } from '@/components/ui/Button';
import { Upload, X, Image as ImageIcon, Video, Music } from 'lucide-react';

interface AssetLibraryProps {
  onAssetSelect?: (asset: Asset) => void;
  className?: string;
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({
  onAssetSelect,
  className = '',
}) => {
  const { assets, addAsset, removeAsset } = usePlaylist();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      const asset: Omit<Asset, 'id'> = {
        name: file.name,
        url: URL.createObjectURL(file),
        type: getAssetType(file.type),
        file,
      };
      addAsset(asset);
    });
  };

  const getAssetType = (mimeType: string): 'image' | 'video' | 'audio' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'image'; // default
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={20} />;
      case 'video':
        return <Video size={20} />;
      case 'audio':
        return <Music size={20} />;
      default:
        return <ImageIcon size={20} />;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleAssetClick = (asset: Asset) => {
    onAssetSelect?.(asset);
  };

  const handleRemoveAsset = (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeAsset(assetId);
  };

  return (
    <div className={`asset-library bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Asset Library</h3>
        <Button
          onClick={() => fileInputRef.current?.click()}
          size="sm"
          className="flex items-center gap-2"
        >
          <Upload size={16} />
          Upload
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload size={24} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          Drag & drop files here or click Upload to add assets
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports images, videos, and audio files
        </p>
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="relative group border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => handleAssetClick(asset)}
          >
            <div className="flex items-center gap-2 mb-1">
              {getAssetIcon(asset.type)}
              <span className="text-xs font-medium truncate" title={asset.name}>
                {asset.name}
              </span>
            </div>

            {asset.type === 'image' && (
              <img
                src={asset.url}
                alt={asset.name}
                className="w-full h-16 object-cover rounded"
              />
            )}

            {asset.type === 'video' && (
              <div className="w-full h-16 bg-gray-100 rounded flex items-center justify-center">
                <Video size={20} className="text-gray-400" />
              </div>
            )}

            {asset.type === 'audio' && (
              <div className="w-full h-16 bg-gray-100 rounded flex items-center justify-center">
                <Music size={20} className="text-gray-400" />
              </div>
            )}

            <button
              onClick={(e) => handleRemoveAsset(asset.id, e)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="Remove asset"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {assets.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-500">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No assets uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};