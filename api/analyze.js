require('dotenv').config();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const path = require('path');
const fetch = require('node-fetch');
const sharp = require('sharp');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Modify the upload configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/tiff',
            'image/x-tiff',
            'image/jpeg',
            'image/png'
        ];
        const ext = path.extname(file.originalname).toLowerCase();
        const validMime = allowedTypes.includes(file.mimetype);
        const validExt = ['.pdf','.tif','.tiff','.jpg','.jpeg','.png'].includes(ext);
        
        if (validMime || validExt) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, TIFF, JPEG, and PNG files are allowed.'));
        }
    }
}).single('document');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Add error handling middleware
const handleError = (err, req, res) => {
    console.error('Error:', err);
    const errorMessage = err.message || 'Internal Server Error';
    const statusCode = err.status || 500;
    
    // Ensure we're sending a proper JSON response
    res.status(statusCode).json({
        error: errorMessage,
        status: statusCode,
        timestamp: new Date().toISOString()
    });
};

async function processDocument(fileBuffer, mimeType) {
    if (!fileBuffer || !mimeType) {
        throw new Error('Invalid file data');
    }

    // Convert TIFF to PNG for better compatibility
    if (mimeType === 'image/tiff' || mimeType === 'image/x-tiff') {
        try {
            fileBuffer = await sharp(fileBuffer)
                .png()
                .toBuffer();
            mimeType = 'image/png';
        } catch (err) {
            console.error('TIFF conversion error:', err);
            throw new Error('Failed to process TIFF image: ' + err.message);
        }
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
            const pdfData = await pdfParse(fileBuffer);
            if (!pdfData || !pdfData.text) {
                throw new Error('Failed to extract text from PDF');
            }
            requestData.contents[0].parts.push({
                text: pdfData.text
            });
        } else if (mimeType.startsWith('image/')) {
            const base64Image = fileBuffer.toString('base64');
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

// Update serverless function handler
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return handleError({ status: 405, message: 'Method not allowed' }, req, res);
    }

    try {
        // Check if GEMINI_API_KEY is configured
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        // Handle file upload
        await new Promise((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) {
                    reject(new Error(`File upload failed: ${err.message}`));
                } else {
                    resolve();
                }
            });
        });

        if (!req.file) {
            throw new Error('No file uploaded');
        }

        // Process the document
        const analysis = await processDocument(req.file.buffer, req.file.mimetype);
        
        // Send successful response
        res.status(200).json({ 
            success: true,
            analysis,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleError(error, req, res);
    }
}; 