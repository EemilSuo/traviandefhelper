document.addEventListener('DOMContentLoaded', () => {
    console.log('Travian Def Helper initialized');
    
    fetch('troopdata.json')
        .then(response => response.json())
        .then(data => {
            console.log('Troop data loaded:', data);
            // We will initialize the application with data here
            document.querySelector('#app').innerHTML = '<p>Troop data loaded successfully. Ready for instructions.</p>';
        })
        .catch(error => {
            console.error('Error loading troop data:', error);
            document.querySelector('#app').innerHTML = '<p style="color:red">Error loading troop data.</p>';
        });
});
