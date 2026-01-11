let troopData = [];
let currentResults = []; // Store processed results globally to re-render or recalc
let tribeUnits = []; // Store current tribe's unit info

document.addEventListener('DOMContentLoaded', () => {
    console.log('Travian Def Helper initialized');
    
    fetch('troopdata.json')
        .then(response => response.json())
        .then(data => {
            console.log('Troop data loaded:', data);
            troopData = data;
        })
        .catch(error => {
            console.error('Error loading troop data:', error);
            document.querySelector('#app').innerHTML = '<p style="color:red">Error loading troop data.</p>';
        });

    document.getElementById('process-btn').addEventListener('click', processSourceCode);
    
    // Add event listeners for target coordinates to recalculate times live
    document.getElementById('target-x').addEventListener('input', recalculateAllTimes);
    document.getElementById('target-y').addEventListener('input', recalculateAllTimes);

    // Add event listener for target URL
    document.getElementById('target-url').addEventListener('input', (e) => {
        const url = e.target.value;
        const xMatch = url.match(/[?&]x=(-?\d+)/);
        const yMatch = url.match(/[?&]y=(-?\d+)/);
        
        if (xMatch && yMatch) {
            document.getElementById('target-x').value = xMatch[1];
            document.getElementById('target-y').value = yMatch[1];
            recalculateAllTimes();
        }
    });
});

function processSourceCode() {
    const sourceCode = document.getElementById('source-code').value;
    const tribeIndex = parseInt(document.getElementById('tribe-select').value);
    
    if (!sourceCode) {
        alert('Please paste the source code first.');
        return;
    }

    if (!troopData[tribeIndex]) {
        alert('Invalid tribe selection or data not loaded.');
        return;
    }

    tribeUnits = troopData[tribeIndex];
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceCode, 'text/html');
    const troopsTable = doc.querySelector('#troops');

    if (!troopsTable) {
        alert('Could not find troops table. Ensure you are on "Village Statistics -> Troops".');
        return;
    }

    const results = [];
    const rows = troopsTable.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        if (row.classList.contains('empty') || row.classList.contains('sum')) return;

        const villageNameCell = row.querySelector('.villageName');
        if (!villageNameCell) return;

        const link = villageNameCell.querySelector('a');
        const villageName = villageNameCell.innerText.trim();
        
        // Extract village DID from href to find coordinates
        let villageDid = null;
        if (link) {
            const href = link.getAttribute('href');
            const match = href.match(/newdid=(\d+)/);
            if (match) villageDid = match[1];
        }

        // Find coordinates in the sidebar using DID
        let x = 0, y = 0;
        if (villageDid) {
            const sidebarEntry = doc.querySelector(`.listEntry.village[data-did="${villageDid}"]`);
            if (sidebarEntry) {
                const coordX = sidebarEntry.querySelector('.coordinateX');
                const coordY = sidebarEntry.querySelector('.coordinateY');
                if (coordX && coordY) {
                    // Clean text: replace minus sign (U+2212) with hyphen, then remove all non-digits/non-hyphen
                    const cleanX = coordX.innerText.replace(/\u2212/g, '-').replace(/[^\d-]/g, '');
                    const cleanY = coordY.innerText.replace(/\u2212/g, '-').replace(/[^\d-]/g, '');
                    x = parseInt(cleanX) || 0;
                    y = parseInt(cleanY) || 0;
                }
            }
        }

        const units = [];
        const cells = row.querySelectorAll('td');

        // Cells 1-10 are regular units
        for (let i = 1; i <= 10; i++) {
            if (cells[i]) {
                const count = parseInt(cells[i].innerText.replace(/[^\d]/g, '')) || 0;
                // Store unit data even if count is 0, to align columns, but mark availability
                units.push({
                    ...tribeUnits[i-1],
                    count: count,
                    selected: count > 0 // Default select if troops exist
                });
            }
        }
        
        // Handle Hero (Column 11)
        if (cells[11]) {
            const heroCount = parseInt(cells[11].innerText.replace(/[^\d]/g, '')) || 0;
            units.push({
                name: "Hero",
                speed: 7, // Default base speed for Hero
                count: heroCount,
                selected: heroCount > 0
            });
        }

        results.push({
            villageName,
            villageDid,
            x,
            y,
            units
        });
    });

    currentResults = results;
    displayResults();
}

function displayResults() {
    const resultsDiv = document.getElementById('results-section');
    resultsDiv.innerHTML = '';

    if (currentResults.length === 0) {
        resultsDiv.innerHTML = '<p>No data found.</p>';
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    
    // Create Header Row
    let headerHtml = '<tr><th>Village</th><th>Coords</th>';
    tribeUnits.forEach(unit => {
        // Use image or name. Name is safer for text.
        headerHtml += `<th title="${unit.name} (Speed: ${unit.speed})">${unit.name.substring(0, 3)}</th>`;
    });
    headerHtml += '<th title="Hero (Speed: 7)">Her</th>'; // Hero Header
    headerHtml += '<th>Time</th></tr>';
    
    thead.innerHTML = headerHtml;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    
    currentResults.forEach((res, rowIdx) => {
        const row = document.createElement('tr');
        row.classList.add('village-row');
        
        // Village & Coords
        row.innerHTML = `
            <td>${res.villageName}</td>
            <td>(${res.x}|${res.y})</td>
        `;

        // Unit Columns
        res.units.forEach((unit, unitIdx) => {
            const cell = document.createElement('td');
            if (unit.count > 0) {
                // Checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = unit.selected;
                checkbox.dataset.row = rowIdx;
                checkbox.dataset.unit = unitIdx;
                checkbox.addEventListener('change', (e) => {
                    currentResults[rowIdx].units[unitIdx].selected = e.target.checked;
                    updateRowTime(row, currentResults[rowIdx]);
                });
                
                // Label (Count)
                const label = document.createElement('span');
                label.innerText = ` ${unit.count}`;
                
                cell.appendChild(checkbox);
                cell.appendChild(label);
            } else {
                cell.innerText = '-';
                cell.classList.add('none');
            }
            row.appendChild(cell);
        });

        // Time Column
        const timeCell = document.createElement('td');
        timeCell.classList.add('time-cell');
        timeCell.innerText = calculateTime(res);
        row.appendChild(timeCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    resultsDiv.appendChild(table);
}

function updateRowTime(rowElement, rowData) {
    const timeCell = rowElement.querySelector('.time-cell');
    if (timeCell) {
        timeCell.innerText = calculateTime(rowData);
    }
}

function recalculateAllTimes() {
    const rows = document.querySelectorAll('.village-row');
    rows.forEach((row, index) => {
        if (currentResults[index]) {
            updateRowTime(row, currentResults[index]);
        }
    });
}

function calculateTime(villageData) {
    const targetX = parseInt(document.getElementById('target-x').value);
    const targetY = parseInt(document.getElementById('target-y').value);

    if (isNaN(targetX) || isNaN(targetY)) {
        return 'Enter Target';
    }

    const selectedUnits = villageData.units.filter(u => u.selected && u.count > 0);
    
    if (selectedUnits.length === 0) {
        return '-';
    }

    // Find slowest speed
    const minSpeed = Math.min(...selectedUnits.map(u => u.speed));
    
    // Calculate Distance
    const dx = Math.abs(villageData.x - targetX);
    const dy = Math.abs(villageData.y - targetY);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate Time in Hours
    const timeHours = distance / minSpeed;
    
    return formatTime(timeHours);
}

function formatTime(hours) {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
