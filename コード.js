/**
 * Google Apps Script for handling flight records
 * This script receives POST requests with location data and logs them to a spreadsheet
 */
function posttest(){
  const e = {"location":{"value":"-122.084,37.4219983"},
             "drone":"tmapex4s","sheetid":"a-N80oKGzIvgJYD4_BbmW6S_GF8mfAGIyW9o_8-OxV4","ext1":"","ext2":"","ext3":""};
  
  const a = doPost(e);
  
}
function gettest(){
  const e = {
    parameter:{"sheetid":"a-N80oKGzIvgJYD4_BbmW6S_GF8mfAGIyW9o_8-OxV4"}
  }
  const a = doGet(e);
  
}
function doGet(e) {
  try{
    Logger.log(e);
  
    if(e == null){
      Logger.log("e is null")
      return createJsonResponse({error:"gパラメータeがありません"})
    }
    
    if(!("parameter" in e)){
      return createJsonResponse({ error: "gパラメータがありません" });
    }
    if (!("sheetid" in e.parameter)) {
      return createJsonResponse({ error: "gシートIDが指定されていません" });
    }
    var sheetid = e.parameter.sheetid;
    Logger.log(sheetid);
    
    const result = getFlightState(sheetid);
    Logger.log(result);
    // Return appropriate response
    if (result.error) {
      return createJsonResponse({ error: result.error });
    }
    return createJsonResponse({ success:{isFlying:result.value} });
    
  } catch (error) {
    Logger.log("Error in doGet: " + error.toString());
    return createJsonResponse({ error: "gサーバーエラー: " + error.message });
  }
}

/**
 * Handles POST requests from iPhone shortcuts
 * @param {Object} e - The event object containing POST data
 * @return {TextOutput} JSON response
 */
function doPost(e) {
  try {
    Logger.log(e);
    // Parse the POST data
    const params = JSON.parse(e.postData.getDataAsString());
    
    // Validate required parameters
    if (!params.location || !params.location.value) {
      //ContentService.createTextOutput()
      return createJsonResponse({ error: "post位置情報がありません" });
    }
    
    if (!params.sheetid) {
      return createJsonResponse({ error: "postシートIDが指定されていません" });
    }
    
    // Process the log entry
    const result = addLog(params);
    
    // Return appropriate response
    if (result.error) {
      return createJsonResponse({ error: result.error });
    }
    
    return createJsonResponse({ success: true });
    
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return createJsonResponse({ error: "postサーバーエラー: " + error.message });
  }
}

/**
 * Creates a JSON response
 * @param {Object} data - The data to return as JSON
 * @return {TextOutput} JSON response
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(data));
  return output;
}

/**
 * Gets the current date and time in the required format
 * @return {Object} Object containing date and time strings
 */
function getCurrentDateTime() {
  const now = new Date();
  
  // Format date as YYYY/MM/DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}/${month}/${day}`;
  
  // Format time as HH:MM:SS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const time = `${hours}:${minutes}:${seconds}`;
  
  return { date, time };
}

/**
 * Parses a datetime string into date and time components
 * @param {string} strDttm - The datetime string to parse
 * @return {Object} Object containing date and time strings
 */
function parseDateTime(strDttm) {
  if (!strDttm) {
    return getCurrentDateTime();
  }
  
  const match = strDttm.match(/^([0-9]{4}\/[0-9]{2}\/[0-9]{2}) ([0-9]{2}:[0-9]{2})(:[0-9]{2})?$/);
  
  if (!match) {
    Logger.log("Invalid datetime format: " + strDttm);
    return getCurrentDateTime();
  }
  
  return {
    date: match[1],
    time: match[2] + (match[3] || '')
  };
}

/**
 * Finds the last row in a column
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {string} column - The column letter
 * @return {number|null} The last row number or null if not found
 */
