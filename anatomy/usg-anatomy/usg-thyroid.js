document.addEventListener('DOMContentLoaded', () => {
    const protocolSteps = [
        { id: 'longitudinal', title: 'Longitudinal Scan' },
        { id: 'transverse', title: 'Transverse Scan' },
        { id: 'measurements', title: 'Lobe Measurements' },
        { id: 'isthmus', title: 'Isthmus Scan' }
    ];

    const checklist = document.getElementById('protocol-checklist');
    const displayPanel = document.getElementById('display-panel');

    // Populate the checklist
    protocolSteps.forEach((step, index) => {
        const item = document.createElement('li');
        item.innerHTML = `
            <button data-step-id="${step.id}" class="w-full text-left flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors">
                <i data-feather="circle" class="w-5 h-5 mr-3 text-gray-400"></i>
                <span class="font-medium">${index + 1}. ${step.title}</span>
                <i data-feather="chevron-right" class="w-5 h-5 ml-auto text-gray-500"></i>
            </button>
        `;
        checklist.appendChild(item);
    });

    // Add click listeners to checklist buttons
    checklist.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            const stepId = button.dataset.stepId;
            showStepContent(stepId);

            // Update checklist styles
            checklist.querySelectorAll('button').forEach(btn => btn.classList.remove('rad-gradient', 'text-white'));
            button.classList.add('rad-gradient', 'text-white');
        });
    });

    // Function to show content for a specific step
    const showStepContent = (stepId) => {
        let content = '';
        switch (stepId) {
            case 'longitudinal':
                content = generateScanStepHTML(
                    'Longitudinal Scan',
                    'Place the probe with the marker oriented towards the patient\'s head. Scan each lobe completely from medial to lateral.',
                    'path/to/probe-longitudinal.png', // <-- REPLACE
                    'long'
                );
                break;
            case 'transverse':
                content = generateScanStepHTML(
                    'Transverse Scan',
                    'Rotate the probe 90 degrees, with the marker oriented to the patient\'s right. Scan each lobe from superior to inferior.',
                    'path/to/probe-transverse.png', // <-- REPLACE
                    'trans'
                );
                break;
            case 'measurements':
                content = `
                    <h3 class="text-2xl font-bold text-gray-900">Step 3: Lobe Measurements</h3>
                    <p class="mt-2 text-gray-600 mb-6">Accurate measurements are crucial for calculating volume. Perform them on mid-gland images.</p>
                    <div class="space-y-6">
                        <div>
                            <h4 class="font-semibold text-lg mb-2">Width (W) & Antero-Posterior (AP)</h4>
                            <p class="text-sm text-gray-500 mb-2">Measured on a <span class="font-bold">transverse</span> mid-gland image.</p>
                            <img src="path/to/measurement-trans.png" alt="Transverse measurement" class="rounded-lg shadow-md w-full">
                        </div>
                        <div>
                            <h4 class="font-semibold text-lg mb-2">Length (L)</h4>
                            <p class="text-sm text-gray-500 mb-2">Measured on a <span class="font-bold">longitudinal</span> mid-gland image.</p>
                            <img src="path/to/measurement-long.png" alt="Longitudinal measurement" class="rounded-lg shadow-md w-full">
                        </div>
                    </div>
                `;
                break;
            case 'isthmus':
                content = `
                    <h3 class="text-2xl font-bold text-gray-900">Step 4: Isthmus Scan</h3>
                    <p class="mt-2 text-gray-600 mb-6">Scan the isthmus in a transverse plane, measuring its AP thickness. The trachea should be centered.</p>
                    <img src="path/to/isthmus-measurement.png" alt="Isthmus measurement" class="rounded-lg shadow-md w-full">
                `;
                break;
        }
        displayPanel.innerHTML = content;
        feather.replace(); // Re-initialize icons if any are added dynamically
    };
    
    // Helper function to generate repetitive HTML for scan steps
    const generateScanStepHTML = (title, description, probeImgSrc, prefix) => `
        <h3 class="text-2xl font-bold text-gray-900">Step: ${title}</h3>
        <p class="mt-2 text-gray-600 mb-4">${description}</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-6">
            <div>
                <h4 class="font-semibold mb-2">Probe Position</h4>
                <img src="${probeImgSrc}" alt="Probe position for ${title}" class="rounded-lg shadow-md">
            </div>
            <div class="space-y-4">
                <button onclick="showSubContent('${prefix}-static')" class="w-full p-4 bg-gray-100 hover:bg-indigo-100 rounded-lg text-left transition-colors">
                    <h4 class="font-bold">Static Images</h4>
                    <p class="text-sm text-gray-600">View the required 3 grayscale images per lobe (lateral, mid, medial).</p>
                </button>
                <button onclick="showSubContent('${prefix}-cine')" class="w-full p-4 bg-gray-100 hover:bg-indigo-100 rounded-lg text-left transition-colors">
                    <h4 class="font-bold">Cine Clip</h4>
                    <p class="text-sm text-gray-600">Watch the sweep of the entire lobe.</p>
                </button>
            </div>
        </div>
        
        <div id="${prefix}-static" class="hidden sub-content mt-4">
            <h4 class="font-bold text-lg mb-2">Static Images</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><img src="path/to/${prefix}-medial.jpg" alt="Medial" class="rounded-lg"><p class="text-center text-sm mt-1">Medial</p></div>
                <div><img src="path/to/${prefix}-mid.jpg" alt="Mid" class="rounded-lg"><p class="text-center text-sm mt-1">Mid</p></div>
                <div><img src="path/to/${prefix}-lateral.jpg" alt="Lateral" class="rounded-lg"><p class="text-center text-sm mt-1">Lateral</p></div>
            </div>
        </div>

        <div id="${prefix}-cine" class="hidden sub-content mt-4">
            <h4 class="font-bold text-lg mb-2">Cine Clip</h4>
            <video controls class="w-full rounded-lg shadow-md">
                <source src="path/to/${prefix}-sweep.mp4" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
    `;

    // Make sub-content functions globally accessible
    window.showSubContent = (id) => {
        document.querySelectorAll('.sub-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    };

    // Initialize Feather Icons and show the first step
    feather.replace();
    document.querySelector('#protocol-checklist button').click();
});
