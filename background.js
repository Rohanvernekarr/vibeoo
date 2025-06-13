class VideoAnalyzer {
    constructor() {
      this.GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Replace with your key
      this.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // Replace with your key
      this.GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
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
        // Step 1: Get video transcript
        const transcript = await this.getVideoTranscript(videoData.videoId);
        
        // Step 2: Generate summary with AI
        const summary = await this.generateAISummary(videoData, transcript);
        
        // Step 3: Get related videos
        const relatedVideos = await this.getRelatedVideos(videoData);
        
        sendResponse({
          success: true,
          data: {
            summary: summary.summary,
            keyPoints: summary.keyPoints,
            relatedVideos: relatedVideos
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
        // Method 1: Try to get captions from YouTube API
        const captionsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${this.YOUTUBE_API_KEY}`
        );
        
        if (captionsResponse.ok) {
          const captionsData = await captionsResponse.json();
          if (captionsData.items && captionsData.items.length > 0) {
            // Get the first available caption track
            const captionId = captionsData.items[0].id;
            return await this.downloadCaption(captionId);
          }
        }
        
        // Method 2: Fallback to description-based analysis
        return this.extractContentFromDescription(videoId);
      } catch (error) {
        console.warn('Could not get transcript:', error);
        return null;
      }
    }
  
    async downloadCaption(captionId) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/captions/${captionId}?key=${this.YOUTUBE_API_KEY}`,
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
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${this.YOUTUBE_API_KEY}`
        );
        const data = await response.json();
        return data.items[0]?.snippet?.description || '';
      } catch (error) {
        console.error('Error getting video details:', error);
        return '';
      }
    }
  
    async generateAISummary(videoData, transcript) {
      const prompt = `
  Please analyze this YouTube video and provide a comprehensive summary:
  
  Title: ${videoData.title}
  Channel: ${videoData.channelName}
  Duration: ${videoData.duration}
  Description: ${videoData.description}
  ${transcript ? `Transcript: ${transcript.substring(0, 4000)}` : ''}
  
  Please provide:
  1. A concise summary (2-3 sentences)
  2. 3-5 key points or takeaways
  3. Main topics covered
  
  Format your response as JSON:
  {
    "summary": "Brief summary here",
    "keyPoints": ["point 1", "point 2", "point 3"],
    "topics": ["topic1", "topic2"]
  }
      `;
  
      try {
        const response = await fetch(`${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 500,
            }
          })
        });
  
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const content = data.candidates[0].content.parts[0].text;
          
          try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback parsing if no JSON found
            return this.parseGeminiResponse(content, videoData);
          } catch (parseError) {
            console.warn('JSON parsing failed, using fallback:', parseError);
            return this.parseGeminiResponse(content, videoData);
          }
        }
        
        throw new Error('Invalid response from Gemini API');
      } catch (error) {
        console.error('Error generating AI summary:', error);
        // Fallback summary
        return {
          summary: `This video titled "${videoData.title}" by ${videoData.channelName} covers various topics. Please check the video description for more details.`,
          keyPoints: [
            'Video analysis completed',
            'Check video description for details',
            'Duration: ' + videoData.duration
          ],
          topics: ['General']
        };
      }
    }
  
    parseGeminiResponse(content, videoData) {
      // Extract information from unstructured response
      const lines = content.split('\n').filter(line => line.trim());
      
      let summary = '';
      let keyPoints = [];
      let topics = [];
      
      // Try to extract summary (usually first few lines)
      const summaryLines = lines.slice(0, 3).join(' ');
      summary = summaryLines.length > 50 ? summaryLines.substring(0, 200) + '...' : 
                `This video "${videoData.title}" provides valuable insights on the topic.`;
      
      // Extract key points (look for bullet points or numbered items)
      for (const line of lines) {
        if (line.match(/^[\d\-\*•]/)) {
          keyPoints.push(line.replace(/^[\d\-\*•\s]+/, '').trim());
        }
      }
      
      if (keyPoints.length === 0) {
        keyPoints = [
          'Informative content provided',
          'Educational value present',
          'Worth watching for the topic'
        ];
      }
      
      return { summary, keyPoints: keyPoints.slice(0, 5), topics: ['General'] };
    }
  
    async getRelatedVideos(videoData) {
      try {
        // Search for related videos using YouTube API
        const searchQuery = encodeURIComponent(videoData.title.split(' ').slice(0, 3).join(' '));
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&maxResults=3&key=${this.YOUTUBE_API_KEY}`
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