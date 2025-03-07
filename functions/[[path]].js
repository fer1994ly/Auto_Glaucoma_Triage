export async function onRequest(context) {
  // Get the requested pathname
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  // Directly return static files if they exist
  try {
    // First, try to serve the exact file
    return await context.env.ASSETS.fetch(context.request);
  } catch (e) {
    // If the file doesn't exist and it's not an API request, serve index.html
    if (!pathname.startsWith('/functions/')) {
      return context.env.ASSETS.fetch(
        new Request(`${url.origin}/index.html`, context.request)
      );
    }
    
    // If it's an API request but failed, return a 404
    return new Response("Not Found", { status: 404 });
  }
} 