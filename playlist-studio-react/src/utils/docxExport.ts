// DOCX Export utility for feedback reports
export interface FeedbackItem {
  songTitle: string;
  artist?: string;
  timestamp: number;
  title: string;
  text: string;
}

export async function exportFeedbackToDocx(
  feedbackItems: FeedbackItem[],
  playlistName: string = 'Playlist'
): Promise<Blob> {
  // Dynamic import to avoid issues if docx is not available
  try {
    const docx = await import('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

    // Group feedback by song
    const feedbackBySong = feedbackItems.reduce((acc, feedback) => {
      const key = feedback.songTitle;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(feedback);
      return acc;
    }, {} as Record<string, FeedbackItem[]>);

    // Format timestamp
    const formatTimestamp = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `[${mins}:${secs.toString().padStart(2, '0')}]`;
    };

    // Create document sections
    const children: any[] = [
      new Paragraph({
        text: 'FEEDBACK REPORT',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: `Playlist: ${playlistName}`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Generated on: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`,
        spacing: { after: 600 },
      }),
    ];

    // Add feedback sections for each song
    Object.entries(feedbackBySong).forEach(([songTitle, items]) => {
      // Song header
      children.push(
        new Paragraph({
          text: songTitle,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      // Feedback items for this song
      items.forEach((feedback) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${formatTimestamp(feedback.timestamp)} `,
                bold: true,
                color: '0066CC',
              }),
              new TextRun({
                text: feedback.title,
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            text: feedback.text,
            spacing: { after: 300 },
          })
        );
      });
    });

    // If no feedback, add message
    if (feedbackItems.length === 0) {
      children.push(
        new Paragraph({
          text: 'No feedback items recorded.',
          spacing: { before: 400 },
        })
      );
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          children,
        },
      ],
    });

    // Generate blob
    const blob = await Packer.toBlob(doc);
    return blob;
  } catch (error) {
    // Fallback: Create a simple text document
    console.warn('DOCX library not available, creating text file instead:', error);
    const textContent = [
      'FEEDBACK REPORT',
      `\nPlaylist: ${playlistName}`,
      `Generated on: ${new Date().toLocaleDateString()}`,
      '\n',
    ];

    const feedbackBySong = feedbackItems.reduce((acc, feedback) => {
      const key = feedback.songTitle;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(feedback);
      return acc;
    }, {} as Record<string, FeedbackItem[]>);

    Object.entries(feedbackBySong).forEach(([songTitle, items]) => {
      textContent.push(`\n${songTitle}:`);
      items.forEach((feedback) => {
        const mins = Math.floor(feedback.timestamp / 60);
        const secs = Math.floor(feedback.timestamp % 60);
        textContent.push(`[${mins}:${secs.toString().padStart(2, '0')}] ${feedback.title}`);
        textContent.push(`  ${feedback.text}`);
      });
    });

    return new Blob([textContent.join('\n')], { type: 'text/plain' });
  }
}

export async function downloadFeedbackReport(
  feedbackItems: FeedbackItem[],
  playlistName: string = 'Playlist'
): Promise<void> {
  try {
    const blob = await exportFeedbackToDocx(feedbackItems, playlistName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Feedback_Report_${playlistName}_${Date.now()}.${blob.type.includes('word') ? 'docx' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export feedback report:', error);
    throw error;
  }
}

