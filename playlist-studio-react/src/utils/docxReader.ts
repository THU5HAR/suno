/**
 * Utility to read text content from DOCX files
 * Uses mammoth library to convert DOCX to plain text
 */
export async function readDocxFile(file: File): Promise<string> {
  try {
    // Dynamic import to avoid issues if mammoth is not available
    const mammoth = await import('mammoth');
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Convert DOCX to text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    // Return the extracted text, trimmed
    return result.value.trim();
  } catch (error) {
    console.error('Error reading DOCX file:', error);
    throw new Error('Failed to read DOCX file. Please ensure it is a valid DOCX document.');
  }
}

