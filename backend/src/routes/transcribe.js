import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

// Configure multer for file uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
});

/**
 * POST /api/transcribe
 * Transcribe audio file using Hugging Face's free Whisper API
 * This endpoint proxies requests to avoid CORS issues
 */
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioFile = req.file;
    console.log(`Transcribing audio file: ${audioFile.originalname}, size: ${audioFile.size} bytes`);

    // Create FormData for Hugging Face API
    const formData = new FormData();
    formData.append('file', audioFile.buffer, {
      filename: audioFile.originalname || 'audio.mp3',
      contentType: audioFile.mimetype || 'audio/mpeg',
    });

    // Try primary model: openai/whisper-base (free, no API key needed)
    const hfApiUrl = 'https://api-inference.huggingface.co/models/openai/whisper-base';
    
    let transcriptResponse;
    try {
      transcriptResponse = await fetch(hfApiUrl, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
      });
    } catch (fetchError) {
      console.error('Failed to fetch from Hugging Face:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to connect to transcription service',
        details: fetchError.message 
      });
    }

    // Handle model loading (503) or other errors
    if (transcriptResponse.status === 503) {
      const retryAfter = transcriptResponse.headers.get('Retry-After') || '10';
      return res.status(503).json({ 
        error: 'Model is loading',
        retryAfter: parseInt(retryAfter),
        message: `Please wait ${retryAfter} seconds and try again.`
      });
    }

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('Hugging Face API error:', transcriptResponse.status, errorText);
      
      // Try fallback model
      return await tryFallbackModel(formData, res);
    }

    const result = await transcriptResponse.json();
    
    // Extract text from response
    let transcribedText = '';
    let detectedLanguage = 'Unknown';
    
    if (typeof result === 'string') {
      transcribedText = result;
    } else if (result.text) {
      transcribedText = result.text;
      detectedLanguage = result.language || detectLanguageFromText(result.text);
    } else if (Array.isArray(result) && result.length > 0) {
      transcribedText = result.map((chunk) => 
        typeof chunk === 'string' ? chunk : (chunk.text || chunk.transcript || '')
      ).join(' ').trim();
      detectedLanguage = detectLanguageFromText(transcribedText);
    } else if (result.chunks && result.chunks.length > 0) {
      transcribedText = result.chunks.map((chunk) => chunk.text || chunk).join(' ');
      detectedLanguage = result.language || detectLanguageFromText(transcribedText);
    } else {
      // Try to extract any text from the response
      const jsonString = JSON.stringify(result);
      if (jsonString.includes('text')) {
        const textMatch = jsonString.match(/"text":\s*"([^"]+)"/);
        if (textMatch) {
          transcribedText = textMatch[1];
          detectedLanguage = detectLanguageFromText(transcribedText);
        } else {
          return res.status(500).json({ 
            error: 'Could not extract text from transcription response',
            rawResponse: jsonString.substring(0, 500)
          });
        }
      } else {
        return res.status(500).json({ 
          error: 'Unexpected response format from transcription API',
          rawResponse: jsonString.substring(0, 500)
        });
      }
    }

    res.json({
      text: transcribedText.trim(),
      language: detectedLanguage,
      confidence: 0.9,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ 
      error: 'Transcription failed',
      details: error.message 
    });
  }
});

/**
 * Try fallback model if primary fails
 */
async function tryFallbackModel(formData, res) {
  try {
    console.log('Trying fallback model: whisper-small');
    const altApiUrl = 'https://api-inference.huggingface.co/models/openai/whisper-small';
    
    const response = await fetch(altApiUrl, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (response.status === 503) {
      const retryAfter = response.headers.get('Retry-After') || '20';
      return res.status(503).json({ 
        error: 'Model is loading',
        retryAfter: parseInt(retryAfter),
        message: `Please wait ${retryAfter} seconds and try again.`
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: 'Transcription service unavailable',
        details: errorText.substring(0, 200)
      });
    }

    const result = await response.json();
    
    // Extract text from response
    let transcribedText = '';
    if (typeof result === 'string') {
      transcribedText = result;
    } else if (result.text) {
      transcribedText = result.text;
    } else if (Array.isArray(result) && result.length > 0) {
      transcribedText = result.map((chunk) => 
        typeof chunk === 'string' ? chunk : (chunk.text || '')
      ).join(' ').trim();
    } else {
      transcribedText = JSON.stringify(result).substring(0, 500);
    }
    
    return res.json({
      text: transcribedText.trim() || 'Transcription completed but text extraction failed',
      language: detectLanguageFromText(transcribedText),
      confidence: 0.85,
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Fallback transcription failed',
      details: error.message 
    });
  }
}

/**
 * Simple language detection from text (basic heuristic)
 */
function detectLanguageFromText(text) {
  if (!text) return 'Unknown';
  
  // Basic language detection based on character patterns
  const kannadaPattern = /[\u0C80-\u0CFF]/;
  const hindiPattern = /[\u0900-\u097F]/;
  const tamilPattern = /[\u0B80-\u0BFF]/;
  const teluguPattern = /[\u0C00-\u0C7F]/;
  
  if (kannadaPattern.test(text)) return 'Kannada';
  if (hindiPattern.test(text)) return 'Hindi';
  if (tamilPattern.test(text)) return 'Tamil';
  if (teluguPattern.test(text)) return 'Telugu';
  
  // Default to English if no Indian script detected
  return 'English';
}

export default router;

