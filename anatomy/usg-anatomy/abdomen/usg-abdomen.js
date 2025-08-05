// FINAL, COMPLETE VERSION: Includes all organ data as requested.
document.addEventListener('DOMContentLoaded', function() {

    const protocolData = [
        { id: 1, name: 'Patient Preparation', isNumbered: false, layoutType: 'text_table', table: { headers: ['Step', 'Description'], rows: [ ['Fasting', 'At least <strong>6–8 hours</strong> to reduce bowel gas and gallbladder contraction'], ['Bladder status', 'Not necessary unless evaluating pelvic organs or bladder'], ['Positioning', 'Supine is standard; LLD, RLD, and erect positions used as needed'] ] } },
        { id: 2, name: 'Transducer Selection', isNumbered: false, layoutType: 'text_table', table: { headers: ['Region', 'Transducer Type'], rows: [ ['General abdomen', '<strong>Curvilinear 2–5 MHz</strong>'], ['Superficial organs or thin patients', '<strong>Linear 7–12 MHz</strong> (e.g., abdominal wall, superficial masses)'] ] } },
        {
            id: 3,
            name: 'Liver (~14 spots)',
            isNumbered: true,
            layoutType: 'text_table',
            table: {
                headers: ['Plane', 'What to Save / Document'],
                rows: [
                    ['Transverse', '<ul><li class="ml-4 list-disc"><strong>Left lobe:</strong> superior, mid, inferior sections</li><li class="ml-4 list-disc"><strong>Right lobe:</strong> superior, mid, inferior sections</li></ul>'],
                    ['Longitudinal (Sagittal)', '<ul><li class="ml-4 list-disc"><strong>Left lobe:</strong> lateral, mid, medial</li><li class="ml-4 list-disc"><strong>Right lobe:</strong> lateral, mid (include diaphragm/kidney), medial</li></ul>'],
                    ['Doppler (if indicated)', 'Hepatic veins, main portal vein, intrahepatic ducts'],
                    ['Measurements', 'Craniocaudal length of right lobe (if hepatomegaly is suspected)']
                ]
            },
            notes: "A comprehensive sweep is required to evaluate the entire parenchyma for texture (steatosis/cirrhosis), masses, and cysts."
        },
        { id: 4, name: 'Gallbladder & Biliary Tree (~7 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal & Transverse', 'Fundus, body, and neck in both <strong>supine and LLD</strong> positions to assess mobility of contents.'], ['Ducts', 'Measure the extrahepatic common bile duct (CBD) with anteroposterior calipers.'], ['Doppler (optional)', 'Evaluate for wall hyperemia in cases of suspected inflammation (cholecystitis).'] ] }, notes: "Document wall thickness, presence of stones (cholelithiasis), sludge, and check for pericholecystic fluid." },
        { id: 5, name: 'Pancreas (~4 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Transverse (epigastric window)', 'A full sweep showing the Head, Uncinate Process, Body, and Tail.'], ['Landmarks', 'Identify surrounding vessels: SMA, SMV, Aorta, IVC. Note the pancreatic duct if visualized.'], ['Tip', 'Use a <strong>fluid-filled stomach</strong> (give patient water) as an acoustic window if the pancreas is obscured by gas.'] ] } },
        { id: 6, name: 'Spleen (~3 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal', 'Full length of the spleen, including the interface with the left hemidiaphragm.'], ['Transverse', 'Splenic hilum and the interface with the left kidney.'], ['Measurement', 'Measure the maximum length in the long axis. A length >12-13 cm suggests splenomegaly.'] ] } },
        { id: 7, name: 'Kidneys (~6 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Longitudinal', 'Upper pole, mid-pole (for length measurement), and lower pole of both kidneys.'], ['Transverse', 'Hilum (vessels), renal pelvis, and parenchyma at the mid-pole for both kidneys.'], ['Documentation', 'Assess corticomedullary differentiation, parenchymal echogenicity, and any evidence of hydronephrosis, cysts, or stones.'], ['Measurements', 'Bipolar length and parenchymal thickness should be documented.'] ] } },
        { id: 8, name: 'Aorta & IVC (~7 spots)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [ ['Aorta (Longitudinal)', 'Proximal (below diaphragm), Mid (at renal artery level), and Distal (at the bifurcation).'], ['Aorta (Transverse)', 'Image at each of the 3 levels above; measure the <strong>outer-to-outer wall diameter</strong> to screen for aneurysm.'], ['IVC (Longitudinal)', 'Proximal IVC showing the hepatic vein confluence. Note diameter and respiratory variation.'], ['Doppler (if needed)', 'Assess flow for volume status evaluation or suspicion of thrombosis.'] ] } },
        { id: 9, name: 'Bladder (if included)', isNumbered: true, layoutType: 'text_table', table: { headers: ['Plane', 'What to Save'], rows: [['Longitudinal & Transverse', 'Full bladder, post-void (if urinary symptoms)'], ['Comment on', 'Wall thickness, residual volume, contents (sludge/clot/calculi)']]}},
        { id: 10, name: 'Other Optional Regions', isNumbered: true, layoutType: 'text_table', table: { headers: ['Organ/System', 'When to Include'], rows: [ ['Adrenals', 'In pediatric patients, or for trauma / suspected mass.'], ['Appendix', 'For right lower quadrant (RLQ) pain; assess compressibility, diameter, and wall.'], ['Lymph nodes / mesentery', 'In cases of abdominal pain, suspected TB, or malignancy.'], ['Ascites', 'Document quantity, loculation, and presence of internal echoes.'], ['Free air / bowel pathology', 'Look for signs of perforation or bowel pathology (e.g., pseudokidney sign).'] ] } }
    ];

    let activeStepIndex = 0;
    const protocolChecklist = document.getElementById('protocol-checklist');
    const displayPanel = document.getElementById('display-panel');

    function renderProtocolList() {
        let listItemsHTML = '';
        let numberedStepCounter = 1;

        protocolData.forEach((step, index) => {
            const isActive = index === activeStepIndex;
            let stepIndicatorHTML = step.isNumbered
                ? `<span class="flex items-center justify-center w-7 h-7 mr-3 text-sm font-bold rounded-full ${isActive ? 'bg-white/20' : 'bg-white text-indigo-600'}">${numberedStepCounter++}</span>`
                : `<span class="flex items-center justify-center w-7 h-7 mr-3 rounded-full ${isActive ? 'bg-white/20' : 'bg-white text-indigo-600'}"><i data-feather="info" class="w-4 h-4"></i></span>`;

            listItemsHTML += `<li data-index="${index}" class="flex items-center justify-between p
