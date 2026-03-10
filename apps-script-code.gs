// Google Apps Script Code for Visit Management System
// This script handles GET and POST requests for inspectors, institutions, and visits sheets

function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  const sheetName = params.sheet || params.sheetName;

  if (action === 'get' && sheetName) {
    return getSheetData(sheetName);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Invalid action or sheet name' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const sheetName = data.sheet || data.sheetName;

  if (action === 'insert' && sheetName && data.data) {
    return insertSheetData(sheetName, data.data);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Invalid action or data' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: `Sheet '${sheetName}' not found` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const values = sheet.getDataRange().getValues();

    return ContentService
      .createTextOutput(JSON.stringify(values))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function insertSheetData(sheetName, data) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: `Sheet '${sheetName}' not found` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Convert object to array if needed
    let rowData;
    if (Array.isArray(data)) {
      rowData = data;
    } else {
      // Assuming data is an object, convert to array in order
      // For inspectors: ['المعرف', 'الاسم', 'التخصص', 'المرحلة', 'الرتبة', 'الهاتف']
      // For institutions: ['المعرف', 'البلدية', 'اسم المؤسسة', 'المرحلة', 'مدير المؤسسة', 'المسير المالي']
      // For visits: use the FIELD_NAMES from visit.js
      rowData = Object.values(data);
    }

    // Add timestamp for new records
    if (sheetName !== 'visits') {
      rowData.unshift(new Date()); // Add timestamp at the beginning
    }

    sheet.appendRow(rowData);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Function to initialize sheets if they don't exist
function initializeSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // Inspectors sheet
  let inspectorsSheet = spreadsheet.getSheetByName('inspectors');
  if (!inspectorsSheet) {
    inspectorsSheet = spreadsheet.insertSheet('inspectors');
    inspectorsSheet.appendRow(['المعرف', 'timestamp', 'الاسم', 'التخصص', 'المرحلة', 'الرتبة', 'الهاتف']);
  }

  // Institutions sheet
  let institutionsSheet = spreadsheet.getSheetByName('institutions');
  if (!institutionsSheet) {
    institutionsSheet = spreadsheet.insertSheet('institutions');
    institutionsSheet.appendRow(['المعرف', 'timestamp', 'البلدية', 'اسم المؤسسة', 'المرحلة', 'مدير المؤسسة', 'المسير المالي']);
  }

  // Visits sheet (assuming it exists or create with headers)
  let visitsSheet = spreadsheet.getSheetByName('visits');
  if (!visitsSheet) {
    visitsSheet = spreadsheet.insertSheet('visits');
    visitsSheet.appendRow([
      'المعرف', 'timestamp', 'اسم المفتش', 'التخصص', 'المرحلة',
      'اسم المعني بالزيارة', 'الرتبة', 'الدرجة', 'المؤسسة',
      'تاريخ الزيارة', 'نوع الزيارة', 'النقطة', 'العقوبات',
      'الملاحظة', 'الموسم الدراسي'
    ]);
  }
}