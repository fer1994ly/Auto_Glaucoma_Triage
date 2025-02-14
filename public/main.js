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
        const allowedTypes = [
            'application/pdf',
            'image/tiff',
            'image/x-tiff',
            'image/jpeg',
            'image/png'
        ];
        
        // Validate file type
        const ext = file.name.split('.').pop().toLowerCase();
        const validType = allowedTypes.includes(file.type) || 
                         ['tif','tiff'].includes(ext);
        
        if (!validType) {
            alert('Please upload a PDF, TIFF, JPEG, or PNG file.');
            return;
        }

        // Validate file size
        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10MB limit');
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
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid response format from server');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Analysis failed');
            }

            if (!data.success || !data.analysis) {
                throw new Error('Invalid response data from server');
            }

            displayResults(data.analysis);
        } catch (error) {
            console.error('Error:', error);
            alert(`Processing failed: ${error.message}`);
            resultsSection.style.display = 'none';
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function displayResults(analysis) {
        if (!analysis) {
            throw new Error('No analysis data received');
        }

        // Parse the analysis text and extract relevant information
        const sections = analysis.split('\n').reduce((acc, line) => {
            const parts = line.split(':');
            if (parts.length < 2) return acc;

            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim();

            switch(key) {
                case 'Triage Priority':
                    acc.triagePriority = value;
                    break;
                case 'Appointment Type':
                    acc.appointmentType = value;
                    break;
                case 'Visual Field Test Requirement':
                    acc.visualFieldTest = value;
                    break;
                case 'Key Clinical Findings':
                    acc.clinicalFindings = value;
                    break;
                case 'Reasoning':
                    acc.reasoning = value;
                    break;
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