document.addEventListener('DOMContentLoaded', function() {

    const protocolData = [
        { id: 1, name: 'Patient Preparation', layoutType: 'text_table', table: { headers: ['Step', 'Description'], rows: [ ['Fasting', 'At least <strong>6–8 hours</strong> to reduce bowel gas and gallbladder contraction'], ['Bladder status', 'Not necessary unless evaluating pelvic organs or bladder'], ['Positioning', 'Supine is standard; LLD, RLD, erect used as needed'] ] } },
        { id: 2, name: 'Transducer', layoutType: 'text_table', table: { headers: ['Region', 'Transducer Type'], rows: [ ['General abdomen', '<strong>Curvilinear 2–5 MHz</strong>'], ['Superficial organs or thin patients', '<strong>Linear 7–12 MHz</strong> (e.g., abdominal wall, superficial masses)'] ] } },
        { id: 3, name: 'Liver', layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal', 'Left lobe, right lobe with dome, right lobe with kidney, main lobar fissure'], ['Transverse', 'Left lobe, hepatic veins, portal veins, right lobe'], ['Doppler', 'Assess hepatic and portal vein flow if indicated'] ] }, notes: "A comprehensive sweep is required to evaluate the entire parenchyma for masses, steatosis, or cirrhosis. Document any findings." },
        { id: 4, name: 'Gallbladder & Biliary Tree', layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal & Transverse', 'Fundus, body, neck in <strong>supine and LLD</strong> positions'], ['Ducts', 'Extrahepatic bile duct (CBD) with anteroposterior measurement'], ['Doppler (optional)', 'For suspected inflammation, wall hyperemia'] ] }, notes: "Include wall thickness, presence of stones/sludge, and check for pericholecystic fluid." },
        { id: 5, name: 'Pancreas', layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Transverse (epigastric window)', 'Head, uncinate process, body, tail'], ['Landmarks', 'SMA, SMV, aorta, IVC, pancreatic duct (if seen)'], ['Tip', 'Use <strong>fluid-filled stomach</strong> as acoustic window if needed'] ] } },
        { id: 6, name: 'Spleen', layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal', 'Entire spleen + left hemidiaphragm'], ['Transverse', 'Hilum, interface with left kidney'], ['Measurement', 'Length in long axis (>12 cm = splenomegaly)'] ] } },
        { id: 7, name: 'Kidneys', layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal', 'Upper, mid (length), lower poles for both kidneys'], ['Transverse', 'Hilum, pelvis, parenchyma'], ['Documentation', 'Corticomedullary differentiation, echogenicity, any hydronephrosis or cysts'], ['Measurements', 'Bipolar length, parenchymal thickness'] ] } },
        { id: 8, name: 'Aorta & IVC', layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Aorta (Longitudinal)', 'Proximal (below diaphragm), mid (renal level), distal (bifurcation)'], ['Aorta (Transverse)', 'At each of the 3 levels; measure <strong>outer-to-outer wall diameter</strong>'], ['IVC (Longitudinal)', 'Proximal IVC with hepatic confluence'], ['Doppler (if needed)', 'For volume status, thrombosis assessment'] ] } },
        { id: 9, name: 'Other Optional Regions', layoutType: 'text_table', table: { headers: ['Organ/System', 'When to Include'], rows: [ ['Adrenals', 'Pediatric or trauma/suspected mass'], ['Appendix', 'RLQ pain: compressibility, diameter, wall'], ['Lymph nodes / mesentery', 'Abdominal pain, TB, malignancy'], ['Ascites', 'Document quantity, loculation, internal echoes'], ['Free air / bowel pathology', 'Rigidity, non-visualization, gas echoes, pseudokidney sign'] ] } }
    ];

    let activeStepIndex = 0;
    const protocolChecklist = document.getElementById('protocol-checklist');
    const displayPanel = document.getElementById('display-panel');

    function renderProtocolList() {
        let listItemsHTML = '';
        protocolData.forEach((step, index) => {
            const isActive = index === activeStepIndex;
            listItemsHTML += `<li data-index="${index}" class="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 ${isActive ? 'rad-gradient-bg text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700'} group"><div class="flex items-center"><span class="flex items-center justify-center w-7 h-7 mr-3 text-sm font-bold rounded-full ${isActive ? 'bg-white/20' : 'bg-white text-indigo-600'}">${step.id}</span><span class="font-semibold">${step.name}</span></div><i data-feather="chevron-right" class="transition-transform duration-300 ${isActive ? '' : 'group-hover:translate-x-1'}"></i></li>`;
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
                tableHTML += `<div class="mt-4 p-4 bg-indigo-50 border-l-4 border-indigo-400 text-indigo-800 rounded-r-lg"><p class="font-semibold">Note:</p><p>${step.notes}</p></div>`;
            }

            panelHTML = `<div class="w-full h-full flex flex-col"><h3 class="font-bold text-2xl mb-4 text-slate-800">${step.name}</h3>${tableHTML}</div>`;
        } else {
            // Fallback for other potential layout types
            panelHTML = `<div class="text-center"><h3 class="text-2xl font-bold">${step.name}</h3><p>Content to be added.</p></div>`;
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
