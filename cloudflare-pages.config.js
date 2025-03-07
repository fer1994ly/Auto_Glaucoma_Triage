// CloudFlare Pages configuration
module.exports = {
  // The build output directory
  outputDirectory: "./public",
  
  // Site routing configuration
  routes: [
    // Serve all files in the public directory 
    { pattern: '/static/*', src: '/public/:splat*' },
    
    // Handle the analyze API endpoint with the Functions handler
    { pattern: '/functions/analyze', dest: '/functions/analyze.js' },
    
    // For any other route, serve the index.html file
    { pattern: '/*', src: '/public/index.html' }
  ]
}; 