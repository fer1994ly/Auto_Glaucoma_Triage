// Default handler to serve static files
export async function onRequest(context) {
  // Extract URL from the request
  const url = new URL(context.request.url);
  let path = url.pathname;
  
  // If requesting the root path, serve index.html
  if (path === '/') {
    return context.env.ASSETS.fetch(new Request('https://example.com/public/index.html', {
      headers: context.request.headers
    }));
  }
  
  // For all other paths, try to serve from the public directory
  try {
    // This uses the static assets handler to serve files from the public directory
    const response = await context.env.ASSETS.fetch(new Request(`https://example.com/public${path}`, {
      headers: context.request.headers
    }));
    
    // If the response is not OK, fall back to index.html for client-side routing
    if (!response.ok) {
      return context.env.ASSETS.fetch(new Request('https://example.com/public/index.html', {
        headers: context.request.headers
      }));
    }
    
    return response;
  } catch (e) {
    // If anything goes wrong, serve index.html
    return context.env.ASSETS.fetch(new Request('https://example.com/public/index.html', {
      headers: context.request.headers
    }));
  }
} 