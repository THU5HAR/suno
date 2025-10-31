import React from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { calculateTotalDuration, formatDuration } from '@/utils/helpers';

export const ProjectSummary: React.FC = () => {
  const { playlist, feedback, assets, stepCompletion } = usePlaylist();

  const totalSongs = playlist.length;
  const totalFeedback = feedback.length;
  const totalAssets = assets.length;
  const completedSteps = Object.values(stepCompletion).filter(Boolean).length;
  const totalSteps = Object.keys(stepCompletion).length;

  const totalDuration = calculateTotalDuration(playlist);

  const stepNames = {
    1: 'Audio Selection',
    2: 'Audio Processing',
    3: 'Design',
    4: 'Review & Export',
  };

  return (
    <div className="project-summary">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Project Summary</h2>

        {/* Project Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{totalSongs}</div>
            <div className="text-sm text-blue-800">Songs</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{totalFeedback}</div>
            <div className="text-sm text-green-800">Feedback Items</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{totalAssets}</div>
            <div className="text-sm text-purple-800">Assets</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{formatDuration(totalDuration)}</div>
            <div className="text-sm text-orange-800">Total Duration</div>
          </div>
        </div>

        {/* Step Progress */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Step Progress</h3>
          <div className="space-y-3">
            {Object.entries(stepCompletion).map(([step, completed]) => (
              <div key={step} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3 ${completed ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {completed && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${completed ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    Step {step}: {stepNames[parseInt(step) as keyof typeof stepNames]}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {completed ? 'Completed' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Progress: {completedSteps} of {totalSteps} steps completed
          </div>
        </div>

        {/* Playlist Details */}
        {playlist.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Playlist</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {playlist.map((song, index) => (
                  <div key={song.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{song.title || 'Untitled'}</div>
                      {song.artist && <div className="text-gray-600 truncate">{song.artist}</div>}
                    </div>
                    <div className="text-gray-500 ml-4">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assets Summary */}
        {assets.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Assets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      {asset.type === 'image' && (
                        <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 7v10h16V7H4zm2 2h12v6H6V9z"/>
                        </svg>
                      )}
                      {asset.type === 'video' && (
                        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 3l14 9-14 9V3z"/>
                        </svg>
                      )}
                      {asset.type === 'audio' && (
                        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{asset.name}</div>
                      <div className="text-xs text-gray-500 uppercase">{asset.type}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Summary */}
        {feedback.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Recent Feedback</h3>
            <div className="space-y-3">
              {feedback.slice(0, 3).map((item) => (
                <div key={item.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-yellow-800">{item.title}</div>
                      <div className="text-sm text-yellow-700 mt-1">{item.text}</div>
                      <div className="text-xs text-yellow-600 mt-2">
                        Song #{item.songIndex + 1} • {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {feedback.length > 3 && (
                <div className="text-sm text-gray-500 text-center">
                  And {feedback.length - 3} more feedback items...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {playlist.length === 0 && feedback.length === 0 && assets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No project data yet</p>
            <p className="text-sm">Complete the previous steps to see your project summary</p>
          </div>
        )}
      </div>
    </div>
  );
};