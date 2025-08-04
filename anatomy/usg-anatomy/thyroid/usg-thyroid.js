document.addEventListener('DOMContentLoaded', function() {

    const protocolData = [
        // ... (Step 1 and 2 data remains the same)
        {
            id: 1,
            name: 'Longitudinal Scan',
            layoutType: 'video_image',
            shortDef: 'A longitudinal view provides a long-axis image of the thyroid lobe, essential for evaluating its length and overall morphology.',
            videoSrc: 'thy-long.mp4',
            imageSrc: 'long-img.png',
            options: [ { title: 'Static Images', detailText: 'Acquire at least 3 grayscale images per lobe, capturing the <strong>lateral, mid, and medial</strong> portions.' }, { title: 'Cine Clip', detailText: 'Perform a full sweep of the lobe from the <strong>medial to the lateral</strong> border to visualize the entire gland in motion.' } ]
        },
        {
            id: 2,
            name: 'Transverse Scan',
            layoutType: 'video_image',
            shortDef: 'A transverse view provides a short-axis image, crucial for measuring width and depth, and assessing for nodules.',
            videoSrc: 'thy-trans.mp4',
            imageSrc: 'trans-img.png',
            options: [ { title: 'Static Images', detailText: 'Acquire at least 3 grayscale images per lobe, capturing the <strong>superior, mid, and inferior</strong> portions.' }, { title: 'Cine Clip', detailText: 'Perform a full sweep of the lobe from the <strong>superior to the inferior</strong> border.' } ]
        },
        {
            id: 3,
            name: 'Lobe Measurements',
            layoutType: 'measurement_grid', // This layout type will now be rendered correctly
            shortDef: 'Accurate measurements are crucial for assessing gland size and monitoring changes. Measurements are typically taken from the mid-portion of each lobe.',
            images: [ 'trans.jpg', 'measurement1.jpg', 'long.jpg', 'measurement2.jpg' ],
            table: {
                headers: ['Parameter', 'Normal Range (per lobe)'],
                rows: [ ['Length', '4–6 cm'], ['Width (transverse)', '1.5–2 cm'], ['Depth (anteroposterior)', '1.5–2 cm'] ],
                footer: '<strong>Isthmus thickness:</strong> Normal: ≤ 3–5 mm (AP dimension)'
            }
        },
        {
            id: 4,
            name: 'Isthmus Scan',
            layoutType: 'isthmus_scan',
            shortDef: 'The isthmus connects the two lobes and must be evaluated for any abnormalities or nodules.',
            images: [ 'Isthmus.jpg', 'Isthmus-usg.jpg' ],
            table: {
                headers: ['Age Group', 'Normal Isthmus Thickness (AP)'],
                rows: [ ['Adult & Adolescent', '≤ 3 mm (some sources allow up to 4–5 mm)'], ['Child (6–12 yr)', '≤ 2–3 mm'], ['Toddler (1–5 yr)', '≤ 2 mm'], ['Infant (<1 yr)', '≤ 1.5–2 mm'] ]
            },
            options: [ { title: 'Isthmus Protocol', detailText: 'A transverse grayscale image is taken through the isthmus. AP thickness should be measured.' } ]
        }
    ];

    let activeStepIndex = 0;
    const protocolChecklist = document.getElementById('protocol-checklist');
    const displayPanel = document.getElementById('display-panel');

    function renderProtocolList() {
        let listItemsHTML = '';
        protocolData.forEach((step, index) => {
            const isActive = index === activeStepIndex;
            listItemsHTML += `
                <li data-index="${index}" class="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 ${isActive ? 'rad-gradient-bg text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700'} group">
                    <div class="flex items-center">
                        <span class="flex items-center justify-center w-7 h-7 mr-3 text-sm font-bold rounded-full ${isActive ? 'bg-white/20' : 'bg-white text-indigo-600'}">
                            ${step.id}
                        </span>
                        <span class="font-semibold">${step.name}</span>
                    </div>
                    <i data-feather="chevron-right" class="transition-transform duration-300 ${isActive ? '' : 'group-hover:translate-x-1'}"></i>
                </li>`;
        });
        protocolChecklist.innerHTML = listItemsHTML;
        feather.replace();
    }
    
    function renderDisplayPanel() {
        const step = protocolData[activeStepIndex];
        let panelHTML = '';

        if (step.layoutType === 'measurement_grid') {
            // --- THIS IS THE CORRECTED 2x2 GRID LAYOUT ---
            let gridImagesHTML = '';
            step.images.forEach(imgSrc => {
                gridImagesHTML += `<div class="bg-slate-800 rounded-lg overflow-hidden shadow-inner"><img src="${imgSrc}" class="w-full h-full object-cover" loading="lazy"></div>`;
            });
            
            let tableHTML = `<div class="mt-6 text-sm"><table class="styled-table"><thead><tr><th>${step.table.headers[0]}</th><th>${step.table.headers[1]}</th></tr></thead><tbody>`;
            step.table.rows.forEach(row => { tableHTML += `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`; });
            tableHTML += `</tbody></table><p class="mt-4 text-slate-600">${step.table.footer}</p></div>`;

            panelHTML = `
                <div class="w-full h-full flex flex-col">
                    <p class="text-slate-600 mb-4 flex-shrink-0">${step.shortDef}</p>
                    <div class="grid grid-cols-2 gap-3 flex-grow">${gridImagesHTML}</div>
                    <div class="flex-shrink-0">${tableHTML}</div>
                </div>
            `;
        } else if (step.layoutType === 'isthmus_scan') {
            // This is the layout for the Isthmus scan
            let visualHTML = '<div class="flex flex-col gap-3 h-full">';
            step.images.forEach(imgSrc => {
                visualHTML += `<div class="bg-slate-800 rounded-lg overflow-hidden shadow-inner flex-1"><img src="${imgSrc}" class="w-full h-full object-contain" loading="lazy"></div>`;
            });
            visualHTML += '</div>';

            let contentHTML = `<div class="bg-slate-100/70 p-6 rounded-lg h-full space-y-6"><h3 class="font-bold text-xl mb-2 text-slate-800">${step.name}</h3><p class="text-slate-600 mb-6 pb-6 border-b border-slate-200">${step.shortDef}</p>`;
            step.options.forEach((option) => { contentHTML += `<div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm"><h4 class="font-semibold text-slate-800">${option.title}</h4><p class="text-slate-600 mt-1 text-sm">${option.detailText}</p></div>`; });
            contentHTML += `</div>`;

            let tableHTML = `<div class="mt-6 text-sm"><table class="styled-table"><thead><tr><th>${step.table.headers[0]}</th><th>${step.table.headers[1]}</th></tr></thead><tbody>`;
            step.table.rows.forEach(row => { tableHTML += `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`; });
            tableHTML += `</tbody></table></div>`;
            
            panelHTML = `<div class="w-full h-full flex flex-col"><div class="flex flex-col md:flex-row gap-6 flex-grow"><div class="w-full md:w-1/2">${visualHTML}</div><div class="w-full md:w-1/2">${contentHTML}</div></div><div class="flex-shrink-0">${tableHTML}</div></div>`;

        } else { // Default layout for 'video_image'
            let textContentHTML = `<div class="bg-slate-100/70 p-6 rounded-lg h-full flex flex-col"><h3 class="font-bold text-xl mb-2 text-slate-800">${step.name}</h3><p class="text-slate-600 mb-6 pb-6 border-b border-slate-200">${step.shortDef || ''}</p><div class="space-y-4">`;
            if(step.options) { step.options.forEach((option) => { textContentHTML += `<div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm"><h4 class="font-semibold text-slate-800">${option.title}</h4><p class="text-slate-600 mt-1 text-sm">${option.detailText}</p></div>`; }); }
            textContentHTML += `</div></div>`;

            let visualHTML = `<div class="flex flex-col h-full w-full gap-3"><div class="h-1/2 rounded-lg overflow-hidden bg-slate-800 shadow-inner">${step.videoSrc ? `<video key="${step.videoSrc}" class="w-full h-full object-cover" autoplay muted playsinline preload="metadata"><source src="${step.videoSrc}" type="video/mp4"></video>` : `<div class="w-full h-full flex items-center justify-center text-white">(No Video)</div>`}</div><div class="h-1/2 rounded-lg overflow-hidden bg-white shadow-inner flex items-center justify-center">${step.imageSrc ? `<img src="${step.imageSrc}" alt="${step.name} illustration" class="max-h-full max-w-full object-contain" loading="lazy">` : `<div class="w-full h-full flex items-center justify-center text-slate-500">(No Image)</div>`}</div></div>`;

            panelHTML = `<div class="flex flex-col md:flex-row gap-6 w-full h-full"><div class="w-full md:w-1/2">${visualHTML}</div><div class="w-full md:w-1/2">${textContentHTML}</div></div>`;
        }
        
        displayPanel.innerHTML = `<div class="animate-fade-in w-full h-full">${panelHTML}</div>`;
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
