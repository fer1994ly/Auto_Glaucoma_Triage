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

    // Enhanced tracking of app state
    let appState = {
        isProcessing: false,
        hasResults: false,
        currentFile: null,
        fileProcessed: false
    };

    // Track drag events
    let dragCounter = 0;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Enhanced drag and drop experience
    document.body.addEventListener('dragenter', () => {
        dragCounter++;
        if (!appState.isProcessing) {
            document.body.classList.add('dragging');
        }
    });

    document.body.addEventListener('dragleave', () => {
        dragCounter--;
        if (dragCounter === 0) {
            document.body.classList.remove('dragging');
        }
    });

    document.body.addEventListener('drop', () => {
        dragCounter = 0;
        document.body.classList.remove('dragging');
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

    // Enhanced keyboard accessibility
    dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
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
        
        // Stop if already processing
        if (appState.isProcessing) {
            showNotification('Please wait until the current document is processed', 'warning');
            return;
        }
        
        const file = files[0];
        const allowedTypes = ['application/pdf', 'image/tiff', 'image/jpeg', 'image/png'];
        
        if (!allowedTypes.includes(file.type)) {
            showNotification('Please upload a PDF, TIFF, JPEG, or PNG file.', 'error');
            return;
        }

        // Update file info with additional details
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileInfo.innerHTML = `
            <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span class="font-medium">${file.name}</span>
                <span class="text-xs text-gray-500">(${fileSizeMB} MB)</span>
            </div>
        `;
        
        appState.currentFile = file;
        uploadFile(file);
    }

    async function uploadFile(file) {
        // Update app state
        appState.isProcessing = true;
        appState.fileProcessed = false;
        
        const formData = new FormData();
        formData.append('document', file);
        formData.append('prompt', aiPrompt); // Include the AI prompt in the request

        // Show loading spinner with progress indication
        loadingSpinner.style.display = 'flex';
        resultsSection.style.display = 'none';
        
        // Hide previous results if any
        if (appState.hasResults) {
            resultsSection.classList.remove('fade-in');
            resultsSection.classList.add('fade-out');
        }

        try {
            // For demonstration purposes, use a mock response without calling the API
            // This makes the app work without requiring backend functionality
            showNotification('Processing document...', 'info');
            
            // Update UI to show processing steps
            updateProcessingStatus('Analyzing document...');
            
            setTimeout(() => {
                updateProcessingStatus('Extracting clinical data...');
                
                setTimeout(() => {
                    updateProcessingStatus('Determining recommendations...');
                    
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
                        appState.isProcessing = false;
                        appState.hasResults = true;
                        appState.fileProcessed = true;
                        
                        showNotification('Analysis complete!', 'success');
                    }, 800);
                }, 700);
            }, 500); // Simulate staged processing
        } catch (error) {
            console.error('Error:', error);
            appState.isProcessing = false;
            loadingSpinner.style.display = 'none';
            showNotification(error.message || 'Failed to analyze document. Please try again.', 'error');
        }
    }

    function updateProcessingStatus(message) {
        const spinnerText = document.querySelector('.spinner-text');
        if (spinnerText) {
            spinnerText.textContent = message;
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
        priorityElement.className = 'result-value'; // Reset classes
        if (triagePriority.toLowerCase().includes('urgent')) {
            priorityElement.classList.add('priority-urgent');
        } else {
            priorityElement.classList.add('priority-routine');
        }
        
        document.getElementById('appointmentType').textContent = appointmentType;
        document.getElementById('visualFieldTest').textContent = visualFieldTest;
        
        // Display clinical findings as bullet points with animated rendering
        const findingsElement = document.getElementById('clinicalFindings');
        if (clinicalFindings.length > 0) {
            const ul = document.createElement('ul');
            findingsElement.innerHTML = '';
            findingsElement.appendChild(ul);
            
            // Add items with a slight delay for visual effect
            clinicalFindings.forEach((finding, index) => {
                setTimeout(() => {
                    const li = document.createElement('li');
                    li.textContent = finding;
                    li.style.opacity = '0';
                    ul.appendChild(li);
                    
                    setTimeout(() => {
                        li.style.transition = 'opacity 0.3s ease';
                        li.style.opacity = '1';
                    }, 50);
                }, index * 100);
            });
        } else {
            findingsElement.textContent = 'None specified';
        }
        
        document.getElementById('reasoning').textContent = reasoning;

        // Show results section with enhanced animation
        resultsSection.style.display = 'block';
        resultsSection.classList.remove('fade-out');
        resultsSection.classList.add('fade-in');
        
        // Scroll to results with smooth animation
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        
        // Add "New Analysis" button for better UX
        addNewAnalysisButton();
    }
    
    function addNewAnalysisButton() {
        // Only add the button if it doesn't exist already
        if (!document.getElementById('newAnalysisBtn')) {
            const actionButtons = document.querySelector('.mt-4.sm\\:mt-6');
            if (actionButtons) {
                const newBtn = document.createElement('button');
                newBtn.id = 'newAnalysisBtn';
                newBtn.className = 'px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-100 rounded-lg';
                newBtn.innerHTML = `
                    <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                    </svg>
                    New Analysis
                `;
                newBtn.addEventListener('click', () => {
                    resetToUploadState();
                });
                
                actionButtons.appendChild(newBtn);
            }
        }
    }
    
    function resetToUploadState() {
        // Reset app state
        appState.hasResults = false;
        appState.currentFile = null;
        appState.fileProcessed = false;
        
        // Hide results and show upload
        resultsSection.style.display = 'none';
        fileInfo.innerHTML = '';
        
        // Scroll to upload area
        dropZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Focus on drop zone for accessibility
        setTimeout(() => {
            dropZone.focus();
        }, 500);
    }
    
    // Enhanced notification system
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
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        };
        notification.appendChild(closeBtn);
        
        // Add to document
        document.body.appendChild(notification);
        
        // Add accessibility attributes
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        
        // Auto-remove after delay (except for errors)
        if (type !== 'error') {
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        }
    }
    
    // Initial accessibility focus
    setTimeout(() => {
        dropZone.focus();
    }, 1000);
}); 