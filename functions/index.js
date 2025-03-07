// Default handler to serve static files
export function onRequest(context) {
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/index.html"
    }
  });
} 