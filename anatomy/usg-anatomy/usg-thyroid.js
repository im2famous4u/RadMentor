// Wait for the entire HTML document to be loaded and ready
document.addEventListener('DOMContentLoaded', function() {

    // --- PART 1: LOAD THE VIDEO ON THE RIGHT PANEL ---

    const displayPanel = document.getElementById('display-panel');
    if (displayPanel) {
        // Set the content of the panel to be our video player
        displayPanel.innerHTML = `
            <video class="w-full h-auto rounded-lg" autoplay muted playsinline loop>
                <source src="thy-long.mp4" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    }

    // --- PART 2: POPULATE THE PROTOCOL CHECKLIST ON THE LEFT ---

    const protocolChecklist = document.getElementById('protocol-checklist');
    if (protocolChecklist) {
        const steps = [
            { name: 'Longitudinal Scan', active: true },
            { name: 'Transverse Scan', active: false },
            { name: 'Lobe Measurements', active: false },
            { name: 'Isthmus Scan', active: false }
        ];

        let listItemsHTML = '';
        steps.forEach((step, index) => {
            // Check if the step is the active one to apply different styling
            const isActive = step.active;
            const bgColor = isActive ? 'bg-indigo-500' : 'bg-gray-100';
            const textColor = isActive ? 'text-white' : 'text-gray-700';
            const ringColor = isActive ? 'ring-indigo-300' : 'ring-gray-300';
            const numberColor = isActive ? 'text-white' : 'text-indigo-600';
            const chevronColor = isActive ? 'text-white' : 'text-gray-400';

            listItemsHTML += `
                <li class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${bgColor} hover:bg-indigo-100 group">
                    <div class="flex items-center">
                        <span class="flex items-center justify-center w-6 h-6 mr-4 text-sm font-bold rounded-full ring-2 ${ringColor} ${numberColor}">
                            ${index + 1}
                        </span>
                        <span class="font-semibold ${textColor}">
                            ${step.name}
                        </span>
                    </div>
                    <i data-feather="chevron-right" class="${chevronColor} group-hover:text-gray-600"></i>
                </li>
            `;
        });

        // Set the generated HTML into the list
        protocolChecklist.innerHTML = listItemsHTML;

        // IMPORTANT: Call feather.replace() AGAIN after adding new icons
        // This is necessary to make the chevron icons appear.
        feather.replace();
    }
});
