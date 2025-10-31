import React, { useState } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface FeedbackPopupProps {
  isOpen: boolean;
  onClose: () => void;
  songIndex?: number;
  timestamp?: number;
  onSaveToDrive?: (feedbackData: { title: string; text: string }) => Promise<void>;
}

export const FeedbackPopup: React.FC<FeedbackPopupProps> = ({
  isOpen,
  onClose,
  songIndex,
  timestamp,
  onSaveToDrive
}) => {
  const { playlist, addFeedback } = usePlaylist();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !text.trim()) {
      return;
    }

    const feedbackData = {
      songIndex: songIndex ?? 0,
      timestamp: timestamp ?? 0,
      title: title.trim(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    // Save to local context
    addFeedback(feedbackData);

    // Save to Google Drive if callback provided
    if (onSaveToDrive) {
      setIsSaving(true);
      try {
        await onSaveToDrive({
          title: feedbackData.title,
          text: feedbackData.text,
        });
      } catch (error) {
        console.error('Failed to save to Google Drive:', error);
      } finally {
        setIsSaving(false);
      }
    }

    setTitle('');
    setText('');
    onClose();
  };

  const currentSong = songIndex !== undefined ? playlist[songIndex] : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Feedback">
      <form onSubmit={handleSubmit} className="space-y-4">
        {currentSong && (
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Feedback for:</p>
            <p className="font-medium">{currentSong.title}</p>
            {currentSong.artist && <p className="text-sm text-gray-500">{currentSong.artist}</p>}
            {timestamp !== undefined && (
              <p className="text-sm text-blue-600 mt-1 font-medium">
                Timestamp: {formatTimestamp(timestamp)}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Feedback Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Great transition, adjust volume"
            required
          />
        </div>

        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700">
            Feedback Details *
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe your feedback in detail..."
            required
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving to Drive...' : onSaveToDrive ? 'Save & Add Feedback' : 'Add Feedback'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};