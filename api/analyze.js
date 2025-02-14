require('dotenv').config();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const path = require('path');
const fetch = require('node-fetch');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/tiff',
            'image/x-tiff',
            'image/jpeg',
            'image/png'
        ];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(file.mimetype) || 
            ext === '.tif' || 
            ext === '.tiff') {
            if (ext === '.tif' || ext === '.tiff') {
                file.mimetype = 'image/tiff';
            }
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, TIFF, JPEG, and PNG files are allowed.'));
        }
    }
}).single('document');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function processDocument(fileBuffer, mimeType) {
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

    if (mimeType === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        requestData.contents[0].parts.push({
            text: pdfData.text
        });
    } else if (mimeType.startsWith('image/')) {
        const base64Image = fileBuffer.toString('base64');
        requestData.contents[0].parts.push({
            inline_data: {
                mime_type: mimeType,
                data: base64Image
            }
        });
    }

    try {
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

// Export the serverless function
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    return new Promise((resolve, reject) => {
        upload(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', err);
                resolve(res.status(400).json({ error: err.message }));
                return;
            }

            try {
                if (!req.file) {
                    resolve(res.status(400).json({ error: 'No file uploaded' }));
                    return;
                }

                const analysis = await processDocument(req.file.buffer, req.file.mimetype);
                resolve(res.status(200).json({ analysis }));
            } catch (error) {
                console.error('Processing error:', error);
                resolve(res.status(500).json({ error: error.message || 'Error processing document' }));
            }
        });
    });
}; 