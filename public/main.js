document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsSection = document.getElementById('resultsSection');

    // The exact prompt for the AI model
    const aiPrompt = `Analyze this glaucoma referral document and provide a structured response with the following:
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
    
    Note: Face-to-face appointments are mandatory if gonioscopy is needed.`;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    // Handle file input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Click on drop zone triggers file input
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('highlight');
    }

    function unhighlight(e) {
        dropZone.classList.remove('highlight');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        const allowedTypes = ['application/pdf', 'image/tiff', 'image/jpeg', 'image/png'];
        
        if (!allowedTypes.includes(file.type)) {
            showNotification('Please upload a PDF, TIFF, JPEG, or PNG file.', 'error');
            return;
        }

        fileInfo.textContent = `Selected file: ${file.name}`;
        uploadFile(file);
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('prompt', aiPrompt); // Include the AI prompt in the request

        loadingSpinner.style.display = 'flex';
        resultsSection.style.display = 'none';

        try {
            // For demonstration purposes, use a mock response without calling the API
            // This makes the app work without requiring backend functionality
            showNotification('Processing document...', 'info');
            
            setTimeout(() => {
                // Using the defined AI prompt for mock analysis
                // This would be replaced with actual API call in production
                const mockAnalysis = `
1. Triage Priority: Urgent
2. Appointment Type: Face-to-face
3. Visual Field Test Requirement: Required
4. Key Clinical Findings:
   - Elevated IOP (28 mmHg right eye, 30 mmHg left eye)
   - Cup-to-disc ratio 0.7 in right eye, 0.8 in left eye
   - Family history of glaucoma
   - Visual field test shows significant peripheral vision loss
   - Patient reports headaches and blurred vision
5. Reasoning: The combination of elevated IOP, increased cup-to-disc ratio, and visual symptoms indicates advanced glaucomatous damage requiring urgent face-to-face evaluation. Gonioscopy is needed to evaluate angle structures.
                `;
                displayResults(mockAnalysis);
                showNotification('Analysis complete!', 'success');
            }, 2000); // Simulate 2-second delay
        } catch (error) {
            console.error('Error:', error);
            showNotification(error.message || 'Failed to analyze document. Please try again.', 'error');
        }
    }

    function displayResults(analysis) {
        // Hide loading spinner
        loadingSpinner.style.display = 'none';
        
        // Parse the analysis text
        const lines = analysis.trim().split('\n');
        let currentSection = '';
        
        // Find each section
        let triagePriority = 'Not specified';
        let appointmentType = 'Not specified';
        let visualFieldTest = 'Not specified';
        let clinicalFindings = [];
        let reasoning = 'Not specified';
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('1. Triage Priority:')) {
                triagePriority = trimmedLine.substring('1. Triage Priority:'.length).trim();
            } else if (trimmedLine.startsWith('2. Appointment Type:')) {
                appointmentType = trimmedLine.substring('2. Appointment Type:'.length).trim();
            } else if (trimmedLine.startsWith('3. Visual Field Test')) {
                visualFieldTest = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
            } else if (trimmedLine.startsWith('4. Key Clinical Findings')) {
                currentSection = 'findings';
            } else if (trimmedLine.startsWith('5. Reasoning:')) {
                currentSection = 'reasoning';
                reasoning = trimmedLine.substring('5. Reasoning:'.length).trim();
            } else if (currentSection === 'findings' && trimmedLine.startsWith('-')) {
                clinicalFindings.push(trimmedLine.substring(1).trim());
            } else if (currentSection === 'reasoning' && reasoning === 'Not specified') {
                reasoning = trimmedLine.trim();
            }
        }
        
        // Update the DOM with results
        document.getElementById('triagePriority').textContent = triagePriority;
        
        // Apply color-coding based on priority
        const priorityElement = document.getElementById('triagePriority');
        priorityElement.className = ''; // Reset classes
        if (triagePriority.toLowerCase().includes('urgent')) {
            priorityElement.classList.add('priority-urgent');
        } else {
            priorityElement.classList.add('priority-routine');
        }
        
        document.getElementById('appointmentType').textContent = appointmentType;
        document.getElementById('visualFieldTest').textContent = visualFieldTest;
        
        // Display clinical findings as bullet points
        const findingsElement = document.getElementById('clinicalFindings');
        if (clinicalFindings.length > 0) {
            const ul = document.createElement('ul');
            clinicalFindings.forEach(finding => {
                const li = document.createElement('li');
                li.textContent = finding;
                ul.appendChild(li);
            });
            findingsElement.innerHTML = '';
            findingsElement.appendChild(ul);
        } else {
            findingsElement.textContent = 'None specified';
        }
        
        document.getElementById('reasoning').textContent = reasoning;

        // Show results section with animation
        resultsSection.style.display = 'block';
        resultsSection.classList.add('fade-in');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Notification system
    function showNotification(message, type = 'info') {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-notification';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = function() {
            notification.remove();
        };
        notification.appendChild(closeBtn);
        
        // Add to document
        document.body.appendChild(notification);
        
        // Auto-remove after delay (except for errors)
        if (type !== 'error') {
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        }
    }
}); 