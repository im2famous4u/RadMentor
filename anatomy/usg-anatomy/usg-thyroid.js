document.addEventListener('DOMContentLoaded', function() {

    const protocolData = [
        {
            id: 1,
            name: 'Longitudinal Scan',
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
        // ... (other steps)
        { id: 3, name: 'Lobe Measurements', videoSrc: '', imageSrc: '', options: [ { title: 'Measurement Protocol', detailText: '<strong>Width & AP Diameter:</strong> Use the transverse view. <strong>Length:</strong> Use the longitudinal view.' } ] },
        { id: 4, name: 'Isthmus Scan', videoSrc: '', imageSrc: '', options: [ { title: 'Isthmus Protocol', detailText: 'A transverse grayscale image is taken through the isthmus.' } ] }
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

        // --- NEW: Build the static text block for the right column ---
        let textContentHTML = `<div class="bg-gray-50 p-6 rounded-lg h-full space-y-6">`;
        step.options.forEach((option, index) => {
            textContentHTML += `
                <div>
                    <h4 class="font-bold text-lg text-gray-800">Option ${index + 1} - ${option.title}</h4>
                    <p class="text-gray-600 mt-2">${option.detailText}</p>
                </div>
            `;
        });
        textContentHTML += `</div>`;


        // --- NEW: Build the visual area with NO BORDERS ---
        let visualHTML = `
            <div class="flex flex-col h-full w-full gap-4">
                <div class="h-3/5 rounded-lg overflow-hidden bg-black">
                    ${step.videoSrc ? `
                        <video key="${Date.now()}" class="w-full h-full object-cover" autoplay muted playsinline>
                            <source src="${step.videoSrc}" type="video/mp4">
                        </video>` : `<div class="w-full h-full flex items-center justify-center text-white">(No Video)</div>`}
                </div>
                <div class="h-2/5 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    ${step.imageSrc ? `
                        <img src="${step.imageSrc}" alt="${step.name} illustration" class="max-h-full max-w-full object-contain">` : `<div class="w-full h-full flex items-center justify-center text-gray-500">(No Image)</div>`}
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
    
    renderProtocolList();
    renderDisplayPanel();
});
