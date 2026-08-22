/**
 * app/api/drive/init-upload/route.js
 *
 * POST /api/drive/init-upload
 *
 * Creates a Google Drive resumable upload session SERVER-SIDE
 * and returns the upload URL to the client.
 * The client then sends chunks to /api/drive/upload-chunk.
 *
 * Body: { fileName, mimeType, folderId, fileSize }
 * Returns: { uploadUrl }
 */

import { NextResponse } from "next/server";
import { google } from "googleapis";

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob",
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { fileName, mimeType, fileSize } = body;
    const folderId = body.purpose === "ghp-id" ? process.env.GHP_ID_UPLOAD_FOLDER_ID : body.folderId;

    if (!fileName || !mimeType || !folderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: fileName, mimeType, folderId",
        },
        { status: 400 },
      );
    }

    // Get a fresh access token
    const oauth2Client = getOAuth2Client();
    const { token: accessToken } = await oauth2Client.getAccessToken();

    if (!accessToken) {
      throw new Error(
        "Failed to obtain Google access token. Check OAuth credentials.",
      );
    }

    // Initiate resumable upload session with Google Drive API
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const initRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          ...(fileSize ? { "X-Upload-Content-Length": String(fileSize) } : {}),
        },
        body: JSON.stringify(metadata),
      },
    );

    if (!initRes.ok) {
      const errorBody = await initRes.text();
      throw new Error(
        `Google Drive init failed (${initRes.status}): ${errorBody}`,
      );
    }

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("Google Drive did not return an upload URL");
    }

    return NextResponse.json({ success: true, uploadUrl });
  } catch (error) {
    console.error("Init upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initialize upload" },
      { status: 500 },
    );
  }
}
