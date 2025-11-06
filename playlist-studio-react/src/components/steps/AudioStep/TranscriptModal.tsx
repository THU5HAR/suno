import React, { useState, useRef } from 'react';
import { Song } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useNotifications } from '@/context/NotificationContext';
import { usePlaylist } from '@/context/PlaylistContext';
import { transcriptionService } from '@/services/transcriptionService';

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({ isOpen, onClose, song }) => {
  const { showNotification } = useNotifications();
  const { playlist, addFeedback } = usePlaylist();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [lyricsText, setLyricsText] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<{
    match: boolean;
    similarity: number;
    differences?: string[];
  } | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);

  const handleTranscribe = async () => {
    if (!song.url) {
      showNotification('No audio URL available for this song', 'warning');
      return;
    }

    setIsTranscribing(true);
    setTranscribedText('');
    setDetectedLanguage('');
    setComparisonResult(null);

    try {
      const result = await transcriptionService.transcribeAudio(song.url, (progress) => {
        console.log('Transcription progress:', progress);
      });

      setTranscribedText(result.text);
      setDetectedLanguage(result.language || 'Unknown');
      showNotification('Audio transcribed successfully!', 'success');
    } catch (error: any) {
      console.error('Transcription error:', error);
      showNotification(`Transcription failed: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleLyricsFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      showNotification('Please upload a .txt file', 'warning');
      return;
    }

    try {
      const text = await file.text();
      setLyricsText(text.trim());
      showNotification('Lyrics file loaded successfully!', 'success');
    } catch (error: any) {
      showNotification(`Failed to read lyrics file: ${error.message}`, 'error');
    }
  };

  const handleCompare = () => {
    if (!transcribedText) {
      showNotification('Please transcribe the audio first', 'warning');
      return;
    }

    if (!lyricsText) {
      showNotification('Please upload lyrics file first', 'warning');
      return;
    }

    setIsComparing(true);
    
    try {
      const result = transcriptionService.compareText(transcribedText, lyricsText);
      setComparisonResult(result);

      if (result.match || result.similarity >= 0.8) {
        showNotification(`Text matches! Similarity: ${(result.similarity * 100).toFixed(1)}%`, 'success');
      } else {
        // Add feedback for mismatch
        const songIndex = playlist.findIndex(s => s.id === song.id);
        if (songIndex !== -1) {
          addFeedback({
            songIndex: songIndex,
            timestamp: 0,
            title: 'Transcript Mismatch',
            text: `Transcribed text does not match lyrics. Similarity: ${(result.similarity * 100).toFixed(1)}%. ${result.differences ? 'Differences: ' + result.differences.join(', ') : ''}`,
            createdAt: new Date().toISOString(),
          });
          showNotification('Transcript mismatch detected. Feedback added!', 'warning');
        }
      }
    } catch (error: any) {
      showNotification(`Comparison failed: ${error.message}`, 'error');
    } finally {
      setIsComparing(false);
    }
  };

  const handleReset = () => {
    setTranscribedText('');
    setLyricsText('');
    setComparisonResult(null);
    setDetectedLanguage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (lyricsFileInputRef.current) lyricsFileInputRef.current.value = '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Transcript - ${song.title}`}>
      <div className="space-y-6">
        {/* Step 1: Transcribe Audio */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Step 1: Transcribe Audio</h3>
          <p className="text-sm text-gray-600 mb-4">
            Convert audio to text. Language will be auto-detected (supports Kannada, Hindi, English, etc.)
          </p>
          <Button
            onClick={handleTranscribe}
            disabled={isTranscribing || !song.url}
            variant="primary"
            className="w-full"
          >
            {isTranscribing ? '🔄 Transcribing...' : '🎤 Transcribe Audio'}
          </Button>
          
          {transcribedText && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Detected Language: <span className="font-semibold">{detectedLanguage}</span>
              </p>
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{transcribedText}</p>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Upload Lyrics */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Step 2: Upload Lyrics File</h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload a .txt file containing the song lyrics for comparison
          </p>
          <input
            ref={lyricsFileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleLyricsFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => lyricsFileInputRef.current?.click()}
            variant="secondary"
            className="w-full"
          >
            📄 Upload Lyrics File (.txt)
          </Button>
          
          {lyricsText && (
            <div className="mt-4">
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{lyricsText}</p>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Compare */}
        {transcribedText && lyricsText && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Step 3: Compare</h3>
            <Button
              onClick={handleCompare}
              disabled={isComparing}
              variant="primary"
              className="w-full mb-4"
            >
              {isComparing ? '🔄 Comparing...' : '🔍 Compare Transcript with Lyrics'}
            </Button>
            
            {comparisonResult && (
              <div className={`rounded-lg p-4 ${comparisonResult.match ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">
                    {comparisonResult.match ? '✅ Match!' : '⚠️ Mismatch Detected'}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    Similarity: {(comparisonResult.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                {!comparisonResult.match && comparisonResult.differences && comparisonResult.differences.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Differences:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {comparisonResult.differences.map((diff, index) => (
                        <li key={index}>{diff}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!comparisonResult.match && (
                  <p className="text-sm text-gray-600 mt-3">
                    💡 Feedback has been automatically added for this song.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleReset} variant="secondary" className="flex-1">
            🔄 Reset
          </Button>
          <Button onClick={onClose} variant="primary" className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

