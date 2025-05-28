// api/chat.js - Vercel Serverless Function
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment variables (server-side only)
  const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
  
  if (!FIREWORKS_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Forward the request to Fireworks AI
    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIREWORKS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    // Handle streaming responses
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Pipe the stream directly
      response.body.pipe(res);
    } else {
      // Handle regular JSON response
      const data = await response.json();
      res.status(response.status).json(data);
    }
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'API request failed' });
  }
}