function getLastRow(sheet, column) {
  try {
    // Get the data range of the column
    const dataRange = sheet.getRange(column + "3:" + column + "1000");
    const values = dataRange.getValues();
    
    // Find the first empty cell
    for (let i = 0; i < values.length; i++) {
      if (values[i][0].toString().trim() === '') {
        return i + 3; // +3 because we started from row 3
      }
    }
    
    // If we get here, we didn't find an empty cell
    return null;
  } catch (error) {
    Logger.log("Error in getLastRow: " + error.toString());
    return null;
  }
}

function getFlightState(sheetid){
   try {
    
    // Get the spreadsheet and sheet
    const sheetName = "飛行日誌";
    var spreadsheet = undefined;
    try{
      spreadsheet = SpreadsheetApp.openById(sheetid);
    }catch( error ){
      Logger.log("cant open sheet")
      return {error:"シート「" + sheetid + "」が見つかりません"}
    }
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    
    if (!sheet) {
      return { error: "シート「" + sheetName + "」が見つかりません" };
    }
        
    // Find the last row
    const lastRow = getLastRow(sheet, "D");
    if (lastRow === null) {
      return { error: "1000エントリを超えました。新しいシートを作成してください" };
    }
    
    // Check if this is a start or end record
    const previousValue = sheet.getRange("J" + (lastRow - 1)).getValue();
    
    if (previousValue != 0) { //start empty
      return {value:false,error:null};
    }else{
            return {value:true,error:null};

    }
   }catch (error) {
    Logger.log("Error in getFlightState: " + error.toString());
    return { error: "フライトステータス取得中にエラーが発生しました: " + error.message ,value:null};
  }
}
/**
 * Adds a log entry to the spreadsheet
 * @param {Object} params - The parameters containing log data
 * @return {Object} Result object with success/error information
 */
function addLog(params) {
  try {
    const strGPS = params.location.value;
    const strDttm = params.dttm;
    const strSheetID = params.sheetid;
    const strDrone = params.drone;
    
    // Get the spreadsheet and sheet
    const sheetName = "飛行日誌";
    var spreadsheet = undefined;
    try{
      spreadsheet = SpreadsheetApp.openById(strSheetID.trim());
    }catch (err){
      Logger.log("cant open sheet")
      return {error:"指定されたシートが開けませんでした"}
    }
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return { error: "シート「" + sheetName + "」が見つかりません" };
    }
    
    // Get current date and time
    const dateTime = parseDateTime(strDttm);
    const strDate = dateTime.date;
    const strTime = dateTime.time;
    
    // Find the last row
    const lastRow = getLastRow(sheet, "D");
    if (lastRow === null) {
      return { error: "1000エントリを超えました。新しいシートを作成してください" };
    }
    
    // Check if this is a start or end record
    const previousValue = sheet.getRange("J" + (lastRow - 1)).getValue();
    
    if (previousValue != 0) { // This is a start record
      Logger.log("Start record: " + strDate + ", " + strGPS + ", " + strTime);
      
      // Batch the updates for better performance
      const updates = [
        { range: "B" + lastRow, value: strDrone },
        { range: "D" + lastRow, value: strDate },
        { range: "G" + lastRow, value: strGPS },
        { range: "I" + lastRow, value: strTime }
      ];
      
      // Apply all updates at once
      updates.forEach(update => {
        sheet.getRange(update.range).setValue(update.value);
      });
      
      return { success: true };
    } else {
      // This is an end record
      Logger.log("End record: " + strGPS + ", " + strTime);
      
      // Check if the end time is already registered
      const endTimeValue = sheet.getRange("J" + (lastRow - 1)).getValue();
      
      if (endTimeValue.toString().trim().length === 0) {
        // Set the end location and time
        sheet.getRange("H" + (lastRow - 1)).setValue(strGPS);
        sheet.getRange("J" + (lastRow - 1)).setValue(strTime);
        return { success: true };
      } else {
        return { error: "既に登録済みです" };
      }
    }
  } catch (error) {
    Logger.log("Error in addLog: " + error.toString());
    return { error: "ログの追加中にエラーが発生しました: " + error.message };
  }
}


