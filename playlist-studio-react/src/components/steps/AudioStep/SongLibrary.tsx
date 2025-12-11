import React, { useState, useRef, useEffect } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { useNotifications } from '@/context/NotificationContext';
import { Song } from '@/types';
import { Button } from '@/components/ui/Button';
import { SongInputModal } from './SongInputModal';
import { SongTimeline } from './SongTimeline';
import { FeedbackPopup } from './FeedbackPopup';
import { googleDriveService } from '@/services/googleDriveService';
import { validateAudioUrl, isYouTubeUrl, isSunoUrl, convertGoogleDriveUrl } from '@/utils/urlHelpers';
import { audioExtractionService } from '@/services/audioExtractionService';

export const SongLibrary: React.FC = () => {
  const { playlist, addSong, removeSong, reorderSongs, setCurrentStep } = usePlaylist();
  const { showNotification } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [songTimes, setSongTimes] = useState<Map<string, number>>(new Map());
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [pauseTimestamp, setPauseTimestamp] = useState<{ songIndex: number; timestamp: number } | null>(null);
  const [extractingAudioId, setExtractingAudioId] = useState<string | null>(null);
  const [extractingSongName, setExtractingSongName] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingRef = useRef(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddMenu]);

  const handleAddSong = (method: 'link' | 'csv' | 'device') => {
    setShowAddMenu(false);
    setEditingSong(null);
    
    if (method === 'link') {
      setIsModalOpen(true);
    } else if (method === 'csv') {
      csvFileInputRef.current?.click();
    } else if (method === 'device') {
      // Trigger file input for device files
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'audio/*';
      fileInput.multiple = true;
      fileInput.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          handleDeviceFileUpload(files);
        }
      };
      fileInput.click();
    }
  };

  const handleDeviceFileUpload = (files: FileList) => {
    const fileArray = Array.from(files);
    const audioFiles = fileArray.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
      showNotification('Please select audio files only (MP3, WAV, M4A, etc.)', 'warning');
      return;
    }

    audioFiles.forEach((file) => {
      const objectUrl = URL.createObjectURL(file);
      const fileName = file.name;
      const title = fileName.replace(/\.[^/.]+$/, '');
      
      // Add song with object URL
      addSong({
        title: title,
        url: objectUrl,
      });
    });

    showNotification(`✅ Added ${audioFiles.length} song${audioFiles.length !== 1 ? 's' : ''} from device`, 'success');
  };

  const handleCSVUpload = async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      let addedCount = 0;
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        // Support multiple formats:
        // Format 1: [Title, URL, Artist, Duration, ...]
        // Format 2: [Title | URL]
        // Format 3: Just [Title] or [URL]
        let title = '';
        let url = '';
        let artist = '';
        let duration = '';

        if (row.length === 1) {
          const cell = String(row[0] || '').trim();
          if (cell.includes('|')) {
            const parts = cell.split('|').map(s => s.trim());
            title = parts[0] || '';
            url = parts[1] || '';
          } else if (cell.startsWith('http')) {
            url = cell;
            title = `Song ${addedCount + 1}`;
          } else {
            title = cell;
          }
        } else {
          title = String(row[0] || '').trim();
          url = String(row[1] || '').trim();
          artist = String(row[2] || '').trim();
          duration = String(row[3] || '').trim();
        }

        if (!title && !url) continue;

        // If it's a YouTube or Suno URL, extract audio
        if (url && (isYouTubeUrl(url) || isSunoUrl(url))) {
          const songId = `temp-${Date.now()}-${i}`;
          setExtractingAudioId(songId);
          setExtractingSongName(title || url);
          
          try {
            const extractionResult = await audioExtractionService.extractAudioFromYouTube(url);
            url = extractionResult.audioUrl;
            title = extractionResult.title || title || `Song ${addedCount + 1}`;
            showNotification(`✅ Extracted: ${title}`, 'success');
          } catch (error: any) {
            showNotification(`⚠️ Failed to extract "${title || url}": ${error.message}`, 'warning');
            continue;
          } finally {
            setExtractingAudioId(null);
            setExtractingSongName(null);
          }
        }

        addSong({
          title: title || `Song ${addedCount + 1}`,
          url: url || undefined,
          artist: artist || undefined,
          duration: duration || undefined,
        });
        addedCount++;
      }

      showNotification(`✅ Added ${addedCount} song${addedCount !== 1 ? 's' : ''} from ${file.name}`, 'success');
    } catch (error: any) {
      showNotification(`❌ Failed to read ${file.name}: ${error.message}`, 'error');
    }
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setIsModalOpen(true);
  };

  const handleRemoveSong = (id: string) => {
    // Cleanup audio if playing
    const audio = audioRefs.current.get(id);
    if (audio) {
      audio.pause();
      audio.src = '';
      audioRefs.current.delete(id);
    }
    if (playingSongId === id) {
      setPlayingSongId(null);
    }
    removeSong(id);
  };

  // Initialize Google Drive service
  useEffect(() => {
    googleDriveService.initialize().catch(console.error);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderSongs(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < playlist.length - 1) {
      reorderSongs(index, index + 1);
    }
  };

  // Helper function for error descriptions
  const getErrorDescription = (code: number): string => {
    const errorMessages: Record<number, string> = {
      1: 'MEDIA_ERR_ABORTED - The user aborted the load',
      2: 'MEDIA_ERR_NETWORK - A network error occurred',
      3: 'MEDIA_ERR_DECODE - The audio could not be decoded',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Audio format not supported',
    };
    return errorMessages[code] || 'Unknown error';
  };

  const handlePreview = async (song: Song) => {
    if (!song.url) {
      showNotification('No URL available for this song', 'warning');
      return;
    }

    const songIndex = playlist.findIndex(s => s.id === song.id);
    const audio = audioRefs.current.get(song.id);
    
    if (audio) {
      if (playingSongId === song.id) {
        // Pause current song
        wasPlayingRef.current = true;
        audio.pause();
        setSongTimes(prev => {
          const newMap = new Map(prev);
          newMap.set(song.id, audio.currentTime);
          return newMap;
        });
        setPlayingSongId(null);
        
        // Show feedback popup on pause
        if (songIndex !== -1) {
          setPauseTimestamp({ songIndex, timestamp: audio.currentTime });
          setShowFeedbackPopup(true);
        }
      } else {
        // Stop all other songs and reset their times
        audioRefs.current.forEach((a, id) => {
          if (id !== song.id) {
            a.pause();
            a.currentTime = 0;
            setSongTimes(prev => {
              const newMap = new Map(prev);
              newMap.set(id, 0);
              return newMap;
            });
          }
        });
        // Play this song
        wasPlayingRef.current = true;
        
        // Add timeupdate listener if not already added
        const existingListeners = (audio as any)._timeUpdateHandler;
        if (!existingListeners) {
          const handleTimeUpdate = () => {
            if (audio && !audio.paused && playingSongId === song.id) {
              setSongTimes(prev => {
                const newMap = new Map(prev);
                newMap.set(song.id, audio.currentTime);
                return newMap;
              });
            }
          };
          audio.addEventListener('timeupdate', handleTimeUpdate);
          (audio as any)._timeUpdateHandler = handleTimeUpdate;
        }
        
        audio.play().catch((playError) => {
          console.error('Play error:', playError);
          let errorMessage = `Cannot play audio for "${song.title}". `;
          
          if (playError?.name === 'NotAllowedError') {
            errorMessage += 'Audio playback was blocked. Please interact with the page first, then try again.';
          } else if (playError?.name === 'NotSupportedError') {
            errorMessage += 'Audio format not supported. Try a different file format.';
          } else {
            errorMessage += 'Please check the URL and ensure the audio file is accessible.';
          }
          
          showNotification(errorMessage, 'error');
          setPlayingSongId(null);
        });
        setPlayingSongId(song.id);
        setSongTimes(prev => {
          const newMap = new Map(prev);
          newMap.set(song.id, audio.currentTime || 0);
          return newMap;
        });
      }
    } else {
      // Validate and prepare URL
      let audioUrl = song.url.trim();
      
      // Check if it's a YouTube or Suno URL - extract audio automatically
      if (isYouTubeUrl(audioUrl) || isSunoUrl(audioUrl)) {
        setExtractingAudioId(song.id);
        setExtractingSongName(song.title);
        showNotification(`🎵 Extracting audio for "${song.title}"... This may take a moment.`, 'info');
        
        try {
          const extractionResult = await audioExtractionService.extractAudioFromYouTube(audioUrl);
          
          // Update the song with extracted audio URL
          // Note: We'll use the extracted URL for playback, but keep original URL in song data
          audioUrl = extractionResult.audioUrl;
          
          showNotification(`✅ Audio extracted: ${extractionResult.title}`, 'success');
        } catch (error: any) {
          showNotification(
            `❌ Failed to extract audio for "${song.title}": ${error.message}. Please try again or use a direct audio URL.`,
            'error',
            8000
          );
          setExtractingAudioId(null);
          setExtractingSongName(null);
          return;
        } finally {
          setExtractingAudioId(null);
          setExtractingSongName(null);
        }
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
      
      // Set up CORS for cross-origin requests
      newAudio.crossOrigin = 'anonymous';
      newAudio.preload = 'metadata';
      
      // Track time updates - use closure to capture song.id
      const songId = song.id;
      const handleTimeUpdate = () => {
        const audio = audioRefs.current.get(songId);
        if (audio && !audio.paused) {
          // Only update if this song is currently playing
          setSongTimes(prev => {
            const newMap = new Map(prev);
            newMap.set(songId, audio.currentTime);
            return newMap;
          });
        }
      };
      
      // Enhanced error handling
      const handleError = (e?: any) => {
        if (newAudio.error) {
          console.error('Audio error:', newAudio.error.code, getErrorDescription(newAudio.error.code));
        }
        
        let userMessage = `Failed to load audio for "${song.title}". `;
        
        if (song.url && isYouTubeUrl(song.url)) {
          userMessage += 'YouTube URLs are not supported. Please convert to a direct audio URL first.';
        } else if (audioUrl.includes('drive.google.com')) {
          userMessage += 'Make sure the Google Drive file is publicly accessible or try converting it to a direct download link.';
        } else if (!audioUrl.startsWith('http')) {
          userMessage += 'URL must start with http:// or https://';
        } else {
          userMessage += 'Please check if the URL is valid and accessible. The server may require CORS headers.';
        }
        
        showNotification(userMessage, 'error');
        console.error('Audio load error:', newAudio.error || e, 'URL:', audioUrl);
        setPlayingSongId(null);
        setSongTimes(prev => {
          const newMap = new Map(prev);
          newMap.set(song.id, 0);
          return newMap;
        });
      };

      const handleLoadedMetadata = () => {
        console.log('Audio metadata loaded:', song.title, 'Duration:', newAudio.duration);
      };

      const handleCanPlay = () => {
        console.log('Audio can play:', song.title);
      };

      newAudio.addEventListener('timeupdate', handleTimeUpdate);
      newAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
      newAudio.addEventListener('canplay', handleCanPlay);
      newAudio.addEventListener('error', handleError);
      
      newAudio.addEventListener('ended', () => {
        setPlayingSongId(null);
        setSongTimes(prev => {
          const newMap = new Map(prev);
          newMap.set(song.id, 0);
          return newMap;
        });
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      });
      
      newAudio.addEventListener('pause', () => {
        if (playingSongId === song.id && wasPlayingRef.current) {
          // Show feedback popup on pause
          if (songIndex !== -1) {
            setPauseTimestamp({ songIndex, timestamp: newAudio.currentTime });
            setShowFeedbackPopup(true);
          }
        }
        wasPlayingRef.current = false;
      });
      
      newAudio.addEventListener('play', () => {
        wasPlayingRef.current = true;
        console.log('Audio started playing:', song.title);
      });
      
      // Set the source after setting up listeners
      newAudio.src = audioUrl;
      
      audioRefs.current.set(song.id, newAudio);
      
      // Stop all other songs
      audioRefs.current.forEach((a, id) => {
        if (id !== song.id) {
          a.pause();
          a.currentTime = 0;
        }
      });
      
      wasPlayingRef.current = true;
      
      // Set playing state first, then attempt to play
      setPlayingSongId(song.id);
      setSongTimes(prev => {
        const newMap = new Map(prev);
        newMap.set(song.id, 0);
        return newMap;
      });
      
      // Wait for metadata to load before playing
      const attemptPlay = () => {
        newAudio.play()
          .then(() => {
            console.log('Audio playback started:', song.title);
            setSongTimes(prev => {
              const newMap = new Map(prev);
              newMap.set(song.id, newAudio.currentTime || 0);
              return newMap;
            });
          })
          .catch((playError) => {
            console.error('Play error:', playError);
            let errorMessage = `Cannot play audio for "${song.title}". `;
            
            if (playError.name === 'NotAllowedError') {
              errorMessage += 'Audio playback was blocked. Please interact with the page first, then try again.';
            } else if (playError.name === 'NotSupportedError') {
              errorMessage += 'Audio format not supported. Try a different file format (MP3, WAV, etc.).';
            } else {
              errorMessage += 'Please check the URL and ensure the audio file is accessible.';
            }
            
            showNotification(errorMessage, 'error');
            setPlayingSongId(null);
          });
      };

      // Try to play immediately, or wait for canplay event
      if (newAudio.readyState >= 2) {
        // HAVE_CURRENT_DATA or higher
        attemptPlay();
      } else {
        newAudio.addEventListener('canplay', attemptPlay, { once: true });
        // Also try after a short delay as fallback
        setTimeout(() => {
          if (newAudio.readyState >= 2 && playingSongId !== song.id) {
            attemptPlay();
          }
        }, 500);
      }
    }
  };

  const handleStartReview = () => {
    if (playlist.length === 0) {
      showNotification('Please add songs to your playlist before starting review', 'warning');
      return;
    }
    setCurrentStep(3);
    showNotification('Review mode activated. Go to Timeline to add feedback!', 'success');
  };

  return (
    <div className="song-library">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Song Library</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleStartReview}>
            🎵 Start Review
          </Button>
          <div className="relative" ref={addMenuRef}>
            <Button onClick={() => setShowAddMenu(!showAddMenu)}>
              Add Song {showAddMenu ? '▲' : '▼'}
            </Button>
            {showAddMenu && (
<div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-visible max-h-none">
                <button
                  onClick={() => handleAddSong('link')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 first:rounded-t-md"
                >
                  1️⃣ Add Song from Link
                </button>
                <button
                  onClick={() => handleAddSong('csv')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  2️⃣ Add Songs from CSV/Excel
                </button>
                <button
                  onClick={() => handleAddSong('device')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 last:rounded-b-md"
                >
                  3️⃣ Add Songs from Device
                </button>
              </div>
            )}
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleCSVUpload(file);
                }
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {playlist.map((song, index) => {
          const songCurrentTime = songTimes.get(song.id) || 0;
          const isPlaying = playingSongId === song.id;
          const parseDuration = (durationStr: string): number => {
            const parts = durationStr.split(':');
            if (parts.length === 2) {
              return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
            return 0;
          };
          const songDuration = song.duration ? parseDuration(song.duration) : (audioRefs.current.get(song.id)?.duration || 0);
          
          return (
          <div key={song.id} className="flex items-center justify-between p-3 bg-gray-100 rounded">
            <div className="flex-1">
              {/* Timeline for each song */}
              {song.url && (
                <SongTimeline
                  currentTime={songCurrentTime}
                  duration={songDuration}
                  isPlaying={isPlaying}
                  onSeek={(time) => {
                    const audio = audioRefs.current.get(song.id);
                    if (audio) {
                      audio.currentTime = time;
                      setSongTimes(prev => {
                        const newMap = new Map(prev);
                        newMap.set(song.id, time);
                        return newMap;
                      });
                    }
                  }}
                />
              )}
              <h3 className="font-medium">
                {song.title}
                {extractingAudioId === song.id && extractingSongName && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">
                    (Extracting: {extractingSongName})
                  </span>
                )}
              </h3>
              {song.artist && <p className="text-sm text-gray-600">{song.artist}</p>}
              {song.duration && <p className="text-sm text-gray-500">{song.duration}</p>}
            </div>
            <div className="flex space-x-2">
              {extractingAudioId === song.id ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                  title={`Extracting audio for "${extractingSongName || song.title}"...`}
                >
                  ⏳ Extracting...
                </Button>
              ) : (
                song.url && (
                  <Button
                    size="sm"
                    variant={playingSongId === song.id ? "primary" : "secondary"}
                    onClick={() => handlePreview(song)}
                    disabled={extractingAudioId !== null}
                    title="Preview Audio"
                  >
                    {playingSongId === song.id ? '⏸️' : '▶️'}
                  </Button>
                )
              )}
              <Button size="sm" onClick={() => handleMoveUp(index)} disabled={index === 0} title="Move Up">
                ↑
              </Button>
              <Button size="sm" onClick={() => handleMoveDown(index)} disabled={index === playlist.length - 1} title="Move Down">
                ↓
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleEditSong(song)} title="Edit">
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleRemoveSong(song.id)} title="Remove">
                Remove
              </Button>
            </div>
          </div>
        );
        })}
        {playlist.length === 0 && (
          <p className="text-gray-500 text-center py-8">No songs in playlist. Add your first song!</p>
        )}
      </div>

      {/* Feedback Popup */}
      <FeedbackPopup
        isOpen={showFeedbackPopup}
        onClose={() => {
          setShowFeedbackPopup(false);
          setPauseTimestamp(null);
        }}
        songIndex={pauseTimestamp?.songIndex}
        timestamp={pauseTimestamp?.timestamp}
        onSaveToDrive={async (feedbackData) => {
          if (pauseTimestamp) {
            const song = playlist[pauseTimestamp.songIndex];
            const driveId = await googleDriveService.saveFeedback({
              title: feedbackData.title,
              text: feedbackData.text,
              songTitle: song.title,
              artist: song.artist,
              timestamp: pauseTimestamp.timestamp,
              songIndex: pauseTimestamp.songIndex,
              playlistLength: playlist.length,
            });

            if (driveId) {
              showNotification('Feedback saved to Google Drive!', 'success');
            } else {
              showNotification('Feedback saved locally (Google Drive not available)', 'info');
            }
          }
        }}
      />

      <SongInputModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSong(null);
        }}
        song={editingSong}
      />
    </div>
  );
};