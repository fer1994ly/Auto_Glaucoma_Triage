require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Configure multer for file upload
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
        // Check file extension as well for TIFF files
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(file.mimetype) || 
            ext === '.tif' || 
            ext === '.tiff') {
            // For TIFF files, override the mimetype
            if (ext === '.tif' || ext === '.tiff') {
                file.mimetype = 'image/tiff';
            }
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, TIFF, JPEG, and PNG files are allowed.'));
        }
    }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI('AIzaSyAg4HnknP0qh74ysNmr_t8rnnTSokT8trg');

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

    // Add the system prompt as the first part
    requestData.contents[0].parts.push({
        text: systemPrompt
    });

    // Process different file types
    if (mimeType === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        requestData.contents[0].parts.push({
            text: pdfData.text
        });
    } else if (mimeType.startsWith('image/')) {
        // For images, we need to convert to base64
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
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyAg4HnknP0qh74ysNmr_t8rnnTSokT8trg',
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

app.post('/analyze', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const analysis = await processDocument(req.file.buffer, req.file.mimetype);
        res.json({ analysis });
    } catch (error) {
        console.error('Error processing document:', error);
        res.status(500).json({ error: error.message || 'Error processing document' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 