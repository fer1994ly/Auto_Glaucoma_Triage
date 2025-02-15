document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const resultContainer = document.getElementById('result-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const uploadIcon = document.getElementById('upload-icon');

    // Drag and drop handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('border-blue-600');
    }

    function unhighlight(e) {
        dropZone.classList.remove('border-blue-600');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        handleFiles(files);
    }

    fileInput.addEventListener('change', function(e) {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
                uploadFile(file);
            } else {
                showError('Please upload a PDF document or image file.');
            }
        }
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        showLoading();

        try {
            const response = await fetch('/.netlify/functions/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                showResult(data.analysis);
            } else {
                showError(data.error || 'An error occurred while processing the document.');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('An error occurred while uploading the file. Please try again.');
        } finally {
            hideLoading();
        }
    }

    function showLoading() {
        loadingSpinner.classList.remove('hidden');
        uploadIcon.classList.add('hidden');
        resultContainer.innerHTML = '';
        resultContainer.classList.add('hidden');
    }

    function hideLoading() {
        loadingSpinner.classList.add('hidden');
        uploadIcon.classList.remove('hidden');
    }

    function showResult(analysis) {
        resultContainer.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <h3 class="text-xl font-bold mb-4">Analysis Results</h3>
                <div class="whitespace-pre-wrap font-mono text-sm">${analysis}</div>
            </div>
        `;
        resultContainer.classList.remove('hidden');
    }

    function showError(message) {
        resultContainer.innerHTML = `
            <div class="bg-red-50 p-6 rounded-lg shadow-lg">
                <h3 class="text-xl font-bold text-red-700 mb-2">Error</h3>
                <p class="text-red-600">${message}</p>
            </div>
        `;
        resultContainer.classList.remove('hidden');
    }
}); 