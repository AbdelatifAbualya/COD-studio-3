export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Fireworks API key from environment variables
    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'FIREWORKS_API_KEY environment variable not set' 
      });
    }

    // Extract the request body
    const { model, messages, temperature, top_p, top_k, max_tokens, presence_penalty, frequency_penalty, stream, tools, tool_choice } = req.body;

    // Validate required fields
    if (!model || !messages) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Missing required fields: model and messages' 
      });
    }

    // Prepare the request to Fireworks API
    const fireworksPayload = {
      model,
      messages,
      temperature: temperature || 0.6,
      top_p: top_p || 1,
      top_k: top_k || 40,
      max_tokens: max_tokens || 4096,
      presence_penalty: presence_penalty || 0,
      frequency_penalty: frequency_penalty || 0,
      stream: stream || false
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      fireworksPayload.tools = tools;
      if (tool_choice) {
        fireworksPayload.tool_choice = tool_choice;
      }
    }

    const fireworksHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Handle streaming responses
    if (stream) {
      fireworksHeaders['Accept'] = 'text/event-stream';
      
      const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
        method: 'POST',
        headers: fireworksHeaders,
        body: JSON.stringify(fireworksPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fireworks API Error:', response.status, errorText);
        return res.status(response.status).json({ 
          error: 'API request failed',
          message: errorText 
        });
      }

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Pipe the streaming response
      response.body.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
        abort(err) {
          console.error('Stream aborted:', err);
          res.end();
        }
      }));

    } else {
      // Handle non-streaming responses
      const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
        method: 'POST',
        headers: fireworksHeaders,
        body: JSON.stringify(fireworksPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fireworks API Error:', response.status, errorText);
        return res.status(response.status).json({ 
          error: 'API request failed',
          message: errorText 
        });
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
