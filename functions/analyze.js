// Needs to be as simple as possible for Cloudflare Pages compatibility
export async function onRequestPost(context) {
  try {
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
    
    // For testing purposes, return a mock successful response
    const mockAnalysis = `
      1. Triage Priority: Urgent
      2. Appointment Type: Face-to-face
      3. Visual Field Test Requirement: Required
      4. Key Clinical Findings:
         - Elevated IOP (28 mmHg right eye, 30 mmHg left eye)
         - Cup-to-disc ratio 0.7 in right eye, 0.8 in left eye
         - Family history of glaucoma
      5. Reasoning: The combination of elevated IOP and increased cup-to-disc ratio indicates advanced glaucomatous damage requiring urgent face-to-face evaluation.
    `;
    
    return new Response(
      JSON.stringify({ analysis: mockAnalysis }), 
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