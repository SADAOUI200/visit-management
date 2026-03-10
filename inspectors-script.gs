/**
 * Google Apps Script for "inspectors" Sheet
 * Copy this code into your Google Apps Script editor
 * 
 * الحقول:
 * - المعرّف
 * - الاسم الكامل
 * - التخصص
 * - المرحلة
 * - الرتبة الوظيفية
 * - رقم الهاتف
 */

// Handle GET requests to fetch inspectors data
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

    if (action === 'get' && sheetName === 'inspectors') {
      return getInspectorsData();
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

// Handle POST requests to add new inspectors
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

    if (action === 'insert' && sheetName === 'inspectors') {
      return addNewInspector(data.data);
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

// Get all inspectors from the sheet
function getInspectorsData() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName('inspectors');

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

// Add new inspector to the sheet
function addNewInspector(inspectorData) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName('inspectors');

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet('inspectors');
      // Add headers
      sheet.appendRow([
        'المعرّف',
        'الاسم الكامل',
        'التخصص',
        'المرحلة',
        'الرتبة الوظيفية',
        'رقم الهاتف'
      ]);
    }

    // Prepare row data in correct order
    const rowData = [
      inspectorData['المعرّف'] || generateId('INS'),
      inspectorData['الاسم الكامل'] || '',
      inspectorData['التخصص'] || '',
      inspectorData['المرحلة'] || '',
      inspectorData['الرتبة الوظيفية'] || '',
      inspectorData['رقم الهاتف'] || ''
    ];

    // Add new row
    sheet.appendRow(rowData);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Inspector added successfully' }))
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
function setupInspectorsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('inspectors');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('inspectors');
    sheet.appendRow([
      'المعرّف',
      'الاسم الكامل',
      'التخصص',
      'المرحلة',
      'الرتبة الوظيفية',
      'رقم الهاتف'
    ]);
    Logger.log('Inspectors sheet created successfully');
  } else {
    Logger.log('Inspectors sheet already exists');
  }
}