require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const fetch = require('node-fetch');
const busboy = require('busboy');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Add error handling middleware
const handleError = (err) => {
    console.error('Error:', err);
    const errorMessage = err.message || 'Internal Server Error';
    const statusCode = err.status || 500;
    
    return {
        statusCode,
        body: JSON.stringify({
            error: errorMessage,
            status: statusCode,
            timestamp: new Date().toISOString()
        }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
    };
};

async function processDocument(fileBuffer, mimeType) {
    if (!fileBuffer || !mimeType) {
        throw new Error('Invalid file data');
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

    requestData.contents[0].parts.push({
        text: systemPrompt
    });

    try {
        if (mimeType === 'application/pdf') {
            const pdfData = await pdfParse(Buffer.from(fileBuffer));
            if (!pdfData || !pdfData.text) {
                throw new Error('Failed to extract text from PDF');
            }
            requestData.contents[0].parts.push({
                text: pdfData.text
            });
        } else if (mimeType.startsWith('image/')) {
            const base64Image = Buffer.from(fileBuffer).toString('base64');
            if (!base64Image) {
                throw new Error('Failed to convert image to base64');
            }
            requestData.contents[0].parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Image
                }
            });
        } else {
            throw new Error(`Unsupported file type: ${mimeType}`);
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
            throw new Error(errorData.error?.message || `Gemini API Error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid response format from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error processing document:', error);
        throw new Error(`Failed to process document: ${error.message}`);
    }
}

// Netlify function handler
exports.handler = async (event, context) => {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return handleError({ status: 405, message: 'Method not allowed' });
    }

    try {
        // Check if GEMINI_API_KEY is configured
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        return new Promise((resolve, reject) => {
            const bb = busboy({ headers: event.headers });
            let fileBuffer = null;
            let mimeType = null;

            bb.on('file', (name, file, info) => {
                const chunks = [];
                file.on('data', (data) => chunks.push(data));
                file.on('end', () => {
                    if (name === 'file') {
                        fileBuffer = Buffer.concat(chunks);
                        mimeType = info.mimeType;
                    }
                });
            });

            bb.on('finish', async () => {
                try {
                    if (!fileBuffer || !mimeType) {
                        throw new Error('No valid file uploaded');
                    }

                    const analysis = await processDocument(fileBuffer, mimeType);
                    
                    resolve({
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({ 
                            success: true,
                            analysis,
                            timestamp: new Date().toISOString()
                        })
                    });
                } catch (error) {
                    resolve(handleError(error));
                }
            });

            bb.on('error', (error) => {
                resolve(handleError(error));
            });

            const buffer = Buffer.from(event.body, 'base64');
            bb.end(buffer);
        });
    } catch (error) {
        return handleError(error);
    }
}; 