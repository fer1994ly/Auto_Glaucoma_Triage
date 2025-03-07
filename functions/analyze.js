// Use dynamic imports with try/catch for better error handling
let GoogleGenerativeAI, pdfParse, fetch;

try {
  const generativeAI = require('@google/generative-ai');
  GoogleGenerativeAI = generativeAI.GoogleGenerativeAI;
  pdfParse = require('pdf-parse');
  fetch = require('node-fetch');
} catch (error) {
  console.error('Error importing dependencies:', error);
}

// Process uploaded document
async function processDocument(fileBuffer, mimeType, apiKey) {
    if (!apiKey) {
        throw new Error('Google API key is not configured. Please set the GOOGLE_API_KEY environment variable.');
    }

    const systemPrompt = `Analyze this glaucoma referral document and provide a structured response with the following:
    1. Triage Priority: Urgent or Routine
    2. Appointment Type: Face-to-face or Virtual
    3. Visual Field Test Requirement: Required or Not Required (if already present in referral)
    4. Key Clinical Findings
    5. Reasoning for decisions
    
    Consider these factors:
    - IOP readings and their values
    - Cup-to-disc ratio
    - Visual field test results if present
    - Family history
    - Current medications
    - Symptoms
    Do not use markdown in your response.
    Note: Face-to-face appointments are mandatory if gonioscopy is needed.`;

    let requestData = {
        contents: [{
            parts: []
        }]
    };

    // Add the system prompt as the first part
    requestData.contents[0].parts.push({
        text: systemPrompt
    });

    // For PDF files, we can extract text using a different approach in Cloudflare
    // For now, we'll just send the raw PDF or image data as base64
    const base64Data = fileBuffer.toString('base64');
    
    if (mimeType === 'application/pdf') {
        // Send the PDF as text content (Gemini can process PDFs in base64)
        requestData.contents[0].parts.push({
            inline_data: {
                mime_type: mimeType,
                data: base64Data
            }
        });
    } else if (mimeType.startsWith('image/')) {
        // For images, we send as inline data
        requestData.contents[0].parts.push({
            inline_data: {
                mime_type: mimeType,
                data: base64Data
            }
        });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API Error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Invalid response format from Gemini API');
        }
    } catch (error) {
        console.error('Error processing document:', error);
        throw error;
    }
}

export async function onRequestPost(context) {
    try {
        if (!GoogleGenerativeAI || !pdfParse || !fetch) {
            return new Response(
                JSON.stringify({ error: 'Required dependencies not available' }), 
                { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const formData = await context.request.formData();
        const file = formData.get('document');
        
        if (!file) {
            return new Response(
                JSON.stringify({ error: 'No file uploaded' }), 
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'image/tiff',
            'image/x-tiff',
            'image/jpeg',
            'image/png'
        ];

        if (!allowedTypes.includes(file.type)) {
            return new Response(
                JSON.stringify({ error: 'Invalid file type. Only PDF, TIFF, JPEG, and PNG files are allowed.' }), 
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Get file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Directly process the file with Google Gemini API
        const analysis = await processDocument(arrayBuffer, file.type, context.env.GOOGLE_API_KEY);
        
        return new Response(
            JSON.stringify({ analysis }), 
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('Error processing document:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Error processing document' }), 
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
} 