// visit.js

const apiKey = 'YOUR_GOOGLE_SHEETS_API_KEY';
const spreadsheetId = 'YOUR_SPREADSHEET_ID';
const visitsEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Visits?key=${apiKey}`;

let visits = [];
let currentPage = 1;
const itemsPerPage = 10;

async function fetchVisits() {
    try {
        const response = await fetch(visitsEndpoint);
        const data = await response.json();
        visits = data.values.slice(1); // Skip header row
        displayVisits();
    } catch (error) {
        console.error('Error fetching visits:', error);
    }
}

function loadVisits() {
    const totalPages = Math.ceil(visits.length / itemsPerPage);
    const visitButtons = document.getElementById('visit-buttons');
    visitButtons.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.innerText = i;
        button.onclick = () => { currentPage = i; displayVisits(); };
        visitButtons.appendChild(button);
    }
}

function displayVisits() {
    const visitTable = document.getElementById('visit-table');
    visitTable.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedVisits = visits.slice(start, end);

    paginatedVisits.forEach((visit, index) => {
        const row = document.createElement('tr');
        visit.forEach(cell => {
            const cellElement = document.createElement('td');
            cellElement.innerText = cell;
            row.appendChild(cellElement);
        });
        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Delete';
        deleteButton.onclick = () => deleteVisit(start + index);
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);
        visitTable.appendChild(row);
    });
}

function applySearch() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    visits = visits.filter(visit => {
        return visit.some(cell => cell.toLowerCase().includes(searchInput));
    });
    loadVisits();
}

function deleteVisit(index) {
    for (let i = visits.length - 1; i >= 0; i--) {
        if (i === index) {
            visits.splice(i, 1);
        }
    }
    loadVisits();
}

function handleVisitSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newVisit = [];
    formData.forEach((value) => { newVisit.push(value); });
    visits.push(newVisit);
    loadVisits();
}

fetchVisits();
loadVisits();