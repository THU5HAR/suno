import express from 'express';
import ytdl from '@distube/ytdl-core';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';

const router = express.Router();

/**
 * GET /api/extract-audio?url=<video_url>
 * Extract audio stream URL from various platforms (YouTube, Suno, etc.)
 * Returns a direct audio stream URL that can be used for playback/download
 */
router.get('/', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const normalizedUrl = url.trim().toLowerCase();

    // Route to appropriate extractor based on URL
    if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
      return await extractFromYouTube(req, res, url);
    } else if (normalizedUrl.includes('suno.com') || normalizedUrl.includes('suno.ai')) {
      return await extractFromSuno(req, res, url);
    } else {
      return res.status(400).json({ 
        error: 'Unsupported URL. Currently supports YouTube and Suno.com URLs.' 
      });
    }
  } catch (error) {
    console.error('Audio extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract audio',
      details: error.message 
    });
  }
});

/**
 * Extract audio from YouTube
 */
async function extractFromYouTube(req, res, url) {
  try {
    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log(`Extracting audio from YouTube URL: ${url}`);

    // Get video info first
    let videoInfo;
    try {
      videoInfo = await ytdl.getInfo(url);
    } catch (error) {
      console.error('Failed to get video info:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch video information',
        details: error.message 
      });
    }

    // Get the best audio format
    const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
    
    if (audioFormats.length === 0) {
      return res.status(500).json({ error: 'No audio format available for this video' });
    }

    // Prefer formats with audio codec (m4a, webm, etc.)
    const bestAudioFormat = audioFormats.find(f => f.hasAudio && !f.hasVideo) || audioFormats[0];

    // Return the direct audio URL and metadata
    return res.json({
      success: true,
      audioUrl: bestAudioFormat.url,
      title: videoInfo.videoDetails.title,
      author: videoInfo.videoDetails.author?.name || videoInfo.videoDetails.author?.channel || 'Unknown',
      duration: parseInt(videoInfo.videoDetails.lengthSeconds) || 0,
      thumbnail: videoInfo.videoDetails.thumbnails?.[0]?.url || null,
      videoId: videoInfo.videoDetails.videoId,
      format: {
        container: bestAudioFormat.container,
        codec: bestAudioFormat.audioCodec,
        bitrate: bestAudioFormat.audioBitrate,
        quality: bestAudioFormat.quality,
      },
    });
  } catch (error) {
    console.error('YouTube extraction error:', error);
    return res.status(500).json({ 
      error: 'Failed to extract audio from YouTube URL',
      details: error.message 
    });
  }
}

/**
 * Extract audio from Suno.com
 */
