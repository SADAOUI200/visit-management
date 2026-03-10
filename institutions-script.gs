/**
 * Google Apps Script for "institutions" Sheet
 * Copy this code into your Google Apps Script editor
 * 
 * الحقول:
 * - المعرّف
 * - البلدية
 * - اسم المؤسسة
 * - المرحلة
 * - مدير المؤسسة
 * - المسيّر المالي
 */

// Handle GET requests to fetch institutions data
function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'No parameters provided' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const params = e.parameter;
    const action = params.action;
    const sheetName = params.sheet || params.sheetName;

    if (action === 'get' && sheetName === 'institutions') {
      return getInstitutionsData();
    }

    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doGet: ' + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests to add new institutions
function doPost(e) {
  try {
    if (!e || !e.postData) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'No data provided' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const sheetName = data.sheet || data.sheetName;

    if (action === 'insert' && sheetName === 'institutions') {
      return addNewInstitution(data.data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doPost: ' + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all institutions from the sheet
function getInstitutionsData() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName('institutions');

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Sheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Get all data from the sheet
    const values = sheet.getDataRange().getValues();

    // Convert 2D array to JSON with headers
    const headers = values[0];
    const data = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Add new institution to the sheet
function addNewInstitution(institutionData) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName('institutions');

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet('institutions');
      // Add headers
      sheet.appendRow([
        'المعرّف',
        'البلدية',
        'اسم المؤسسة',
        'المرحلة',
        'مدير المؤسسة',
        'المسيّر المالي'
      ]);
    }

    // Prepare row data in correct order
    const rowData = [
      institutionData['المعرّف'] || generateId('INST'),
      institutionData['البلدية'] || '',
      institutionData['اسم المؤسسة'] || '',
      institutionData['المرحلة'] || '',
      institutionData['مدير المؤسسة'] || '',
      institutionData['المسيّر المالي'] || ''
    ];

    // Add new row
    sheet.appendRow(rowData);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Institution added successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Generate unique ID
function generateId(prefix) {
  return (prefix || 'ID') + '-' + Math.random().toString(36).substr(2, 8).toUpperCase()
    + '-' + Date.now().toString(36).toUpperCase();
}

// Setup function - Run this once to initialize the sheet
function setupInstitutionsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('institutions');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('institutions');
    sheet.appendRow([
      'المعرّف',
      'البلدية',
      'اسم المؤسسة',
      'المرحلة',
      'مدير المؤسسة',
      'المسيّر المالي'
    ]);
    Logger.log('Institutions sheet created successfully');
  } else {
    Logger.log('Institutions sheet already exists');
  }
}