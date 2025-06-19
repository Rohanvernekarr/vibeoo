// background.js - Service worker for YouTube Video Summarizer

// Configuration - Add your API keys here
const CONFIG = {
  // Replace these with your actual API keys
  GEMINI_API_KEY: '',
  YOUTUBE_API_KEY: '',
  
  // API endpoints
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  YOUTUBE_API_BASE: 'https://www.googleapis.com/youtube/v3',
  
  // Extension settings
  MAX_SUMMARY_LENGTH: 2000,
  MAX_TIMESTAMPS: 10,
  TIMESTAMP_THRESHOLD: 30, // seconds between timestamps
  
  // UI settings
  POPUP_WIDTH: 700,
  POPUP_HEIGHT: 600
};

class VideoAnalyzer {
  constructor() {
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'summarizeVideo') {
        this.handleSummarizeVideo(request.videoData, sendResponse);
        return true; // Keep message channel open for async response
      }
    });
  }

  async handleSummarizeVideo(videoData, sendResponse) {
    try {
      console.log('Received video data:', videoData);
      
      // Use transcript from content script if available
      let transcript = videoData.transcript || '';
      let source = 'content_script';
      
      // If no transcript from content script, try API methods
      if (!transcript || transcript.length < 50) {
        console.log('No transcript from content script, trying API methods...');
        const transcriptData = await this.getVideoTranscript(videoData.videoId);
        transcript = transcriptData.transcript || '';
        source = transcriptData.source;
      }
      
      // Extract timestamps from transcript
      const timestamps = this.extractTimestamps(transcript);
      
      console.log('Final transcript length:', transcript.length);
      console.log('Timestamps found:', timestamps.length);
      
      // Generate AI summary with timestamps
      const summary = await this.generateAISummary(videoData, transcript, timestamps);
      
      // Get related videos
      const relatedVideos = await this.getRelatedVideos(videoData);
      
      sendResponse({
        success: true,
        data: {
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          timestamps: timestamps,
          topics: summary.topics,
          videoStructure: summary.videoStructure,
          keyTakeaways: summary.keyTakeaways,
          relatedVideos: relatedVideos,
          transcriptLength: transcript ? transcript.length : 0,
          transcriptSource: source,
          detailedTimestamps: summary.detailedTimestamps || []
        }
      });
    } catch (error) {
      console.error('Error processing video:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async getVideoTranscript(videoId) {
    try {
      console.log('Starting transcript extraction for video:', videoId);
      
      // Create basic video details from the videoId
      const videoDetails = {
        title: 'Video Analysis',
        channelName: 'Unknown Channel',
        description: '',
        duration: 'Unknown',
        tags: [],
        categoryId: 'Unknown'
      };
      
      let transcript = null;
      let source = 'none';
      
      // Method 1: Try to get captions from YouTube API (simplified)
      try {
        console.log('Attempting to get captions from YouTube API...');
        const captionsResponse = await fetch(
          `${CONFIG.YOUTUBE_API_BASE}/captions?part=snippet&videoId=${videoId}&key=${CONFIG.YOUTUBE_API_KEY}`
        );
        
        if (captionsResponse.ok) {
          const captionsData = await captionsResponse.json();
          console.log('Captions data received');
          
          if (captionsData.items && captionsData.items.length > 0) {
            const captionId = captionsData.items[0].id;
            transcript = await this.downloadCaption(captionId);
            source = 'captions';
            console.log('Captions extracted, length:', transcript ? transcript.length : 0);
          }
        } else {
          console.warn('Captions API response not ok:', captionsResponse.status);
        }
      } catch (error) {
        console.warn('Caption extraction failed:', error);
      }
      
      // Method 2: Try to get video details (simplified)
      if (!transcript || transcript.length < 100) {
        console.log('Attempting to get video details...');
        try {
          const detailsResponse = await fetch(
            `${CONFIG.YOUTUBE_API_BASE}/videos?part=snippet&id=${videoId}&key=${CONFIG.YOUTUBE_API_KEY}`
          );
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            if (detailsData.items && detailsData.items.length > 0) {
              const item = detailsData.items[0];
              transcript = `Video Title: ${item.snippet.title}\nChannel: ${item.snippet.channelTitle}\nDescription: ${item.snippet.description || 'No description available'}\nTags: ${item.snippet.tags ? item.snippet.tags.join(', ') : 'No tags'}`;
              source = 'description';
              console.log('Video details extracted, length:', transcript.length);
            }
          }
        } catch (error) {
          console.warn('Video details extraction failed:', error);
        }
      }
      
      // Method 3: Enhanced metadata extraction (always available)
      if (!transcript || transcript.length < 50) {
        console.log('Using enhanced metadata extraction...');
        transcript = this.createEnhancedMetadata(videoDetails);
        source = 'metadata';
        console.log('Enhanced metadata created, length:', transcript.length);
      }
      
      console.log('Final transcript source:', source, 'Length:', transcript ? transcript.length : 0);
      
      return { transcript, source, videoDetails };
    } catch (error) {
      console.error('Transcript extraction failed:', error);
      return { 
        transcript: 'Video content analysis available. The extension will analyze the video based on available information.', 
        source: 'fallback', 
        videoDetails: null 
      };
    }
  }

  createEnhancedMetadata(videoDetails) {
    if (!videoDetails) {
      return 'No video details available for analysis.';
    }
    
    let metadata = `Video Title: ${videoDetails.title}\n`;
    metadata += `Channel: ${videoDetails.channelName}\n`;
    metadata += `Duration: ${videoDetails.duration}\n`;
    metadata += `View Count: ${videoDetails.viewCount || 'Unknown'}\n`;
    metadata += `Like Count: ${videoDetails.likeCount || 'Unknown'}\n`;
    metadata += `Comment Count: ${videoDetails.commentCount || 'Unknown'}\n`;
    metadata += `Category: ${videoDetails.categoryId || 'Unknown'}\n`;
    
    if (videoDetails.description) {
      metadata += `\nDescription:\n${videoDetails.description}\n`;
    }
    
    if (videoDetails.tags && videoDetails.tags.length > 0) {
      metadata += `\nTags: ${videoDetails.tags.join(', ')}\n`;
    }
    
    // Add context based on title analysis
    const title = videoDetails.title.toLowerCase();
    if (title.includes('tutorial') || title.includes('how to')) {
      metadata += `\nContent Type: Tutorial/How-to video\n`;
      metadata += `Expected Content: Step-by-step instructions, demonstrations, explanations\n`;
    } else if (title.includes('review') || title.includes('test')) {
      metadata += `\nContent Type: Review/Testing video\n`;
      metadata += `Expected Content: Product analysis, testing results, comparisons\n`;
    } else if (title.includes('process') || title.includes('workflow')) {
      metadata += `\nContent Type: Process/Workflow video\n`;
      metadata += `Expected Content: Detailed process explanation, workflow demonstration\n`;
    } else if (title.includes('client') || title.includes('project')) {
      metadata += `\nContent Type: Client/Project video\n`;
      metadata += `Expected Content: Project walkthrough, client work demonstration\n`;
    }
    
    return metadata;
  }

  async getVideoDetails(videoId) {
    try {
      const response = await fetch(
        `${CONFIG.YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${CONFIG.YOUTUBE_API_KEY}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('YouTube API Error:', errorData);
        
        if (errorData.error && errorData.error.message.includes('API keys are not supported')) {
          throw new Error('YouTube API key configuration issue. Please check your API key setup.');
        }
        
        throw new Error(`YouTube API Error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          title: item.snippet.title,
          channelName: item.snippet.channelTitle,
          description: item.snippet.description,
          duration: item.contentDetails.duration,
          tags: item.snippet.tags || [],
          categoryId: item.snippet.categoryId,
          viewCount: item.statistics.viewCount,
          likeCount: item.statistics.likeCount,
          commentCount: item.statistics.commentCount
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting video details:', error);
      throw error;
    }
  }

  async getVideoComments(videoId) {
    try {
      const response = await fetch(
        `${CONFIG.YOUTUBE_API_BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&key=${CONFIG.YOUTUBE_API_KEY}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('YouTube Comments API Error:', errorData);
        return '';
      }
      
      const data = await response.json();
      
      if (data.items) {
        return data.items.map(item => item.snippet.topLevelComment.snippet.textDisplay).join('\n');
      }
      return '';
    } catch (error) {
      console.error('Error getting comments:', error);
      return '';
    }
  }

  async downloadCaption(captionId) {
    try {
      const response = await fetch(
        `${CONFIG.YOUTUBE_API_BASE}/captions/${captionId}?key=${CONFIG.YOUTUBE_API_KEY}`,
        { headers: { 'Accept': 'text/plain' } }
      );
      return await response.text();
    } catch (error) {
      console.error('Error downloading caption:', error);
      return null;
    }
  }

  async extractContentFromDescription(videoId) {
    try {
      const response = await fetch(
        `${CONFIG.YOUTUBE_API_BASE}/videos?part=snippet&id=${videoId}&key=${CONFIG.YOUTUBE_API_KEY}`
      );
      const data = await response.json();
      return data.items[0]?.snippet?.description || '';
    } catch (error) {
      console.error('Error getting video details:', error);
      return '';
    }
  }

  extractTimestamps(transcript) {
    if (!transcript) return [];
    
    const timestamps = [];
    const lines = transcript.split('\n');
    
    for (const line of lines) {
      // Match timestamp patterns like [00:00] or 00:00 or 0:00
      const timestampMatch = line.match(/(?:\[?)(\d{1,2}):(\d{2})(?:\]?)/);
      if (timestampMatch) {
        const minutes = parseInt(timestampMatch[1]);
        const seconds = parseInt(timestampMatch[2]);
        const totalSeconds = minutes * 60 + seconds;
        
        // Extract text after timestamp
        const text = line.replace(/^\[?\d{1,2}:\d{2}\]?\s*/, '').trim();
        
        if (text && text.length > 10) { // Only include meaningful content
          timestamps.push({
            time: totalSeconds,
            displayTime: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
          });
        }
      }
    }
    
    // Sort by time and remove duplicates
    const uniqueTimestamps = timestamps
      .sort((a, b) => a.time - b.time)
      .filter((timestamp, index, array) => {
        if (index === 0) return true;
        return timestamp.time - array[index - 1].time >= CONFIG.TIMESTAMP_THRESHOLD;
      })
      .slice(0, CONFIG.MAX_TIMESTAMPS);
    
    return uniqueTimestamps;
  }

  async generateAISummary(videoData, transcript, timestamps) {
    const prompt = `You are an expert video analyst. Analyze this YouTube video and provide a comprehensive summary.

VIDEO INFORMATION:
Title: ${videoData.title}
Channel: ${videoData.channelName}
Duration: ${videoData.duration}
URL: ${videoData.url}

VIDEO TRANSCRIPT/CONTENT:
${transcript}

AVAILABLE TIMESTAMPS:
${timestamps.map(t => `${t.time} - ${t.text}`).join('\n')}

Please provide a detailed analysis in the following JSON format:

{
  "summary": "A comprehensive 2-3 paragraph summary of the main content and key points discussed in the video",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "videoStructure": "Overview of how the video is organized (introduction, main sections, conclusion)",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "detailedTimestamps": [
    {
      "time": "00:00",
      "title": "Introduction",
      "description": "What happens in this section"
    }
  ]
}

IMPORTANT GUIDELINES:
1. Base your analysis on the actual transcript/content provided, not just the title
2. If transcript is short or unavailable, use the description and other available information
3. Extract meaningful timestamps that highlight key moments
4. Focus on the actual content discussed, not just metadata
5. Provide actionable insights and key learnings
6. Structure the response in a way that helps viewers understand the video efficiently

Respond only with valid JSON.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
      
      // Try to parse JSON response
      try {
        const parsedResponse = JSON.parse(responseText);
        return parsedResponse;
      } catch (parseError) {
        console.warn('Failed to parse JSON response, using fallback format');
        return {
          summary: responseText,
          keyPoints: ['Content analysis available'],
          topics: ['Video content'],
          videoStructure: 'Content analyzed from transcript',
          keyTakeaways: ['See summary for details'],
          detailedTimestamps: timestamps.map(t => ({
            time: t.time,
            title: t.text.substring(0, 50),
            description: t.text
          }))
        };
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw error;
    }
  }

  async getRelatedVideos(videoData) {
    try {
      // Search for related videos using YouTube API
      const searchQuery = encodeURIComponent(videoData.title.split(' ').slice(0, 3).join(' '));
      const response = await fetch(
        `${CONFIG.YOUTUBE_API_BASE}/search?part=snippet&q=${searchQuery}&type=video&maxResults=3&key=${CONFIG.YOUTUBE_API_KEY}`
      );

      const data = await response.json();
      
      if (data.items) {
        return data.items.map(item => ({
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium.url,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          duration: 'N/A' // Would need additional API call to get duration
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting related videos:', error);
      return [
        {
          title: 'Related videos will appear here',
          channel: 'Enable API access',
          thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiB2aWV3Qm94PSIwIDAgMTIwIDkwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iOTAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=',
          url: '#',
          duration: 'N/A'
        }
      ];
    }
  }
}

// Initialize the analyzer
new VideoAnalyzer();
