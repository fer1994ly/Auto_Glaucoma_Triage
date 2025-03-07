export async function onRequest(context) {
  // Get the requested pathname
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  // Special handling for /analyze endpoint which should be handled by analyze.js
  if (pathname === '/functions/analyze' && context.request.method === 'POST') {
    // Let the analyze.js function handle this
    return;
  }
  
  // For direct HTML access, serve the specific HTML file first
  if (pathname.endsWith('.html')) {
    try {
      // Try to serve the exact HTML file
      const response = await context.env.ASSETS.fetch(context.request);
      if (response.status === 200) {
        return response;
      }
    } catch (e) {
      // If error, fall back to index.html
      console.error('Error serving HTML file:', e);
    }
  }
  
  // For root path or any path not explicitly handled, serve index.html
  if (pathname === '/' || !pathname.includes('.')) {
    return context.env.ASSETS.fetch(
      new Request(`${url.origin}/index.html`, context.request)
    );
  }
  
  // For all other static assets, try to serve directly
  try {
    const response = await context.env.ASSETS.fetch(context.request);
    if (response.status === 200) {
      return response;
    }
  } catch (e) {
    console.error('Error serving static asset:', e);
  }
  
  // If we got here, return a 404
  return new Response("Not Found", { 
    status: 404,
    headers: { 'Content-Type': 'text/plain' }
  });
} 