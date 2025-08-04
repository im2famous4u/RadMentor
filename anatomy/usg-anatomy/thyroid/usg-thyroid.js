document.addEventListener('DOMContentLoaded', function() {

    const protocolData = [
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
            layoutType: 'measurement_grid',
            shortDef: 'Accurate measurements are crucial for assessing gland size and monitoring changes. Measurements are typically taken from the mid-portion of each lobe.',
            images: [ 'trans.jpg', 'measurement1.jpg', 'long.jpg', 'measurement2.jpg' ],
            table: {
                headers: ['Parameter', 'Normal Range (per lobe)'],
                rows: [ ['Length', '4–6 cm'], ['Width (transverse)', '1.5–2 cm'], ['Depth (anteroposterior)', '1.5–2 cm'] ],
                footer: '<strong>Isthmus thickness:</strong> Normal: ≤ 3–5 mm (AP dimension)'
            }
        },
        // === CHANGES ARE IN THIS SECTION ===
        {
            id: 4,
            name: 'Isthmus Scan',
            layoutType: 'isthmus_scan', // A new layout for our final step
            shortDef: 'The isthmus connects the two lobes and must be evaluated for any abnormalities or nodules.',
            images: [
                'Isthmus.jpg',      // Image 1
                'Isthmus-usg.jpg'   // Image 2
            ],
            table: {
                headers: ['Age Group', 'Normal Isthmus Thickness (AP)'],
                rows: [
                    ['Adult & Adolescent', '≤ 3 mm (some sources allow up to 4–5 mm)'],
                    ['Child (6–12 yr)', '≤ 2–3 mm'],
                    ['Toddler (1–5 yr)', '≤ 2 mm'],
                    ['Infant (<1 yr)', '≤ 1.5–2 mm']
                ]
            },
            options: [
                { title: 'Isthmus Protocol', detailText: 'A transverse grayscale image is taken through the isthmus. AP thickness should be measured.' }
            ]
        }
        // ===================================
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
                    <div class="flex items-center"><span class="flex items-center justify-center w-6 h-6 mr-4 text-sm font-bold rounded-full ring-2 ${isActive ? 'ring-indigo-300 text-white' : 'ring-gray-300 text-indigo-600'}">${step.id}</span><span class="font-semibold">${step.name}</span></div>
                    <i data-feather="chevron-right" class="${isActive ? 'text-white' : 'text-gray-400'}"></i>
                </li>`;
        });
        protocolChecklist.innerHTML = listItemsHTML;
        feather.replace();
    }
    
    function renderDisplayPanel() {
        const step = protocolData[activeStepIndex];
        let panelHTML = '';

        if (step.layoutType === 'measurement_grid' || step.layoutType === 'isthmus_scan') {
            // This block handles both the Lobe Measurement and Isthmus layouts
            
            // Build the visual part (2x2 grid for measurements, 2 stacked images for isthmus)
            let visualHTML = '';
            if (step.layoutType === 'measurement_grid') {
                visualHTML += '<div class="grid grid-cols-2 gap-4 h-full">';
                step.images.forEach(imgSrc => {
                    visualHTML += `<div class="bg-black rounded-lg overflow-hidden"><img src="${imgSrc}" class="w-full h-full object-contain" loading="lazy"></div>`;
                });
                visualHTML += '</div>';
            } else { // Isthmus layout
                visualHTML += '<div class="flex flex-col gap-4 h-full">';
                step.images.forEach(imgSrc => {
                    visualHTML += `<div class="bg-black rounded-lg overflow-hidden flex-1"><img src="${imgSrc}" class="w-full h-full object-contain" loading="lazy"></div>`;
                });
                visualHTML += '</div>';
            }

            // Build the text/table part
            let contentHTML = '';
            if (step.layoutType === 'measurement_grid') {
                contentHTML = `<p class="text-gray-600 mb-4">${step.shortDef}</p>`;
            } else { // Isthmus layout text
                contentHTML = `<div class="bg-gray-50 p-6 rounded-lg h-full space-y-6">
                    <h3 class="font-bold text-xl mb-2">${step.name}</h3>
                    <p class="text-gray-600 mb-6 pb-6 border-b">${step.shortDef}</p>`;
                step.options.forEach((option, index) => {
                    contentHTML += `<div class="bg-white p-4 rounded-lg border"><h4 class="font-semibold text-gray-800">${option.title}</h4><p class="text-gray-600 mt-1 text-sm">${option.detailText}</p></div>`;
                });
                contentHTML += `</div>`;
            }

            // Build the table for both layouts
            let tableHTML = `<div class="mt-6 text-sm"><table class="w-full border-collapse"><thead><tr><th class="border-b font-semibold p-2 text-left">${step.table.headers[0]}</th><th class="border-b font-semibold p-2 text-left">${step.table.headers[1]}</th></tr></thead><tbody>`;
            step.table.rows.forEach(row => {
                tableHTML += `<tr><td class="border-b p-2">${row[0]}</td><td class="border-b p-2">${row[1]}</td></tr>`;
            });
            tableHTML += `</tbody></table>`;
            if (step.table.footer) {
                tableHTML += `<p class="mt-4 text-gray-700">${step.table.footer}</p>`;
            }
            tableHTML += '</div>';
            
            // Assemble the final panel based on layout type
            if (step.layoutType === 'measurement_grid') {
                 panelHTML = `<div class="w-full h-full flex flex-col">${contentHTML}<div class="grid grid-cols-2 gap-4 flex-grow mt-4">${visualHTML.replace('<div class="grid grid-cols-2 gap-4 h-full">', '').replace('</div>','')}</div>${tableHTML}</div>`;
            } else { // Isthmus layout
                 panelHTML = `<div class="flex flex-col md:flex-row gap-6 w-full h-full"><div class="w-full md:w-1/2">${visualHTML}</div><div class="w-full md:w-1/2">${contentHTML}</div></div><div class="w-full">${tableHTML}</div>`;
            }

        } else { // Default layout for 'video_image'
            let textContentHTML = `<div class="bg-gray-50 p-6 rounded-lg h-full flex flex-col"><h3 class="font-bold text-xl mb-2">${step.name}</h3><p class="text-gray-600 mb-6 pb-6 border-b">${step.shortDef || ''}</p><div class="space-y-4">`;
            if(step.options) { step.options.forEach((option, index) => { textContentHTML += `<div class="bg-white p-4 rounded-lg border"><h4 class="font-semibold text-gray-800">Option ${index + 1} - ${option.title}</h4><p class="text-gray-600 mt-1 text-sm">${option.detailText}</p></div>`; }); }
            textContentHTML += `</div></div>`;

            let visualHTML = `<div class="flex flex-col h-full w-full gap-2"><div class="h-1/2 rounded-lg overflow-hidden bg-black">${step.videoSrc ? `<video key="${step.videoSrc}" class="w-full h-full object-cover" autoplay muted playsinline preload="metadata"><source src="${step.videoSrc}" type="video/mp4"></video>` : `<div class="w-full h-full flex items-center justify-center text-white">(No Video)</div>`}</div><div class="h-1/2 rounded-lg overflow-hidden bg-white flex items-center justify-center">${step.imageSrc ? `<img src="${step.imageSrc}" alt="${step.name} illustration" class="max-h-full max-w-full object-contain" loading="lazy">` : `<div class="w-full h-full flex items-center justify-center text-gray-500">(No Image)</div>`}</div></div>`;

            panelHTML = `<div class="flex flex-col md:flex-row gap-6 w-full h-full"><div class="w-full md:w-1/2">${visualHTML}</div><div class="w-full md:w-1/2">${textContentHTML}</div></div>`;
        }
        
        displayPanel.innerHTML = panelHTML;
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
