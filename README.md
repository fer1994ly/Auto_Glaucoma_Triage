# Auto Glaucoma Triage

An automated glaucoma referral triage system using Gemini AI to analyze referral documents and provide triage recommendations.

## Features

- Upload PDF, TIFF, JPEG, or PNG documents for analysis
- AI-powered analysis of referral documents
- Triage priority recommendation (Urgent/Routine)
- Appointment type suggestion (Face-to-face/Virtual)
- Visual field test requirement assessment
- Key clinical findings extraction
- Reasoning for triage decisions

## Deployment Instructions for Cloudflare Pages

### Prerequisites

1. Cloudflare account
2. Google Gemini API key (https://ai.google.dev/)
3. Git repository with your code

### Steps to deploy

1. **Install Wrangler CLI** (if not already installed)
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Setup environment variables**
   
   Create a `.dev.vars` file for local development:
   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```
   
   Add the same variables in the Cloudflare Pages dashboard after deployment.

4. **Test locally**
   ```bash
   npm run dev
   ```

5. **Deploy to Cloudflare Pages**

   a. Connect your Git repository to Cloudflare Pages
   b. Configure the build settings:
      - Build command: `npm ci`
      - Build output directory: `public`
      - Root directory: `/`
   c. Add environment variables in the Cloudflare Pages dashboard
   d. Deploy!

## Local Development

1. Clone the repository
2. Install dependencies
   ```bash
   npm install
   ```
   
3. Create a `.dev.vars` file with your Google Gemini API key
   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```
   
4. Start the development server
   ```bash
   npm run dev
   ```
   
5. Open http://localhost:8788 in your browser

## Notes

- The application uses Cloudflare Pages Functions to process documents
- Maximum file size is determined by Cloudflare's limits (Up to 25MB)
- Processing time may vary depending on document size and complexity 