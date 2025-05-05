// This API endpoint will receive and log middleware errors

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { error, url, timestamp } = req.body;
    
    // Log the error details
    console.error('Middleware Error:', {
      timestamp,
      url,
      error: error?.message || JSON.stringify(error),
      stack: error?.stack,
    });
    
    // You could also send this to a monitoring service or database

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error logging middleware error:', err);
    return res.status(500).json({ error: 'Failed to log error' });
  }
} 