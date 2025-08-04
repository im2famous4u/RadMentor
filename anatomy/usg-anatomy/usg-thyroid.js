document.addEventListener('DOMContentLoaded', function() {

    // --- Data for Each Protocol Step ---
    // We define all content here to keep it organized.
    const protocolData = [
        {
            id: 1,
            name: 'Longitudinal Scan',
            initialImage: 'image_065cfd.jpg', // The probe image you provided
            options: [
                {
                    type: 'static',
                    title: 'Static Images',
                    description: 'View the required 3 grayscale images per lobe (lateral, mid, and medial).'
                },
                {
                    type: 'cine',
                    title: 'Cine Clip',
                    description: 'Watch the sweep of the entire lobe from medial to lateral.',
                    videoSrc: 'thy-long.mp4'
                }
            ]
        },
        {
            id: 2,
            name: 'Transverse Scan',
            initialImage: 'image_065cfd.jpg', // Placeholder: Use a different image for transverse
            options: [
                {
                    type: 'static',
                    title: 'Static Images',
                    description: 'View the required 3 grayscale images per lobe (superior, mid, and inferior).'
                },
                {
                    type: 'cine',
                    title: 'Cine Clip',
                    description: 'Watch the sweep of the entire lobe from superior to inferior.',
                    videoSrc: 'thy-long.mp4' // Placeholder: Use a transverse video
                }
            ]
        },
        {
            id: 3,
            name: 'Lobe Measurements',
            initialImage: 'image_065cfd.jpg', // Placeholder: Use measurement image
            options: [
                {
                    type: 'info',
                    title: 'Measurement Protocol',
                    description: 'Measurements are done in the mid-section. <strong>Width & AP Diameter:</strong> Use the transverse view. <strong>Length:</strong> Use the longitudinal view.'
                }
            ]
        },
        {
            id: 4,
            name: 'Isthmus Scan',
            initialImage: 'image_065cfd.jpg', // Placeholder: Use isthmus image
            options: [
                {
                    type: 'info',
                    title: 'Isthmus Protocol',
                    description: 'A transverse grayscale image is taken through the isthmus. AP thickness should be measured.'
                }
            ]
        }
    ];

    let activeStepIndex = 0; // The first step is active by default

    const protocolChecklist = document.getElementById('protocol-checklist');
    const displayPanel = document.getElementById('display-panel');

    // --- Function to Render the Left-Side Checklist ---
    function renderProtocolList() {
        let listItemsHTML = '';
        protocolData.forEach((step, index) => {
            const isActive = index === activeStepIndex;
            const bgColor = isActive ? 'bg-indigo-600' : 'bg-gray-100';
            const textColor = isActive ? 'text-white' : 'text-gray-800';
            const ringColor = isActive ? 'ring-indigo-300' : 'ring-gray-300';
            const numberColor = isActive ? 'text-white' : 'text-indigo-600';
            const chevronColor = isActive ? 'text-white' : 'text-gray-400';

            listItemsHTML += `
                <li data-index="${index}" class="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${bgColor} hover:bg-indigo-100 group">
                    <div class="flex items-center">
                        <span class="flex items-center justify-center w-6 h-6 mr-4 text-sm font-bold rounded-full ring-2 ${ringColor} ${numberColor}">
                            ${step.id}
                        </span>
                        <span class="font-semibold ${textColor}">
                            ${step.name}
                        </span>
                    </div>
                    <i data-feather="chevron-right" class="${chevronColor} group-hover:text-gray-600"></i>
                </li>
            `;
        });
        protocolChecklist.innerHTML = listItemsHTML;
        feather.replace();
    }
    
    // --- Function to Render the Right-Side Display Panel ---
    function renderDisplayPanel() {
        const step = protocolData[activeStepIndex];

        // Build the buttons for the options (Static, Cine, etc.)
        let optionsHTML = '';
        step.options.forEach(option => {
            optionsHTML += `
                <div data-type="${option.type}" class="p-4 bg-gray-50 rounded-lg border hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all">
                    <h3 class="font-bold text-gray-800">${option.title}</h3>
                    <p class="text-sm text-gray-600 mt-1">${option.description}</p>
                </div>
            `;
        });
        
        // This is the new 2-column layout for the display panel
        displayPanel.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6 w-full h-full">
                <div id="visual-content" class="w-full md:w-3/5 bg-black rounded-lg flex items-center justify-center overflow-hidden">
                    <img src="${step.initialImage}" alt="${step.name}" class="max-w-full max-h-full object-contain">
                </div>

                <div class="w-full md:w-2/5 flex flex-col gap-4">
                    ${optionsHTML}
                </div>
            </div>
        `;
    }

    // --- Event Listeners ---

    // 1. Handle clicks on the main protocol list
    protocolChecklist.addEventListener('click', function(e) {
        const listItem = e.target.closest('li');
        if (!listItem) return;

        const index = parseInt(listItem.dataset.index);
        if (index !== activeStepIndex) {
            activeStepIndex = index;
            renderProtocolList();
            renderDisplayPanel();
        }
    });

    // 2. Handle clicks on the options (Static, Cine) inside the display panel
    displayPanel.addEventListener('click', function(e) {
        const optionButton = e.target.closest('[data-type]');
        if (!optionButton) return;

        const optionType = optionButton.dataset.type;
        const step = protocolData[activeStepIndex];
        const option = step.options.find(opt => opt.type === optionType);
        const visualContent = document.getElementById('visual-content');

        if (optionType === 'cine' && option.videoSrc) {
            // **FIX 1: VIDEO DOES NOT LOOP**
            // The `loop` attribute has been removed.
            visualContent.innerHTML = `
                <video class="w-full h-full object-contain" autoplay muted playsinline>
                    <source src="${option.videoSrc}" type="video/mp4">
                </video>
            `;
        } else if (optionType === 'static') {
            // For now, just show the initial image again.
            // You can change this to show specific static images.
            visualContent.innerHTML = `<img src="${step.initialImage}" alt="${step.name}" class="max-w-full max-h-full object-contain">`;
        }
    });

    // --- Initial Load ---
    renderProtocolList();
    renderDisplayPanel();

});
