# Song Playlist Video Generator

A modern, Canva-style web application that creates seamless video playlists from your favorite songs with customizable playlist sidebar and post-generation editing capabilities.

## Features

✅ **Multiple Input Methods**
- Upload Excel/CSV files with song data
- Add songs via chat input interface
- Support for various column formats (title, artist, url, duration, etc.)

✅ **Advanced Audio Processing**
- Real-time audio download and ingestion
- Audio analysis for duration detection
- Seamless audio stitching with crossfade effects
- FFmpeg-powered processing for professional results

✅ **Video Generation**
- Customizable playlist sidebar visualization
- Currently playing song highlighting
- Professional video output with playlist overlay
- Real-time progress tracking

✅ **Post-Generation Editing**
- Edit song titles and URLs inline
- Reorder songs with drag-and-drop interface
- Remove songs from playlist
- Bulk edit operations
- Add new songs after generation

✅ **Canva-Style Interface**
- Modern top toolbar with logo and actions
- Left sidebar with tools and elements
- Main canvas workspace for playlist design
- Right panel for properties and settings
- Drag-and-drop functionality for songs
- Real-time preview and editing
- Professional design tools and customization options

## How to Use

1. **Select Tool from Sidebar**
   - **Upload Files**: Click the upload tool to drag & drop or browse for CSV/Excel files
   - **Add Songs**: Click the "Add Song" tool to open the song input interface

2. **Add Your Songs**
   - **Bulk Input**: Paste multiple songs (one per line) in format "Song Title | URL"
   - **Single Input**: Add songs one at a time with title and optional URL
   - **Auto-Preview**: See songs before adding them to your playlist

3. **Design Your Playlist**
   - Songs appear in the main canvas area as draggable tracks
   - Use the right panel to customize colors, fonts, and canvas size
   - Drag tracks to reorder them in the playlist

3. **Generate Video**
   - Click "Generate Video" in the top toolbar
   - Watch real-time progress as the app processes audio and creates video
   - Preview your playlist design before final generation

4. **Edit and Customize**
   - Use "Edit Mode" to modify playlist tracks inline
   - Add text elements and backgrounds using the design tools
   - Adjust styling properties in the right panel

## Supported File Formats

### Bulk Text Input (Recommended)
```
Song Title 1 | https://url1.mp3
Song Title 2 | https://url2.mp3
Song Title 3
Another Song | https://url4.mp3
```

### Single Song Input
- **Title**: Song Name (required)
- **URL**: https://example.com/song.mp3 (optional)

### CSV Format (File Upload)
```csv
title,url,duration
Bohemian Rhapsody,https://example.com/song1.mp3,5:55
Hotel California,https://example.com/song2.mp3,6:30
```

### Excel Format (File Upload)
- First row should contain headers (title, url, duration, etc.)
- Subsequent rows contain song data
- Supports various header names (song, track, etc.)

## Technical Implementation

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Audio Processing**: FFmpeg.wasm for client-side processing
- **File Parsing**: SheetJS for Excel support
- **Video Generation**: Canvas-based visualization with FFmpeg encoding

## Browser Compatibility

- Modern browsers with WebAssembly support
- Chrome 57+, Firefox 52+, Safari 11+, Edge 16+

## Development Notes

The application uses client-side processing to ensure privacy and avoid server costs. Audio files are processed locally in the browser using FFmpeg.wasm.

For production use, consider implementing:
- Server-side audio processing for large files
- User authentication and playlist saving
- Cloud storage integration for generated videos
- Batch processing capabilities

## License

This project is open source and available under the MIT License.