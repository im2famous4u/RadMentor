document.addEventListener('DOMContentLoaded', function() {

    // --- Data for Each Protocol Step ---
    // The data structure is now updated to include detailed text for each option.
    const protocolData = [
        {
            id: 1,
            name: 'Longitudinal Scan',
            videoSrc: 'thy-long.mp4',
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
            videoSrc: 'thy-long.mp4', // Placeholder: Use your transverse video file here
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
        // ... (other steps can be detailed in the same way)
        {
            id: 3,
            name: 'Lobe Measurements',
            videoSrc: '', // No video for this step
            mainDescription: 'Accurate measurements are crucial for assessing gland size and monitoring changes.',
            options: [
                {
                    type: 'info',
                    title: 'Measurement Protocol',
                    detailText: 'Measurements are done in the mid-section. <strong>Width & AP Diameter:</strong> Use the transverse view. <strong>Length:</strong> Use the longitudinal view.'
                }
            ]
        },
        {
            id: 4,
            name: 'Isthmus Scan',
            videoSrc: '', // No video for this step
            mainDescription: 'The isthmus connects the two lobes and should be evaluated for any abnormalities.',
            options: [
                {
                    type: 'info',
                    title: 'Isthmus Protocol',
                    detailText: 'A transverse grayscale image is taken through the isthmus. AP thickness should be measured.'
                }
            ]
        }
    ];

    let activeStepIndex = 0;
    let activeOptionType = null;

    const protocolChecklist = document.getElementById('protocol-checklist');
    const displayPanel = document.getElementById('display-panel');

    // --- Function to Render the Left-Side Checklist ---
    function renderProtocolList() {
        // This function is the same as before.
        let listItemsHTML = '';
        protocolData.forEach((step, index) => {
            const isActive = index === activeStepIndex;
            const bgColor = isActive ? 'bg-indigo-600' : 'bg-gray-100';
            const textColor = isActive ? 'text-white' : 'text-gray-800';
            listItemsHTML += `
                <li data-index="${index}" class="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${bgColor} hover:bg-indigo-100 group">
                    <div class="flex items-center">
                        <span class="flex items-center justify-center w-6 h-6 mr-4 text-sm font-bold rounded-full ring-2 ${isActive ? 'ring-indigo-300' : 'ring-gray-300'} ${isActive ? 'text-white' : 'text-indigo-600'}">
                            ${step.id}
                        </span>
                        <span class="font-semibold ${textColor}">
                            ${step.name}
                        </span>
                    </div>
                    <i data-feather="chevron-right" class="${isActive ? 'text-white' : 'text-gray-400'} group-hover:text-gray-600"></i>
                </li>
            `;
        });
        protocolChecklist.innerHTML = listItemsHTML;
        feather.replace();
    }
    
    // --- Function to Render the Right-Side Display Panel ---
    function renderDisplayPanel() {
        const step = protocolData[activeStepIndex];

        // 1. Build the HTML for the option buttons
        let optionsButtonsHTML = '';
        step.options.forEach(option => {
            const isOptionActive = option.type === activeOptionType;
            optionsButtonsHTML += `
                <div data-type="${option.type}" class="p-4 rounded-lg border cursor-pointer transition-all ${isOptionActive ? 'bg-indigo-100 border-indigo-500' : 'bg-gray-50 hover:bg-indigo-50 hover:border-indigo-400'}">
                    <h3 class="font-bold text-gray-800 pointer-events-none">${option.title}</h3>
                </div>
            `;
        });

        // 2. Determine which text to show in the info panel
        let infoText = step.mainDescription;
        if (activeOptionType) {
            const selectedOption = step.options.find(opt => opt.type === activeOptionType);
            if (selectedOption) {
                infoText = selectedOption.detailText;
            }
        }

        // 3. Build the visual content (the video or a placeholder)
        let visualHTML = `<div class="bg-gray-200 h-full w-full flex items-center justify-center text-gray-500 rounded-lg"><p>(No visual for this step)</p></div>`;
        if (step.videoSrc) {
            visualHTML = `<video key="${Date.now()}" class="w-full h-full object-contain" autoplay muted playsinline><source src="${step.videoSrc}" type="video/mp4"></video>`;
        }

        // 4. Assemble the final HTML for the entire display panel
        displayPanel.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6 w-full h-full">
                <div id="visual-content" class="w-full md:w-3/5 bg-black rounded-lg flex items-center justify-center overflow-hidden">
                    ${visualHTML}
                </div>

                <div class="w-full md:w-2/5 flex flex-col gap-4">
                    <div id="info-panel" class="p-4 bg-white rounded-lg border flex-grow">
                        <p class="text-gray-700">${infoText}</p>
                    </div>
                    ${optionsButtonsHTML}
                </div>
            </div>
        `;
    }

    // --- Event Listeners ---
    // 1. For the main protocol list
    protocolChecklist.addEventListener('click', function(e) {
        const listItem = e.target.closest('li');
        if (!listItem) return;

        const index = parseInt(listItem.dataset.index);
        if (index !== activeStepIndex) {
            activeStepIndex = index;
            activeOptionType = null; // Reset the selected option when changing steps
            renderProtocolList();
            renderDisplayPanel();
        }
    });

    // 2. For the options inside the display panel
    displayPanel.addEventListener('click', function(e) {
        const optionButton = e.target.closest('[data-type]');
        if (!optionButton) return;
        
        activeOptionType = optionButton.dataset.type;
        
        // Simply re-render the display panel with the new active option
        renderDisplayPanel();
    });
    
    // --- Initial Load ---
    renderProtocolList();
    renderDisplayPanel();
});
