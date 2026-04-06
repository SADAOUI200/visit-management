function deleteVisit(visitId) {
    const sheet = SpreadsheetApp.openByUrl(getSheetURL()).getSheetByName('visit');
    const visits = sheet.getDataRange().getValues();
    let found = false;

    for (let i = 1; i < visits.length; i++) {
        if (visits[i][0] === visitId) {
            sheet.deleteRow(i + 1);
            found = true;
            break;
        }
    }

    if (found) {
        showToast('Visit deleted successfully.');
    } else {
        showToast('Error: Visit not found.');
    }
}