const courseData = {
    anatomy: [
        { id: 'head-neck', name: 'Head & Neck' },
        { id: 'thorax', name: 'Thorax' },
        { id: 'abdomen', name: 'Abdomen' },
        { id: 'pelvis', name: 'Pelvis' },
        { id: 'extremities', name: 'Extremities' },
        { id: 'neuroanatomy', name: 'Neuroanatomy' },
        { id: 'cross-sectional', name: 'Cross-sectional Anatomy' },
    ],
    md_dnb: [
        { id: 'radiology-basics', name: 'Radiology Basics' },
        { id: 'chest-imaging', name: 'Chest Imaging' },
        { id: 'abdominal-imaging', name: 'Abdominal Imaging' },
        { id: 'musculoskeletal', name: 'Musculoskeletal Imaging' },
        { id: 'neuroradiology', name: 'Neuroradiology' },
        { id: 'pediatric-radiology', name: 'Pediatric Radiology' },
        { id: 'interventional', name: 'Interventional Radiology' },
        { id: 'nuclear-medicine', name: 'Nuclear Medicine' },
    ],
    fellowship: {
        micr: {
            name: 'MICR',
            courses: [
                { id: 'physics', name: 'Medical Physics' },
                { id: 'anatomy', name: 'Radiological Anatomy' },
                { id: 'pathology', name: 'Pathology Correlation' },
                { id: 'techniques', name: 'Imaging Techniques' },
                { id: 'safety', name: 'Radiation Safety' },
            ]
        },
        frcr: {
            name: 'FRCR',
            courses: [
                { id: 'part1', name: 'FRCR Part 1' },
                { id: 'part2a', name: 'FRCR Part 2A' },
                { id: 'part2b', name: 'FRCR Part 2B' },
                { id: 'physics', name: 'Physics & Equipment' },
                { id: 'clinical', name: 'Clinical Radiology' },
            ]
        },
        fet: {
            name: 'FET',
            courses: [
                { id: 'subspecialty', name: 'Subspecialty Training' },
                { id: 'research', name: 'Research Methods' },
                { id: 'advanced-imaging', name: 'Advanced Imaging' },
                { id: 'case-studies', name: 'Case Studies' },
                { id: 'quality-assurance', name: 'Quality Assurance' },
            ]
        },
        ficri: {
            name: 'F-ICRI',
            courses: [
                { id: 'interventional-basics', name: 'Interventional Basics' },
                { id: 'vascular', name: 'Vascular Interventions' },
                { id: 'non-vascular', name: 'Non-vascular Interventions' },
                { id: 'oncology', name: 'Interventional Oncology' },
                { id: 'emergency', name: 'Emergency Procedures' },
            ]
        }
    }
};