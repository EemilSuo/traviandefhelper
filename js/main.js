let troopData = [];
let currentResults = [];
let tribeUnits = [];
let targetCoordinates = { x: null, y: null }; // Store target coordinates here

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

    const processBtn = document.getElementById('process-btn');
    if (processBtn) {
        processBtn.addEventListener('click', processSourceCode);
    }
    
    const targetUrlInput = document.getElementById('target-url');
    if (targetUrlInput) {
        targetUrlInput.addEventListener('input', (e) => {
            const url = e.target.value;
            const xMatch = url.match(/[?&]x=(-?\d+)/);
            const yMatch = url.match(/[?&]y=(-?\d+)/);
            
            if (xMatch && yMatch) {
                targetCoordinates.x = parseInt(xMatch[1]);
                targetCoordinates.y = parseInt(yMatch[1]);
                recalculateAllTimes();
            } else {
                targetCoordinates.x = null;
                targetCoordinates.y = null;
                recalculateAllTimes();
            }
        });
    }
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
        
        let villageDid = null;
        if (link) {
            const href = link.getAttribute('href');
            const match = href.match(/newdid=(\d+)/);
            if (match) villageDid = match[1];
        }

        let x = 0, y = 0;
        if (villageDid) {
            const sidebarEntry = doc.querySelector(`.listEntry.village[data-did="${villageDid}"]`);
            if (sidebarEntry) {
                const coordX = sidebarEntry.querySelector('.coordinateX');
                const coordY = sidebarEntry.querySelector('.coordinateY');
                if (coordX && coordY) {
                    const cleanX = coordX.innerText.replace(/\u2212/g, '-').replace(/[^\d-]/g, '');
                    const cleanY = coordY.innerText.replace(/\u2212/g, '-').replace(/[^\d-]/g, '');
                    x = parseInt(cleanX) || 0;
                    y = parseInt(cleanY) || 0;
                }
            }
        }

        const units = [];
        const cells = row.querySelectorAll('td');

        for (let i = 1; i <= 10; i++) {
            if (cells[i]) {
                const count = parseInt(cells[i].innerText.replace(/[^\d]/g, '')) || 0;
                units.push({
                    ...tribeUnits[i-1],
                    count: count,
                    selected: count > 0,
                    sendAmount: count // Default to max
                });
            }
        }
        
        if (cells[11]) {
            const heroCount = parseInt(cells[11].innerText.replace(/[^\d]/g, '')) || 0;
            units.push({
                name: "Hero",
                speed: 7, 
                count: heroCount,
                selected: heroCount > 0,
                sendAmount: heroCount
            });
        }

        results.push({
            villageName,
            villageDid,
            x,
            y,
            units,
            tsLevel: 0, // Tournament Square Level (0-20)
            artefactSpeed: 1 // Artefact Multiplier (1x, 1.5x, 2x, etc.)
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
    
    let headerHtml = '<tr><th>Village</th><th>Coords</th><th>TS Level</th><th>Artefact</th>';
    tribeUnits.forEach(unit => {
        headerHtml += `<th title="${unit.name} (Speed: ${unit.speed})">${unit.name.substring(0, 3)}</th>`;
    });
    headerHtml += '<th title="Hero (Speed: 7)">Her</th><th>Time</th></tr>';
    
    thead.innerHTML = headerHtml;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    
    currentResults.forEach((res, rowIdx) => {
        const row = document.createElement('tr');
        row.classList.add('village-row');
        
        // Village & Coords
        const infoCell = document.createElement('td');
        infoCell.innerText = res.villageName;
        row.appendChild(infoCell);

        const coordsCell = document.createElement('td');
        coordsCell.innerText = `(${res.x}|${res.y})`;
        row.appendChild(coordsCell);

        // TS Level Input
        const tsCell = document.createElement('td');
        const tsInput = document.createElement('input');
        tsInput.type = 'number';
        tsInput.min = 0;
        tsInput.max = 20;
        tsInput.value = res.tsLevel;
        tsInput.style.width = '40px';
        tsInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value) || 0;
            if (val > 20) val = 20;
            if (val < 0) val = 0;
            e.target.value = val;
            currentResults[rowIdx].tsLevel = val;
            updateRowTime(row, currentResults[rowIdx]);
        });
        tsCell.appendChild(tsInput);
        row.appendChild(tsCell);

        // Artefact Select
        const artCell = document.createElement('td');
        const artSelect = document.createElement('select');
        [1, 1.5, 2, 3].forEach(mult => {
            const opt = document.createElement('option');
            opt.value = mult;
            opt.innerText = mult === 1 ? 'None' : `${mult}x`;
            artSelect.appendChild(opt);
        });
        artSelect.value = res.artefactSpeed;
        artSelect.addEventListener('change', (e) => {
            currentResults[rowIdx].artefactSpeed = parseFloat(e.target.value);
            updateRowTime(row, currentResults[rowIdx]);
        });
        artCell.appendChild(artSelect);
        row.appendChild(artCell);

        // Unit Columns
        res.units.forEach((unit, unitIdx) => {
            const cell = document.createElement('td');
            if (unit.count > 0) {
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.alignItems = 'center';

                // Checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = unit.selected;
                checkbox.addEventListener('change', (e) => {
                    currentResults[rowIdx].units[unitIdx].selected = e.target.checked;
                    updateRowTime(row, currentResults[rowIdx]);
                });
                
                // Amount Input
                const numberInput = document.createElement('input');
                numberInput.type = 'number';
                numberInput.min = 0;
                numberInput.max = unit.count;
                numberInput.value = unit.sendAmount;
                numberInput.style.width = '50px';
                numberInput.addEventListener('input', (e) => {
                    let val = parseInt(e.target.value) || 0;
                    if (val > unit.count) val = unit.count;
                    if (val < 0) val = 0;
                    e.target.value = val;
                    currentResults[rowIdx].units[unitIdx].sendAmount = val;
                    
                    // Auto-select checkbox if amount > 0, deselect if 0
                    if (val > 0 && !checkbox.checked) {
                        checkbox.checked = true;
                        currentResults[rowIdx].units[unitIdx].selected = true;
                    } else if (val === 0 && checkbox.checked) {
                        checkbox.checked = false;
                        currentResults[rowIdx].units[unitIdx].selected = false;
                    }
                    updateRowTime(row, currentResults[rowIdx]);
                });

                container.appendChild(checkbox);
                container.appendChild(numberInput);
                container.appendChild(document.createTextNode(` / ${unit.count}`)); // Show max
                cell.appendChild(container);
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
    if (targetCoordinates.x === null || targetCoordinates.y === null) {
        return 'Enter URL';
    }

    // Filter units that are selected AND have a send amount > 0
    const selectedUnits = villageData.units.filter(u => u.selected && u.sendAmount > 0);
    
    if (selectedUnits.length === 0) {
        return '-';
    }

    // Find slowest base speed
    const minSpeed = Math.min(...selectedUnits.map(u => u.speed));
    
    // Apply Artefact Multiplier
    const enhancedSpeed = minSpeed * villageData.artefactSpeed;

    // Calculate Distance
    const dx = Math.abs(villageData.x - targetCoordinates.x);
    const dy = Math.abs(villageData.y - targetCoordinates.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate Time
    let timeHours = 0;
    if (distance <= 20) {
        timeHours = distance / enhancedSpeed;
    } else {
        // Tournament Square Logic
        const tsLevel = villageData.tsLevel || 0;
        const tsMultiplier = 1 + (tsLevel * 0.2); // 20% per level
        
        // First 20 fields at normal (enhanced) speed
        const timeFirst20 = 20 / enhancedSpeed;
        
        // Remaining distance at TS speed
        const timeRest = (distance - 20) / (enhancedSpeed * tsMultiplier);
        
        timeHours = timeFirst20 + timeRest;
    }
    
    return formatTime(timeHours);
}

function formatTime(hours) {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
