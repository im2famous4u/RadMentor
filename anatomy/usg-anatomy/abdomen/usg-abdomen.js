document.addEventListener('DOMContentLoaded', function() {

    // The data is now fully restructured to support a tabbed interface for complex organs.
    const protocolData = [
        { id: 1, name: 'Patient Preparation', isNumbered: false, layoutType: 'text_table', table: { headers: ['Step', 'Description'], rows: [ ['Fasting', 'At least <strong>6–8 hours</strong> to reduce bowel gas and gallbladder contraction'], ['Bladder status', 'Not necessary unless evaluating pelvic organs or bladder'], ['Positioning', 'Supine is standard; LLD, RLD, and erect positions used as needed'] ] } },
        { id: 2, name: 'Transducer Selection', isNumbered: false, layoutType: 'text_table', table: { headers: ['Region', 'Transducer Type'], rows: [ ['General abdomen', '<strong>Curvilinear 2–5 MHz</strong>'], ['Superficial organs or thin patients', '<strong>Linear 7–12 MHz</strong> (e.g., abdominal wall, superficial masses)'] ] } },
        {
            id: 3, name: 'Liver (~14 spots)', isNumbered: true, layoutType: 'tabbed_content',
            tabs: [
                { title: 'Transverse', content: { type: 'table', headers: ['View', 'Details'], rows: [['Left Lobe', 'Superior, mid, inferior sections'], ['Right Lobe', 'Superior, mid, inferior sections']] } },
                { title: 'Longitudinal', content: { type: 'table', headers: ['View', 'Details'], rows: [['Left Lobe', 'Lateral, mid, medial sections'], ['Right Lobe', 'Lateral, mid (include diaphragm/kidney), medial sections']] } },
                { title: 'Doppler', content: { type: 'text', text: 'Assess flow in the hepatic veins, main portal vein, and intrahepatic ducts if indicated for conditions like cirrhosis or portal hypertension.' } },
                { title: 'Measurements', content: { type: 'text', text: 'Measure the craniocaudal length of the right lobe if hepatomegaly is suspected. Document any significant findings.' } }
            ]
        },
        {
            id: 4, name: 'Gallbladder & Biliary Tree (~7 spots)', isNumbered: true, layoutType: 'tabbed_content',
            tabs: [
                { title: 'Views', content: { type: 'text', text: 'Image the fundus, body, and neck in both <strong>longitudinal and transverse</strong> planes. The patient should be scanned in both <strong>supine and LLD</strong> (left lateral decubitus) positions to assess for mobility of any contents (e.g., gallstones).' } },
                { title: 'Ducts', content: { type: 'text', text: 'Measure the extrahepatic common bile duct (CBD) using anteroposterior calipers. The normal diameter is typically up to 6 mm, adding 1 mm per decade over 60 years.' } },
                { title: 'Doppler', content: { type: 'text', text: 'Doppler is optional but useful to evaluate for wall hyperemia (increased blood flow) in cases of suspected acute cholecystitis.' } },
                { title: 'Notes', content: { type: 'text', text: 'Always document the gallbladder wall thickness, and the presence of any stones (cholelithiasis), sludge, or pericholecystic fluid.' } }
            ]
        },
        {
            id: 5, name: 'Pancreas (~4 spots)', isNumbered: true, layoutType: 'tabbed_content',
            tabs: [
                { title: 'Scan', content: { type: 'text', text: 'Using the epigastric window, perform a full sweep in the <strong>transverse</strong> plane to visualize the head, uncinate process, body, and tail of the pancreas.' } },
                { title: 'Landmarks', content: { type: 'text', text: 'Identify and use surrounding vessels as landmarks: Splenic Vein, SMA (Superior Mesenteric Artery), SMV, Aorta, and IVC. The pancreatic duct may be seen as a small echogenic line.' } },
                { title: 'Tip', content: { type: 'text', text: 'If obscured by bowel gas, have the patient drink water to use the <strong>fluid-filled stomach</strong> as an acoustic window for better visualization.' } }
            ]
        },
        {
            id: 6, name: 'Spleen (~3 spots)', isNumbered: true, layoutType: 'tabbed_content',
            tabs: [
                { title: 'Views', content: { type: 'text', text: 'In the <strong>longitudinal</strong> plane, image the entire spleen including the left hemidiaphragm. In the <strong>transverse</strong> plane, visualize the splenic hilum and its interface with the left kidney.' } },
                { title: 'Measurement', content: { type: 'text', text: 'Measure the maximum length of the spleen in its long axis. A measurement greater than 12-13 cm typically suggests splenomegaly.' } }
            ]
        },
        {
            id: 7, name: 'Kidneys (~6 spots)', isNumbered: true, layoutType: 'tabbed_content',
            tabs: [
                { title: 'Planes', content: { type: 'table', headers: ['Plane', 'What to Save'], rows: [['Longitudinal', 'Upper pole, mid-pole (for length), and lower pole of both kidneys'], ['Transverse', 'Hilum (vessels), renal pelvis, and parenchyma of both kidneys']] } },
                { title: 'Documentation', content: { type: 'text', text: 'Assess and comment on the corticomedullary differentiation, parenchymal echogenicity, and for any evidence of hydronephrosis, cysts, or stones (nephrolithiasis).' } },
                { title: 'Measurements', content: { type: 'text', text: 'Document the bipolar length of each kidney and note the parenchymal thickness if relevant.' } }
            ]
        },
        {
            id: 8, name: 'Aorta & IVC (~7 spots)', isNumbered: true, layoutType: 'tabbed_content',
            tabs: [
                { title: 'Aorta', content: { type: 'text', text: 'In <strong>longitudinal</strong>, image the proximal, mid (renal), and distal (bifurcation) aorta. In <strong>transverse</strong>, image at the same three levels and measure the <strong>outer-to-outer wall diameter</strong> to screen for an aneurysm.' } },
                { title: 'IVC & Doppler', content: { type: 'text', text: 'In <strong>longitudinal</strong>, image the proximal IVC with the hepatic confluence. Note the diameter and respiratory variation. <strong>Doppler</strong> can be used to assess for thrombosis or evaluate volume status if needed.' } }
            ]
        },
        { id: 9, name: 'Bladder (if included)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [['Longitudinal & Transverse', 'Full bladder, post-void (if urinary symptoms)'], ['Comment on', 'Wall thickness, residual volume, contents (sludge/clot/calculi)']]}},
        { id: 10, name: 'Other Optional Regions', isNumbered: true, layoutType: 'text_table', table: { headers: ['Organ/System', 'When to Include'], rows: [ ['Adrenals', 'In pediatric patients, or for trauma / suspected mass.'], ['Appendix', 'For right lower quadrant (RLQ) pain; assess compressibility, diameter, and wall.'], ['Lymph nodes / mesentery', 'In cases of abdominal pain, suspected TB, or malignancy.'], ['Ascites', 'Document quantity, loculation, and presence of internal echoes.'], ['Free air / bowel pathology', 'Look for signs of perforation or bowel pathology (e.g., pseudokidney sign).'] ] } }
    ];

    let activeStepIndex = 0;
    const protocolChecklist = document.getElementById('protocol-checklist');
    const displayPanel = document.getElementById('display-panel');

    function renderProtocolList() {
        // This function remains the same
        let listItemsHTML = '';
        let numberedStepCounter = 1;
        protocolData.forEach((step, index) => {
            const isActive = index === activeStepIndex;
            let stepIndicatorHTML = step.isNumbered ? `<span class="flex items-center justify-center w-7 h-7 mr-3 text-sm font-bold rounded-full ${isActive ? 'bg-white/20' : 'bg-white text-indigo-600'}">${numberedStepCounter++}</span>` : `<span class="flex items-center justify-center w-7 h-7 mr-3 rounded-full ${isActive ? 'bg-white/20' : 'bg-white text-indigo-600'}"><i data-feather="info" class="w-4 h-4"></i></span>`;
            listItemsHTML += `<li data-index="${index}" class="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 ${isActive ? 'rad-gradient-bg text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700'} group"><div class="flex items-center">${stepIndicatorHTML}<span class="font-semibold">${step.name}</span></div><i data-feather="chevron-right" class="transition-transform duration-300 ${isActive ? '' : 'group-hover:translate-x-1'}"></i></li>`;
        });
        protocolChecklist.innerHTML = listItemsHTML;
        feather.replace();
    }
    
    function renderDisplayPanel() {
        const step = protocolData[activeStepIndex];
        let panelHTML = '';

        if (step.layoutType === 'tabbed_content') {
            // --- NEW: Renders the tabbed interface ---
            let tabButtonsHTML = '<div class="flex items-center border-b border-slate-200">';
            step.tabs.forEach((tab, index) => {
                tabButtonsHTML += `<button data-tab-index="${index}" class="tab-btn text-sm font-semibold p-4 border-b-2 ${index === 0 ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}">${tab.title}</button>`;
                if (index < step.tabs.length - 1) {
                    tabButtonsHTML += `<div class="flex-shrink-0 text-slate-300"><i data-feather="chevron-right" class="w-4 h-4"></i></div>`;
                }
            });
            tabButtonsHTML += '</div>';

            let tabContentHTML = '<div class="relative mt-4">';
            step.tabs.forEach((tab, index) => {
                let content = '';
                if (tab.content.type === 'table') {
                    content = `<table class="styled-table"><thead><tr><th>${tab.content.headers[0]}</th><th>${tab.content.headers[1]}</th></tr></thead><tbody>`;
                    tab.content.rows.forEach(row => { content += `<tr><td class="align-top font-medium text-slate-600 w-1/3">${row[0]}</td><td>${row[1]}</td></tr>`; });
                    content += `</tbody></table>`;
                } else {
                    content = `<div class="p-2 text-slate-700">${tab.content.text}</div>`;
                }
                tabContentHTML += `<div data-tab-content="${index}" class="tab-content ${index !== 0 ? 'hidden' : ''}">${content}</div>`;
            });
            tabContentHTML += '</div>';

            panelHTML = `<div class="w-full h-full flex flex-col"><h3 class="font-bold text-2xl mb-4 text-slate-800">${step.name}</h3>${tabButtonsHTML}${tabContentHTML}</div>`;

        } else { // Default layout for simple tables
            let tableHTML = `<table class="styled-table"><thead><tr><th class="w-1/3">${step.table.headers[0]}</th><th>${step.table.headers[1]}</th></tr></thead><tbody>`;
            step.table.rows.forEach(row => { tableHTML += `<tr><td class="align-top font-medium text-slate-600">${row[0]}</td><td>${row[1]}</td></tr>`; });
            tableHTML += `</tbody></table>`;
            if (step.notes) { tableHTML += `<div class="mt-4 p-4 bg-indigo-50 border-l-4 border-indigo-400 text-indigo-800 rounded-r-lg"><p class="font-semibold">Note:</p><p class="mt-1">${step.notes}</p></div>`; }
            panelHTML = `<div class="w-full h-full flex flex-col"><h3 class="font-bold text-2xl mb-4 text-slate-800">${step.name}</h3>${tableHTML}</div>`;
        }
        
        displayPanel.innerHTML = `<div class="animate-fade-in w-full h-full">${panelHTML}</div>`;
        feather.replace(); // Re-run feather for the arrows between tabs
    }

    displayPanel.addEventListener('click', (e) => {
        const tabButton = e.target.closest('.tab-btn');
        if (!tabButton) return;

        const tabIndex = tabButton.dataset.tabIndex;

        // Update button styles
        displayPanel.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-indigo-500', 'text-indigo-600');
            btn.classList.add('border-transparent', 'text-slate-500');
        });
        tabButton.classList.add('border-indigo-500', 'text-indigo-600');
        tabButton.classList.remove('border-transparent', 'text-slate-500');

        // Show the correct content
        displayPanel.querySelectorAll('.tab-content').forEach(content => {
            if (content.dataset.tabContent === tabIndex) {
                content.classList.remove('hidden');
                content.classList.add('animate-fade-in');
            } else {
                content.classList.add('hidden');
            }
        });
    });

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
