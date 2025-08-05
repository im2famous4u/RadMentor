document.addEventListener('DOMContentLoaded', function() {

    // The data is now updated with spot counts, professional text, and a numbering flag.
    const protocolData = [
        { id: 1, name: 'Patient Preparation', isNumbered: false, layoutType: 'text_table', table: { headers: ['Step', 'Description'], rows: [ ['Fasting', 'At least <strong>6–8 hours</strong> to reduce bowel gas and gallbladder contraction'], ['Bladder status', 'Not necessary unless evaluating pelvic organs or bladder'], ['Positioning', 'Supine is standard; LLD, RLD, and erect positions used as needed'] ] } },
        { id: 2, name: 'Transducer Selection', isNumbered: false, layoutType: 'text_table', table: { headers: ['Region', 'Transducer Type'], rows: [ ['General abdomen', '<strong>Curvilinear 2–5 MHz</strong>'], ['Superficial organs or thin patients', '<strong>Linear 7–12 MHz</strong> (e.g., abdominal wall, superficial masses)'] ] } },
        { id: 3, name: 'Liver (~14 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save / Document'], rows: [ ['Longitudinal', 'Left lobe (including caudate), Right lobe with dome, Right lobe with kidney interface, Main lobar fissure & GB fossa'], ['Transverse', 'Left lobe, Confluence of hepatic veins, Main, right, & left portal veins, Right lobe (superior, mid, inferior)'], ['Doppler', 'Assess main portal vein flow (hepatopetal) and hepatic vein flow if indicated for cirrhosis or portal hypertension.'] ] }, notes: "A comprehensive sweep is required to evaluate the entire parenchyma for texture (steatosis/cirrhosis), masses, and cysts." },
        { id: 4, name: 'Gallbladder & Biliary Tree (~7 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal & Transverse', 'Fundus, body, and neck in both <strong>supine and LLD</strong> positions to assess mobility of contents.'], ['Ducts', 'Measure the extrahepatic common bile duct (CBD) with anteroposterior calipers.'], ['Doppler (optional)', 'Evaluate for wall hyperemia in cases of suspected inflammation (cholecystitis).'] ] }, notes: "Document wall thickness, presence of stones (cholelithiasis), sludge, and check for pericholecystic fluid." },
        { id: 5, name: 'Pancreas (~4 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Transverse (epigastric window)', 'A full sweep showing the Head, Uncinate Process, Body, and Tail.'], ['Landmarks', 'Identify surrounding vessels: SMA, SMV, Aorta, IVC. Note the pancreatic duct if visualized.'], ['Tip', 'Use a <strong>fluid-filled stomach</strong> (give patient water) as an acoustic window if the pancreas is obscured by gas.'] ] } },
        { id: 6, name: 'Spleen (~3 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal', 'Full length of the spleen, including the interface with the left hemidiaphragm.'], ['Transverse', 'Splenic hilum and the interface with the left kidney.'], ['Measurement', 'Measure the maximum length in the long axis. A length >12-13 cm suggests splenomegaly.'] ] } },
        { id: 7, name: 'Kidneys (~6 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal', 'Upper pole, mid-pole (for length measurement), and lower pole of both kidneys.'], ['Transverse', 'Hilum (vessels), renal pelvis, and parenchyma at the mid-pole for both kidneys.'], ['Documentation', 'Assess corticomedullary differentiation, parenchymal echogenicity, and any evidence of hydronephrosis, cysts, or stones.'], ['Measurements', 'Bipolar length and parenchymal thickness should be documented.'] ] } },
        { id: 8, name: 'Aorta & IVC (~7 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Aorta (Longitudinal)', 'Proximal (below diaphragm), Mid (at renal artery level), and Distal (at the bifurcation).'], ['Aorta (Transverse)', 'Image at each of the 3 levels above; measure the <strong>outer-to-outer wall diameter</strong> to screen for aneurysm.'], ['IVC (Longitudinal)', 'Proximal IVC showing the hepatic vein confluence. Note diameter and respiratory variation.'], ['Doppler (if needed)', 'Assess flow for volume status evaluation or suspicion of thrombosis.'] ] } },
        { id: 9, name: 'Other Optional Regions', isNumbered: true, layoutType: 'text_table', table: { headers: ['Organ/System', 'When to Include'], rows: [ ['Adrenals', 'In pediatric patients, or for trauma / suspected mass.'], ['Appendix', 'For right lower quadrant (RLQ) pain; assess compressibility, diameter, and wall.'], ['Lymph nodes / mesentery', 'In cases of abdominal pain, suspected TB, or malignancy.'], ['Ascites', 'Document quantity, loculation, and presence of internal echoes.'], ['Free air / bowel pathology', 'Look for signs of perforation or bowel pathology (e.g., pseudokidney sign).'] ] } }
    ];

    let activeStepIndex = 0;
    const protocolChecklist = document.getElementById('protocol-checklist');
    const displayPanel = document.getElementById('display-panel');

    function renderProtocolList() {
        let listItemsHTML = '';
        let numberedStepCounter = 1; // Initialize counter for numbered steps

        protocolData.forEach((step, index) => {
            const isActive = index === activeStepIndex;
            
            let stepIndicatorHTML = '';
            if (step.isNumbered) {
                // Render a number if the step is numbered
                stepIndicatorHTML = `<span class="flex items-center justify-center w-7 h-7 mr-3 text-sm font-bold rounded-full ${isActive ? 'bg-white/20' : 'bg-white text-indigo-600'}">${numberedStepCounter}</span>`;
                numberedStepCounter++;
            } else {
                // Render an icon if the step is not numbered
                stepIndicatorHTML = `<span class="flex items-center justify-center w-7 h-7 mr-3 rounded-full ${isActive ? 'bg-white/20' : 'bg-white text-indigo-600'}"><i data-feather="info" class="w-4 h-4"></i></span>`;
            }

            listItemsHTML += `
                <li data-index="${index}" class="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 ${isActive ? 'rad-gradient-bg text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700'} group">
                    <div class="flex items-center">
                        ${stepIndicatorHTML}
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

        if (step.layoutType === 'text_table') {
            let tableHTML = `<table class="styled-table"><thead><tr><th>${step.table.headers[0]}</th><th>${step.table.headers[1]}</th></tr></thead><tbody>`;
            step.table.rows.forEach(row => { tableHTML += `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`; });
            tableHTML += `</tbody></table>`;
            if (step.notes) {
                tableHTML += `<div class="mt-4 p-4 bg-indigo-50 border-l-4 border-indigo-400 text-indigo-800 rounded-r-lg"><p class="font-semibold">Note:</p><p class="mt-1">${step.notes}</p></div>`;
            }

            panelHTML = `<div class="w-full h-full flex flex-col"><h3 class="font-bold text-2xl mb-4 text-slate-800">${step.name}</h3>${tableHTML}</div>`;
        } else {
            panelHTML = `<div class="text-center"><h3 class="text-2xl font-bold">${step.name}</h3><p>This layout type is under construction.</p></div>`;
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
