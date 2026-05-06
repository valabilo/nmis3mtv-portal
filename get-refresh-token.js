/**
 * get-refresh-token.js
 * Run this script to get your Google OAuth refresh token for Drive access.
 * Usage:
 * 1. Set your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 * 2. Run: node get-refresh-token.js
 * 3. Visit the authorization URL in your browser
 * 4. Copy the authorization code and paste it when prompted
 * 5. Copy the refresh token to your .env.local file as GOOGLE_REFRESH_TOKEN
 */

import "dotenv/config";
import { google } from "googleapis";
import readline from "readline";

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000",
);

async function getRefreshToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("\n🔗 Visit this URL in your browser:\n");
  console.log(authUrl);
  console.log("\n📋 Grant permission and copy the authorization code.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the authorization code: ", async (code) => {
    try {
      const { tokens } = await oauth2Client.getToken(code);

      console.log("\n✅ Success! Add these to your .env.local file:\n");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID}`);
      console.log(`GOOGLE_CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET}`);
      console.log(
        `GOOGLE_DRIVE_FOLDER_ID=${process.env.GOOGLE_DRIVE_FOLDER_ID || "your_folder_id_here"}`,
      );
      console.log(
        `GOOGLE_SHEET_ID=${process.env.GOOGLE_SHEET_ID || "your_sheet_id_here"}`,
      );
    } catch (error) {
      console.error("\n❌ Error getting token:", error.message);
      console.error(
        "\nMake sure your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct in .env.local",
      );
    }
    rl.close();
  });
}

getRefreshToken();
