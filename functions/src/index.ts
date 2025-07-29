import * as functions from "firebase-functions";
import { google } from "googleapis";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Load service account credentials
const serviceAccount = require("../service-account.json");

// Define the ID of your Google Sheet and the name of the sheet/tab
const SPREADSHEET_ID = "1U1fp0GfkgQpVdziikppJ5H-7XdHO2zTEYAv_84E_meg"; // <--- วาง ID ของ Google Sheet ที่นี่
const SHEET_NAME = "Sheet1"; // <--- หรือชื่อชีตที่คุณใช้

// Configure the Google Sheets API client
const sheets = google.sheets({
  version: "v4",
  auth: new google.auth.JWT(
    serviceAccount.client_email,
    undefined,
    serviceAccount.private_key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  ),
});

/**
 * Triggered when a new score document is created in Firestore.
 * Appends the new score data to the specified Google Sheet.
 */
export const appendScoreToSheet = functions.firestore
  .document("scores/{scoreId}")
  .onCreate(async (snap, context) => {
    const newScore = snap.data();

    // Log the data for debugging
    functions.logger.info("New score received:", newScore);

    try {
      // Prepare the row data in the correct order
      const rowData = [
        new Date().toISOString(), // timestamp
        newScore.userName,
        newScore.department,
        newScore.setName,
        newScore.score,
        newScore.totalQuestions,
        newScore.percentage,
        newScore.cheatAttempts || 0,
        newScore.penaltyPoints || 0,
      ];

      // Append the new row to the Google Sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });

      functions.logger.info("Successfully appended to Google Sheet.");
      return null;
    } catch (error) {
      functions.logger.error("Error appending to Google Sheet:", error);
      return null;
    }
  });
