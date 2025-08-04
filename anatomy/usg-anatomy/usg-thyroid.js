document.addEventListener('DOMContentLoaded', function() {

    const protocolData = [
        {
            id: 1,
            name: 'Longitudinal Scan',
            videoSrc: 'thy-long.mp4',
            imageSrc: 'long-img.png', // Added the image source as requested
            mainDescription: 'A longitudinal view provides a long-axis image of the thyroid lobe. Select an option for specific protocols.',
            options: [
                {
                    type: 'static',
                    title: 'Static Images',
                    detailText: 'Acquire at least 3 grayscale images per lobe, capturing the <strong>lateral, mid, and medial</strong> portions.'
                },
                {
                    type: 'cine',
                    title: 'Cine Clip',
                    detailText: 'Perform a full sweep of the lobe from the <strong>medial to the lateral</strong> border to visualize the entire gland in motion.'
                }
            ]
        },
        {
            id: 2,
            name: 'Transverse Scan',
            videoSrc: 'thy-long.mp4', // Placeholder
            imageSrc: 'long-img.png', // Placeholder
            mainDescription: 'A transverse view provides a short-axis image of the thyroid lobe. Select an option for specific protocols.',
            options: [
                {
                    type: 'static',
                    title: 'Static Images',
                    detailText: 'Acquire at least 3 grayscale images per lobe, capturing the <strong>superior, mid, and inferior</strong> portions.'
                },
                {
                    type: 'cine',
                    title: 'Cine Clip',
                    detailText: 'Perform a full sweep of the lobe from the <strong>superior to the inferior</strong> border.'
                }
            ]
        },
        // ... (other steps)
        { id: 3, name: 'Lobe Measurements', videoSrc: '', imageSrc: '', mainDescription: 'Accurate measurements are crucial for assessing gland size.', options: [ { type: 'info', title: 'Measurement Protocol', detailText: '<strong>Width & AP Diameter:</strong> Use the transverse view. <strong>Length:</strong> Use the longitudinal view.' } ] },
        { id: 4, name: 'Isthmus Scan', videoSrc: '', imageSrc: '', mainDescription: 'The isthmus connects the two lobes.', options: [ { type: 'info', title: 'Isthmus Protocol', detailText: 'A transverse grayscale image is taken through the isthmus.' } ] }
    ];

    let activeStepIndex = 0;
    let activeOptionType = null;

    const protocolChecklist = document.getElementById('protocol-checklist');
    const displayPanel = document.getElementById('display-panel');

    function renderProtocolList() {
        let listItemsHTML = '';
        protocolData.forEach((step, index) => {
            const isActive = index === activeStepIndex;
            listItemsHTML += `
                <li data-index="${index}" class="flex items-center justify-between p-4 rounded-lg cursor-pointer ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-indigo-50'} group">
                    <div class="flex items-center">
                        <span class="flex items-center justify-center w-6 h-6 mr-4 text-sm font-bold rounded-full ring-2 ${isActive ? 'ring-indigo-300 text-white' : 'ring-gray-300 text-indigo-600'}">
                            ${step.id}
                        </span>
                        <span class="font-semibold">${step.name}</span>
                    </div>
                    <i data-feather="chevron-right" class="${isActive ? 'text-white' : 'text-gray-400'}"></i>
                </li>
            `;
        });
        protocolChecklist.innerHTML = listItemsHTML;
        feather.replace();
    }
    
    function renderDisplayPanel() {
        const step = protocolData[activeStepIndex];

        let optionsButtonsHTML = '';
        step.options.forEach(option => {
            const isOptionActive = option.type === activeOptionType;
            optionsButtonsHTML += `
                <div data-type="${option.type}" class="p-4 rounded-lg border cursor-pointer ${isOptionActive ? 'bg-indigo-100 border-indigo-500' : 'bg-gray-50 hover:border-indigo-400'}">
                    <h3 class="font-bold text-gray-800 pointer-events-none">${option.title}</h3>
                </div>
            `;
        });

        let infoText = step.mainDescription;
        if (activeOptionType) {
            infoText = step.options.find(opt => opt.type === activeOptionType)?.detailText || step.mainDescription;
        }

        // --- NEW: Build the composite visual area ---
        let visualHTML = `
            <div class="flex flex-col h-full w-full gap-4">
                <div class="h-3/5 bg-black rounded-lg flex items-center justify-center text-white p-2">
                    ${step.videoSrc ? `
                        <video key="${Date.now()}" class="w-full h-full" autoplay muted playsinline>
                            <source src="${step.videoSrc}" type="video/mp4">
                        </video>` : `(No Video)`}
                </div>
                <div class="h-2/5 bg-gray-100 rounded-lg flex items-center justify-center p-2">
                    ${step.imageSrc ? `
                        <img src="${step.imageSrc}" alt="${step.name} illustration" class="max-h-full max-w-full object-contain">` : `(No Image)`}
                </div>
            </div>
        `;

        displayPanel.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6 w-full h-full">
                <div id="visual-content" class="w-full md:w-3/5">
                    ${visualHTML}
                </div>
                <div class="w-full md:w-2/5 flex flex-col gap-4">
                    <div id="info-panel" class="p-4 bg-gray-50 rounded-lg border flex-grow">
                        <h3 class="font-bold text-lg mb-2">${step.name}</h3>
                        <p class="text-gray-700">${infoText}</p>
                    </div>
                    <div class="flex flex-col gap-4">
                        ${optionsButtonsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    protocolChecklist.addEventListener('click', function(e) {
        const listItem = e.target.closest('li');
        if (!listItem) return;
        const index = parseInt(listItem.dataset.index);
        if (index !== activeStepIndex) {
            activeStepIndex = index;
            activeOptionType = null;
            renderProtocolList();
            renderDisplayPanel();
        }
    });

    displayPanel.addEventListener('click', function(e) {
        const optionButton = e.target.closest('[data-type]');
        if (!optionButton) return;
        activeOptionType = optionButton.dataset.type;
        renderDisplayPanel();
    });
    
    renderProtocolList();
    renderDisplayPanel();
});
