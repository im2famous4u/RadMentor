document.addEventListener('DOMContentLoaded', function() {

    const protocolData = [
        {
            id: 1,
            name: 'Longitudinal Scan',
            shortDef: 'A longitudinal view provides a long-axis image of the thyroid lobe, essential for evaluating its length and overall morphology.',
            videoSrc: 'thy-long.mp4',
            imageSrc: 'long-img.png',
            options: [
                {
                    title: 'Static Images',
                    detailText: 'Acquire at least 3 grayscale images per lobe, capturing the <strong>lateral, mid, and medial</strong> portions.'
                },
                {
                    title: 'Cine Clip',
                    detailText: 'Perform a full sweep of the lobe from the <strong>medial to the lateral</strong> border to visualize the entire gland in motion.'
                }
            ]
        },
        {
            id: 2,
            name: 'Transverse Scan',
            shortDef: 'A transverse view provides a short-axis image, crucial for measuring width and depth, and assessing for nodules.',
            videoSrc: 'thy-long.mp4', // Placeholder
            imageSrc: 'long-img.png', // Placeholder
            options: [
                {
                    title: 'Static Images',
                    detailText: 'Acquire at least 3 grayscale images per lobe, capturing the <strong>superior, mid, and inferior</strong> portions.'
                },
                {
                    title: 'Cine Clip',
                    detailText: 'Perform a full sweep of the lobe from the <strong>superior to the inferior</strong> border.'
                }
            ]
        },
        { id: 3, name: 'Lobe Measurements', shortDef: 'Accurate measurements are crucial for assessing gland size and monitoring changes.', videoSrc: '', imageSrc: '', options: [ { title: 'Measurement Protocol', detailText: '<strong>Width & AP Diameter:</strong> Use the transverse view. <strong>Length:</strong> Use the longitudinal view.' } ] },
        { id: 4, name: 'Isthmus Scan', shortDef: 'The isthmus connects the two lobes and must be evaluated for any abnormalities or nodules.', videoSrc: '', imageSrc: '', options: [ { title: 'Isthmus Protocol', detailText: 'A transverse grayscale image is taken through the isthmus. AP thickness should be measured.' } ] }
    ];

    let activeStepIndex = 0;

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

        // --- NEW: Build the text block with definition first, then two boxes ---
        let textContentHTML = `
            <div class="bg-gray-50 p-6 rounded-lg h-full flex flex-col">
                <h3 class="font-bold text-xl mb-2">${step.name}</h3>
                <p class="text-gray-600 mb-6 pb-6 border-b">${step.shortDef}</p>
                <div class="space-y-4">
        `;
        step.options.forEach((option, index) => {
            textContentHTML += `
                <div class="bg-white p-4 rounded-lg border">
                    <h4 class="font-semibold text-gray-800">${option.title}</h4>
                    <p class="text-gray-600 mt-1 text-sm">${option.detailText}</p>
                </div>
            `;
        });
        textContentHTML += `</div></div>`;


        // --- NEW: Compact visuals with performance attributes ---
        let visualHTML = `
            <div class="flex flex-col h-full w-full gap-2">
                <div class="h-1/2 rounded-lg overflow-hidden bg-black">
                    ${step.videoSrc ? `
                        <video key="${step.videoSrc}" class="w-full h-full object-cover" autoplay muted playsinline preload="metadata">
                            <source src="${step.videoSrc}" type="video/mp4">
                        </video>` : `<div class="w-full h-full flex items-center justify-center text-white">(No Video)</div>`}
                </div>
                <div class="h-1/2 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    ${step.imageSrc ? `
                        <img src="${step.imageSrc}" alt="${step.name} illustration" class="max-h-full max-w-full object-contain" loading="lazy">` : `<div class="w-full h-full flex items-center justify-center text-gray-500">(No Image)</div>`}
                </div>
            </div>
        `;

        // Assemble the final layout
        displayPanel.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6 w-full h-full">
                <div class="w-full md:w-1/2">
                    ${visualHTML}
                </div>
                <div class="w-full md:w-1/2">
                    ${textContentHTML}
                </div>
            </div>
        `;
    }

    protocolChecklist.addEventListener('click', (e) => {
        const listItem = e.target.closest('li');
        if (listItem && parseInt(listItem.dataset.index) !== activeStepIndex) {
            activeStepIndex = parseInt(listItem.dataset.index);
            renderProtocolList();
            renderDisplayPanel();
        }
    });
    
    renderProtocolList();
    renderDisplayPanel();
});
