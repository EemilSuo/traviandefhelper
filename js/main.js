let troopData = [];

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

    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceCode, 'text/html');
    const troopsTable = doc.querySelector('#troops');

    if (!troopsTable) {
        alert('Could not find troops table in the provided source code. Make sure you are on the correct page (Village Statistics -> Troops).');
        return;
    }

    const results = [];
    const rows = troopsTable.querySelectorAll('tbody tr');
    const tribeTroops = troopData[tribeIndex];

    rows.forEach(row => {
        // Skip the header row if it exists in tbody (sometimes happens) or empty rows/sum rows
        if (row.classList.contains('empty') || row.classList.contains('sum')) return;

        const villageNameCell = row.querySelector('.villageName');
        if (!villageNameCell) return;

        const villageName = villageNameCell.innerText.trim();
        const units = [];

        // Cells 1 to 10 are standard units. Cell 11 is Hero.
        // The table has a class 'unit' on td? No, the th has 'unit'. The td just has values.
        // Let's assume the columns correspond to the tribe's units in order.
        
        const cells = row.querySelectorAll('td');
        // cell 0 is villageName (already handled)
        // cells 1-10 are units
        // cell 11 is hero

        for (let i = 1; i <= 10; i++) {
            if (cells[i]) {
                const count = parseInt(cells[i].innerText.trim()) || 0;
                if (count > 0) {
                    units.push({
                        ...tribeTroops[i-1], // i-1 because array is 0-indexed but columns are 1-10
                        count: count
                    });
                }
            }
        }
        
        // Handle Hero if needed (index 10 in array? No, hero is separate usually, but let's stick to standard units for now)

        if (units.length > 0) {
            results.push({
                villageName: villageName,
                units: units
            });
        }
    });

    displayResults(results);
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results-section');
    resultsDiv.innerHTML = '';

    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>No troops found in the provided source code.</p>';
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Village Name</th>
            <th>Troops</th>
            <th>Slowest Speed</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    results.forEach(res => {
        const row = document.createElement('tr');
        row.classList.add('village-row');

        const unitStrings = res.units.map(u => `${u.count} ${u.name}`).join(', ');
        const minSpeed = Math.min(...res.units.map(u => u.speed));

        row.innerHTML = `
            <td>${res.villageName}</td>
            <td>${unitStrings}</td>
            <td>${minSpeed} fields/hour</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    resultsDiv.appendChild(table);
}