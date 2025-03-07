document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsSection = document.getElementById('resultsSection');

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
            alert('Please upload a PDF, TIFF, JPEG, or PNG file.');
            return;
        }

        fileInfo.textContent = `Selected file: ${file.name}`;
        uploadFile(file);
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('document', file);

        loadingSpinner.style.display = 'flex';
        resultsSection.style.display = 'none';

        try {
            const response = await fetch('/functions/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }

            const data = await response.json();
            displayResults(data.analysis);
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message || 'Failed to analyze document. Please try again.'}`);
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function displayResults(analysis) {
        // Parse the analysis text and extract relevant information
        const sections = analysis.split('\n').reduce((acc, line) => {
            if (line.includes('Triage Priority:')) {
                acc.triagePriority = line.split(':')[1].trim();
            } else if (line.includes('Appointment Type:')) {
                acc.appointmentType = line.split(':')[1].trim();
            } else if (line.includes('Visual Field Test Requirement:')) {
                acc.visualFieldTest = line.split(':')[1].trim();
            } else if (line.includes('Key Clinical Findings:')) {
                acc.clinicalFindings = line.split(':')[1].trim();
            } else if (line.includes('Reasoning:')) {
                acc.reasoning = line.split(':')[1].trim();
            }
            return acc;
        }, {});

        // Update the DOM with results
        document.getElementById('triagePriority').textContent = sections.triagePriority || 'Not specified';
        document.getElementById('appointmentType').textContent = sections.appointmentType || 'Not specified';
        document.getElementById('visualFieldTest').textContent = sections.visualFieldTest || 'Not specified';
        document.getElementById('clinicalFindings').textContent = sections.clinicalFindings || 'Not specified';
        document.getElementById('reasoning').textContent = sections.reasoning || 'Not specified';

        resultsSection.style.display = 'block';
    }
}); 