function deleteVisit(visits, visitId) {
    for (let i = visits.length - 1; i >= 0; i--) {
        if (visits[i].id === visitId) {
            visits.splice(i, 1);
        }
    }
}

// Example usage
const visits = [
    { id: 1, name: 'Visit 1' },
    { id: 2, name: 'Visit 2' },
    { id: 3, name: 'Visit 3' }
];
deleteVisit(visits, 2);
console.log(visits); // Outputs: [{ id: 1, name: 'Visit 1' }, { id: 3, name: 'Visit 3' }]