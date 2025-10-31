interface GoogleDriveConfig {
  apiKey?: string;
  clientId?: string;
}

class GoogleDriveService {
  private apiKey?: string;
  private clientId?: string;
  private accessToken?: string;
  private isInitialized = false;

  async initialize(config?: GoogleDriveConfig): Promise<void> {
    if (this.isInitialized) return;

    this.apiKey = config?.apiKey || process.env.VITE_GOOGLE_DRIVE_API_KEY;
    this.clientId = config?.clientId || process.env.VITE_GOOGLE_DRIVE_CLIENT_ID;

    // Load Google Drive API
    if (typeof window !== 'undefined' && !(window as any).gapi) {
      await this.loadGoogleAPI();
    }

    this.isInitialized = true;
  }

  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('client:auth2', () => {
          resolve();
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async authenticate(): Promise<boolean> {
    if (!this.clientId) {
      console.warn('Google Drive Client ID not configured');
      return false;
    }

    try {
      const gapi = (window as any).gapi;
      if (!gapi) {
        console.error('Google API not loaded');
        return false;
      }

      await gapi.client.init({
        clientId: this.clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
      });

      const authInstance = gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      this.accessToken = user.getAuthResponse().access_token;
      return true;
    } catch (error) {
      console.error('Google Drive authentication failed:', error);
      return false;
    }
  }

  async saveFeedback(feedbackData: {
    title: string;
    text: string;
    songTitle: string;
    artist?: string;
    timestamp: number;
    songIndex: number;
    playlistLength: number;
  }): Promise<string | null> {
    if (!this.accessToken && !(await this.authenticate())) {
      console.warn('Failed to authenticate with Google Drive');
      return null;
    }

    try {
      const gapi = (window as any).gapi;
      if (!gapi || !gapi.client) {
        console.error('Google API client not available');
        return null;
      }

      // Create a JSON file with feedback data
      const fileName = `Feedback_${feedbackData.songTitle}_${Date.now()}.json`;
      const fileContent = JSON.stringify({
        feedback: feedbackData,
        createdAt: new Date().toISOString(),
      }, null, 2);

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
      };

      const file = new Blob([fileContent], { type: 'application/json' });
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload to Google Drive: ${response.statusText}`);
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Failed to save feedback to Google Drive:', error);
      // Return null but don't throw - app should continue working
      return null;
    }
  }

  async saveFeedbackBatch(feedbacks: Array<{
    title: string;
    text: string;
    songTitle: string;
    timestamp: number;
  }>): Promise<string | null> {
    if (!this.accessToken && !(await this.authenticate())) {
      console.warn('Failed to authenticate with Google Drive');
      return null;
    }

    try {
      const fileName = `Playlist_Feedback_${new Date().toISOString().split('T')[0]}.json`;
      const fileContent = JSON.stringify({
        feedbacks,
        createdAt: new Date().toISOString(),
      }, null, 2);

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
      };

      const file = new Blob([fileContent], { type: 'application/json' });
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload to Google Drive: ${response.statusText}`);
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Failed to save feedback batch to Google Drive:', error);
      return null;
    }
  }
}

export const googleDriveService = new GoogleDriveService();