async function extractFromSuno(req, res, url) {
  try {
    console.log(`Extracting audio from Suno URL: ${url}`);

    // Extract song ID from URL
    const songIdMatch = url.match(/suno\.(com|ai)\/s\/([a-zA-Z0-9_-]+)/);
    if (!songIdMatch || !songIdMatch[2]) {
      return res.status(400).json({ error: 'Invalid Suno URL format' });
    }

    const songId = songIdMatch[2];

    // Fetch the Suno page to get audio URL
    // Suno typically embeds audio in the page, we need to extract it
    // Follow redirects to get the actual song page
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow', // Follow redirects
    });

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch Suno page: ${pageResponse.statusText}`);
    }

    const pageHtml = await pageResponse.text();
    
    // Extract song ID from final URL (after redirect)
    const finalUrl = pageResponse.url;
    const songIdFromUrl = finalUrl.match(/song\/([a-f0-9-]+)/i);
    const actualSongId = songIdFromUrl ? songIdFromUrl[1] : songId;

    // Try to extract audio URL from the page
    // Suno typically uses meta tags (og:audio) or direct audio URLs
    // Look for common patterns:
    // 1. Meta tags (og:audio) - most reliable
    // 2. JSON data in script tags
    // 3. Direct audio URLs in the HTML
    // 4. API endpoints

    // Method 1: Try to extract from meta tags (og:audio) - most reliable for Suno
    const ogAudioMatch = pageHtml.match(/<meta[^>]*property=["']og:audio["'][^>]*content=["']([^"']+)["']/i);
    if (ogAudioMatch && ogAudioMatch[1]) {
      const audioUrl = ogAudioMatch[1];
      // Extract title from og:title
      const ogTitleMatch = pageHtml.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      const title = ogTitleMatch ? ogTitleMatch[1] : 'Suno Song';
      
      return res.json({
        success: true,
        audioUrl: audioUrl,
        title: title,
        author: 'Suno',
        duration: 0,
        thumbnail: null,
        videoId: actualSongId,
        format: {
          container: audioUrl.includes('.m4a') ? 'm4a' : 'mp3',
          codec: 'mp3',
          bitrate: null,
          quality: null,
        },
      });
    }

    // Method 2: Try to find JSON data with audio URL
    const jsonMatch = pageHtml.match(/<script[^>]*>[\s\S]*?({[\s\S]*?"audio_url"[\s\S]*?})[\s\S]*?<\/script>/i);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        if (jsonData.audio_url || jsonData.audioUrl || jsonData.audio) {
          const audioUrl = jsonData.audio_url || jsonData.audioUrl || jsonData.audio;
          return res.json({
            success: true,
            audioUrl: audioUrl,
            title: jsonData.title || jsonData.name || 'Suno Song',
            author: jsonData.artist || jsonData.author || 'Unknown',
            duration: jsonData.duration || 0,
            thumbnail: jsonData.thumbnail || jsonData.image || null,
            videoId: songId,
            format: {
              container: 'mp3',
              codec: 'mp3',
              bitrate: null,
              quality: null,
            },
          });
        }
      } catch (e) {
        // JSON parsing failed, try other methods
      }
    }

    // Method 2: Try to find direct audio URLs in the HTML
    const audioUrlPatterns = [
      /"audio_url"\s*:\s*"([^"]+)"/i,
      /"audioUrl"\s*:\s*"([^"]+)"/i,
      /"audio"\s*:\s*"([^"]+)"/i,
      /https?:\/\/[^"'\s]+\.mp3[^"'\s]*/i,
      /https?:\/\/[^"'\s]+\.m4a[^"'\s]*/i,
    ];

    for (const pattern of audioUrlPatterns) {
      const match = pageHtml.match(pattern);
      if (match && match[1]) {
        const audioUrl = match[1].replace(/\\\//g, '/');
        if (audioUrl.startsWith('http')) {
          // Extract title from page
          const titleMatch = pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i) || 
                           pageHtml.match(/"title"\s*:\s*"([^"]+)"/i);
          const title = titleMatch ? titleMatch[1].trim() : 'Suno Song';

          return res.json({
            success: true,
            audioUrl: audioUrl,
            title: title,
            author: 'Suno',
            duration: 0,
            thumbnail: null,
            videoId: songId,
            format: {
              container: audioUrl.includes('.m4a') ? 'm4a' : 'mp3',
              codec: 'mp3',
              bitrate: null,
              quality: null,
            },
          });
        }
      }
    }

    // Method 4: Try Suno API endpoint (if available)
    // Suno might have an API endpoint like: https://studio-api.prod.suno.com/api/song/[id]
    try {
      // Try with actual song ID from redirect
      const apiUrl = `https://studio-api.prod.suno.com/api/song/${actualSongId}`;
      const apiResponse = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        if (apiData.audio_url || apiData.audioUrl || apiData.audio) {
          const audioUrl = apiData.audio_url || apiData.audioUrl || apiData.audio;
          return res.json({
            success: true,
            audioUrl: audioUrl,
            title: apiData.title || apiData.name || 'Suno Song',
            author: apiData.artist || apiData.author || 'Suno',
            duration: apiData.duration || 0,
            thumbnail: apiData.thumbnail || apiData.image || null,
            videoId: songId,
            format: {
              container: 'mp3',
              codec: 'mp3',
              bitrate: null,
              quality: null,
            },
          });
        }
      }
    } catch (apiError) {
      console.warn('Suno API method failed, trying alternative:', apiError.message);
    }

    // If all methods fail, return error
    return res.status(500).json({ 
      error: 'Could not extract audio URL from Suno page. The page structure may have changed.',
      details: 'Please try using a direct audio URL or contact support if this persists.'
    });
  } catch (error) {
    console.error('Suno extraction error:', error);
    return res.status(500).json({ 
      error: 'Failed to extract audio from Suno URL',
      details: error.message 
    });
  }
}

/**
 * GET /api/extract-audio/proxy?url=<audio_url>
 * Proxy audio file to avoid CORS issues
 * This is especially useful for Suno.com audio URLs that may have CORS restrictions
 */
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Audio URL is required' });
    }

    console.log(`Proxying audio from URL: ${url}`);

    // Fetch the audio file with proper headers
    const audioResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://suno.com/',
        'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5',
      },
    });

    if (!audioResponse.ok) {
      return res.status(audioResponse.status).json({ 
        error: 'Failed to fetch audio',
        details: audioResponse.statusText 
      });
    }

    // Get content type
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
    
    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Stream the audio to the client
    const audioBuffer = await audioResponse.arrayBuffer();
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('Audio proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to proxy audio',
        details: error.message 
      });
    }
  }
});

/**
 * POST /api/extract-audio/stream
 * Stream audio directly from YouTube (for download)
 * This endpoint streams the audio file to the client
 */
router.post('/stream', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log(`Streaming audio from YouTube URL: ${url}`);

    // Get video info
    let videoInfo;
    try {
      videoInfo = await ytdl.getInfo(url);
    } catch (error) {
      console.error('Failed to get video info:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch video information',
        details: error.message 
      });
    }

    // Get the best audio format
    const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
    
    if (audioFormats.length === 0) {
      return res.status(500).json({ error: 'No audio format available for this video' });
    }

    // Prefer m4a format for better compatibility, fallback to best available
    const bestAudioFormat = audioFormats.find(f => f.container === 'm4a' && f.hasAudio && !f.hasVideo) 
      || audioFormats.find(f => f.hasAudio && !f.hasVideo) 
      || audioFormats[0];

    // Create audio stream
    const audioStream = ytdl(url, {
      format: bestAudioFormat,
      quality: 'highestaudio',
    });

    // Set response headers
    const title = videoInfo.videoDetails.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const extension = bestAudioFormat.container || 'm4a';
    res.setHeader('Content-Type', `audio/${extension === 'm4a' ? 'mp4' : extension}`);
    res.setHeader('Content-Disposition', `attachment; filename="${title}.${extension}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream audio to client
    await pipeline(audioStream, res);
  } catch (error) {
    console.error('Audio streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to stream audio from YouTube',
        details: error.message 
      });
    }
  }
});

export default router;

