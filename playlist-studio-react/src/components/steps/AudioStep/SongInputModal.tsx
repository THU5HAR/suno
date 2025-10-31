import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { useNotifications } from '@/context/NotificationContext';
import { Song } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { validateAudioUrl, isYouTubeUrl, convertGoogleDriveUrl, extractYouTubeVideoId } from '@/utils/urlHelpers';

interface SongInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  song?: Song | null;
}

interface PreviewSong {
  title: string;
  url?: string;
}

export const SongInputModal: React.FC<SongInputModalProps> = ({ isOpen, onClose, song }) => {
  const { addSong, updateSong } = usePlaylist();
  const { showNotification } = useNotifications();
  const [inputMethod, setInputMethod] = useState<'bulk' | 'single'>('bulk');
  const [bulkInput, setBulkInput] = useState('');
  const [previewSongs, setPreviewSongs] = useState<PreviewSong[]>([]);
  const [playingPreviewIndex, setPlayingPreviewIndex] = useState<number | null>(null);
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const [isDragOver, setIsDragOver] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    url: '',
    duration: '',
    startTime: '',
    album: '',
    year: '',
  });

  useEffect(() => {
    if (song) {
      // If editing a song, show single input mode
      setInputMethod('single');
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        url: song.url || '',
        duration: song.duration || '',
        startTime: song.startTime || '',
        album: song.album || '',
        year: song.year || '',
      });
    } else {
      // If adding new, reset to bulk input
      setInputMethod('bulk');
      setFormData({
        title: '',
        artist: '',
        url: '',
        duration: '',
        startTime: '',
        album: '',
        year: '',
      });
      setBulkInput('');
      setPreviewSongs([]);
    }
  }, [song, isOpen]);

  const parseBulkInput = useCallback((text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsed: PreviewSong[] = [];

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        let title: string, url: string | undefined;

        if (trimmedLine.includes('|')) {
          const parts = trimmedLine.split('|').map(s => s.trim());
          title = parts[0];
          url = parts[1] || undefined;
        } else {
          title = trimmedLine;
          url = undefined;
        }

        if (title) {
          parsed.push({ title, url });
        }
      }
    });

    setPreviewSongs(parsed);
  }, []);

  const updateSinglePreview = useCallback(() => {
    if (formData.title.trim()) {
      setPreviewSongs([{
        title: formData.title.trim(),
        url: formData.url.trim() || undefined,
      }]);
    } else {
      setPreviewSongs([]);
    }
  }, [formData.title, formData.url]);

  // Update preview when bulk input changes
  useEffect(() => {
    if (inputMethod === 'bulk' && bulkInput.trim()) {
      parseBulkInput(bulkInput);
    } else if (inputMethod === 'single') {
      updateSinglePreview();
    } else {
      setPreviewSongs([]);
    }
  }, [bulkInput, formData.title, formData.url, inputMethod, parseBulkInput, updateSinglePreview]);

  const handleBulkSubmit = async () => {
    if (previewSongs.length === 0) {
      alert('Please enter some songs first!');
      return;
    }

    // Add all preview songs with download progress
    for (const previewSong of previewSongs) {
      addSong({
        title: previewSong.title,
        url: previewSong.url,
      });
    }

    // Reset and close
    setBulkInput('');
    setPreviewSongs([]);
    onClose();
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    const songData = {
      title: formData.title.trim(),
      artist: formData.artist.trim() || undefined,
      url: formData.url.trim() || undefined,
      duration: formData.duration.trim() || undefined,
      startTime: formData.startTime.trim() || undefined,
      album: formData.album.trim() || undefined,
      year: formData.year.trim() || undefined,
    };

    if (song) {
      updateSong(song.id, songData);
    } else {
      addSong(songData);
    }

    onClose();
  };

  const handleClearBulk = () => {
    setBulkInput('');
    setPreviewSongs([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const audioFiles = fileArray.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
      showNotification('Please select audio files only (MP3, WAV, M4A, etc.)', 'warning');
      return;
    }

    audioFiles.forEach((file) => {
      // Create object URL for local file
      const objectUrl = URL.createObjectURL(file);
      
      // Extract title from filename (remove extension)
      const fileName = file.name;
      const title = fileName.replace(/\.[^/.]+$/, '');
      
      // Add song with object URL
      addSong({
        title: title,
        url: objectUrl,
      });
    });

    showNotification(`✅ Added ${audioFiles.length} song${audioFiles.length !== 1 ? 's' : ''} from local files`, 'success');
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
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handlePreviewPreviewSong = (previewSong: PreviewSong, index: number) => {
    if (!previewSong.url) {
      showNotification('No URL available for this song', 'warning');
      return;
    }

    const audio = audioRefs.current.get(index);
    if (audio) {
      if (playingPreviewIndex === index) {
        // Stop current song
        audio.pause();
        audio.currentTime = 0;
        setPlayingPreviewIndex(null);
      } else {
        // Stop all other previews
        audioRefs.current.forEach((a, idx) => {
          if (idx !== index) {
            a.pause();
            a.currentTime = 0;
          }
        });
        // Play this song
        audio.play().catch((playError) => {
          console.error('Play error:', playError);
          let errorMessage = `Cannot play audio for "${previewSong.title}". `;
          
          if (playError?.name === 'NotAllowedError') {
            errorMessage += 'Audio playback was blocked. Please interact with the page first, then try again.';
          } else if (playError?.name === 'NotSupportedError') {
            errorMessage += 'Audio format not supported. Try a different file format.';
          } else {
            errorMessage += 'Please check the URL and ensure the audio file is accessible.';
          }
          
          showNotification(errorMessage, 'error');
        });
        setPlayingPreviewIndex(index);
      }
    } else {
      // Validate and prepare URL
      let audioUrl = previewSong.url.trim();
      
      // Check if it's a YouTube URL first
      if (isYouTubeUrl(audioUrl)) {
        const videoId = extractYouTubeVideoId(audioUrl);
        showNotification(
          `⚠️ YouTube URLs are not directly supported. To use YouTube videos:\n\n` +
          `1. Use a YouTube to MP3 converter (like ytmp3.cc, y2mate.com, etc.)\n` +
          `2. Download the audio file and upload to Google Drive or use a direct link\n` +
          `3. Use the direct audio URL in this field\n\n` +
          `Video ID: ${videoId || 'unknown'}`,
          'error',
          10000
        );
        return;
      }

      // Validate URL format and type
      const urlValidation = validateAudioUrl(audioUrl);
      if (!urlValidation.isValid) {
        if (urlValidation.error) {
          showNotification(urlValidation.error, 'error', urlValidation.urlType === 'youtube' ? 10000 : 5000);
        } else {
          showNotification('Invalid URL format. Please check the audio URL.', 'error');
        }
        return;
      }
      
      // Handle Google Drive URLs - convert sharing links to direct download
      if (urlValidation.urlType === 'google_drive') {
        const convertedUrl = convertGoogleDriveUrl(audioUrl);
        if (convertedUrl) {
          audioUrl = convertedUrl;
        }
      }

      // Create new audio element with proper configuration
      const newAudio = new Audio();
      newAudio.crossOrigin = 'anonymous';
      newAudio.preload = 'metadata';
      
      const handleError = () => {
        let userMessage = `Failed to load audio for "${previewSong.title}". `;
        
        if (previewSong.url && isYouTubeUrl(previewSong.url)) {
          userMessage += 'YouTube URLs are not supported. Please convert to a direct audio URL first.';
        } else if (audioUrl.includes('drive.google.com')) {
          userMessage += 'Make sure the Google Drive file is publicly accessible.';
        } else if (!audioUrl.startsWith('http')) {
          userMessage += 'URL must start with http:// or https://';
        } else {
          userMessage += 'Please check if the URL is valid and accessible.';
        }
        
        showNotification(userMessage, 'error');
        console.error('Audio load error:', newAudio.error, 'URL:', audioUrl);
        setPlayingPreviewIndex(null);
      };

      newAudio.addEventListener('ended', () => setPlayingPreviewIndex(null));
      newAudio.addEventListener('error', handleError);
      newAudio.addEventListener('canplay', () => {
        console.log('Audio can play:', previewSong.title);
      });
      
      newAudio.src = audioUrl;
      audioRefs.current.set(index, newAudio);
      
      // Stop all other previews
      audioRefs.current.forEach((a, idx) => {
        if (idx !== index) {
          a.pause();
          a.currentTime = 0;
        }
      });
      
      // Attempt to play
      const attemptPlay = () => {
        newAudio.play()
          .then(() => {
            console.log('Audio playback started:', previewSong.title);
            setPlayingPreviewIndex(index);
          })
          .catch((playError) => {
            console.error('Play error:', playError);
            let errorMessage = `Cannot play audio for "${previewSong.title}". `;
            
            if (playError.name === 'NotAllowedError') {
              errorMessage += 'Audio playback was blocked. Please interact with the page first, then try again.';
            } else if (playError.name === 'NotSupportedError') {
              errorMessage += 'Audio format not supported. Try a different file format (MP3, WAV, etc.).';
            } else {
              errorMessage += 'Please check the URL and ensure the audio file is accessible.';
            }
            
            showNotification(errorMessage, 'error');
            setPlayingPreviewIndex(null);
          });
      };

      if (newAudio.readyState >= 2) {
        attemptPlay();
      } else {
        newAudio.addEventListener('canplay', attemptPlay, { once: true });
        setTimeout(() => {
          if (newAudio.readyState >= 2 && playingPreviewIndex !== index) {
            attemptPlay();
          }
        }, 500);
      }
    }
  };

  // Cleanup audio when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Stop all previews
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      audioRefs.current.clear();
      setPlayingPreviewIndex(null);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={song ? 'Edit Song' : 'Add Songs'}>
      <div className="space-y-4">
        {/* Input Method Tabs */}
        {!song && (
          <div className="flex space-x-2 border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setInputMethod('bulk')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                inputMethod === 'bulk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Bulk Input
            </button>
            <button
              type="button"
              onClick={() => setInputMethod('single')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                inputMethod === 'single'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Single Song
            </button>
          </div>
        )}

        {/* Bulk Input Tab */}
        {!song && inputMethod === 'bulk' && (
          <div className="space-y-4">
            {/* File Upload Section */}
            <div
              className={`bg-blue-50 border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
                isDragOver
                  ? 'border-blue-500 bg-blue-100'
                  : 'border-blue-300 hover:border-blue-400 hover:bg-blue-100'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                bulkFileInputRef.current?.click();
              }}
            >
              <div className="text-center">
                <div className="text-4xl mb-2">{isDragOver ? '📥' : '📁'}</div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {isDragOver ? 'Drop files here!' : 'Upload Audio Files'}
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  {isDragOver
                    ? 'Release to add files'
                    : 'Drop audio files here or click anywhere to browse (MP3, WAV, M4A, OGG, FLAC)'}
                </p>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  id="audio-file-upload"
                  className="hidden"
                  accept="audio/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    handleFileUpload(files);
                    // Reset input
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent double-trigger from parent click
                    bulkFileInputRef.current?.click();
                  }}
                >
                  📂 Choose Audio Files
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="mb-2">
                <h4 className="text-sm font-medium text-gray-900">Add Multiple Songs (URLs or Text)</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Paste your song list below (one song per line). Format: "Song Title | URL"
                </p>
              </div>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={`Song Title 1 | https://url1.mp3
Song Title 2 | https://url2.mp3
Song Title 3
Another Song | https://url4.mp3`}
                rows={10}
                className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-blue-500 focus:border-blue-500 resize-y"
              />
              <div className="flex justify-end space-x-2 mt-2">
                <Button type="button" variant="secondary" onClick={handleClearBulk}>
                  Clear
                </Button>
                <Button type="button" onClick={handleBulkSubmit}>
                  Add {previewSongs.length > 0 ? `${previewSongs.length} ` : ''}Songs
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Single Input Tab */}
        {(song || inputMethod === 'single') && (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="artist" className="block text-sm font-medium text-gray-700">
            Artist
          </label>
          <input
            type="text"
            id="artist"
            name="artist"
            value={formData.artist}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                    URL or Upload File
          </label>
                  <div className="mt-1 flex gap-2">
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
                      placeholder="https://example.com/audio.mp3 or upload file below"
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      ref={singleFileInputRef}
                      type="file"
                      id="single-audio-file-upload"
                      className="hidden"
                      accept="audio/*"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;

                        const file = files[0];
                        if (!file.type.startsWith('audio/')) {
                          showNotification('Please select an audio file (MP3, WAV, M4A, etc.)', 'warning');
                          return;
                        }

                        // Create object URL for local file
                        const objectUrl = URL.createObjectURL(file);
                        
                        // Extract title from filename if title is empty
                        if (!formData.title.trim()) {
                          const fileName = file.name;
                          const title = fileName.replace(/\.[^/.]+$/, '');
                          setFormData(prev => ({ ...prev, title, url: objectUrl }));
                        } else {
                          setFormData(prev => ({ ...prev, url: objectUrl }));
                        }

                        showNotification(`✅ File "${file.name}" ready to add`, 'success');
                        
                        // Reset input
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        singleFileInputRef.current?.click();
                      }}
                    >
                      📁 Upload
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    You can paste a URL or upload a local audio file
                  </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
              Duration
            </label>
            <input
              type="text"
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              placeholder="e.g., 3:45"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
              Start Time
            </label>
            <input
              type="text"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              placeholder="e.g., 0:30"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="album" className="block text-sm font-medium text-gray-700">
              Album
            </label>
            <input
              type="text"
              id="album"
              name="album"
              value={formData.album}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700">
              Year
            </label>
            <input
              type="text"
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="e.g., 2023"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {song ? 'Update Song' : 'Add Song'}
          </Button>
        </div>
      </form>
        )}

        {/* Song Preview Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Song Preview</h4>
          <div className="max-h-48 overflow-y-auto">
            {previewSongs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No songs added yet. Add some songs above to see preview.
              </p>
            ) : (
              <div className="space-y-2">
                {previewSongs.map((previewSong, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {previewSong.title}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {previewSong.url || 'No URL provided'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {previewSong.url && (
                        <button
                          type="button"
                          onClick={() => handlePreviewPreviewSong(previewSong, index)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            playingPreviewIndex === index
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title="Preview Audio"
                        >
                          {playingPreviewIndex === index ? '⏸️' : '▶️'}
                        </button>
                      )}
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};