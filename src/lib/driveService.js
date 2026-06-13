import { google } from "googleapis";
import { Readable } from "stream";

let _drive = null;

function getDriveClient() {
  if (_drive) return _drive;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob",
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  _drive = google.drive({ version: "v3", auth: oauth2Client });
  return _drive;
}

/**
 * Creates a sub-folder inside the root MTV Applications folder.
 * Each application gets its own sub-folder for clean organisation.
 * @param {string} folderName
 * @returns {Promise<string>} The new sub-folder's Drive ID
 */
export async function createApplicationFolder(folderName) {
  const drive = getDriveClient();
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!parentId) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID in environment variables.");
  }

  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return res.data.id;
}

/**
 * Uploads a single file (as a Buffer) into a Drive folder.
 * @param {{ fileName: string; mimeType: string; buffer: Buffer; folderId: string }} options
 * @returns {Promise<{ fileId: string; webViewLink: string }>}
 */
export async function uploadFileToDrive({
  fileName,
  mimeType,
  buffer,
  folderId,
}) {
  const drive = getDriveClient();
  const readable = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: readable,
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink ?? "",
  };
}

export async function listFolderFiles(folderId) {
  if (!folderId) return [];

  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink, webContentLink, modifiedTime)",
    orderBy: "name",
    pageSize: 100,
  });

  return (res.data.files || [])
    .map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink || "",
      webContentLink: file.webContentLink || "",
      modifiedTime: file.modifiedTime || "",
    }))
    .sort((a, b) => {
      const aProof = a.name.toLowerCase().includes("proof_of_payment");
      const bProof = b.name.toLowerCase().includes("proof_of_payment");
      if (aProof !== bProof) return aProof ? -1 : 1;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
}

export async function trashDriveFiles(fileIds = []) {
  const ids = [...new Set(fileIds.filter(Boolean))];
  if (!ids.length) return [];

  const drive = getDriveClient();
  await Promise.all(
    ids.map((fileId) =>
      drive.files.update({
        fileId,
        requestBody: { trashed: true },
      }),
    ),
  );

  return ids;
}

export async function deleteReplacedApplicationFiles({
  folderId,
  refNumber,
  docIds = [],
  keepFileIds = [],
}) {
  if (!folderId || !refNumber || !docIds.length) return [];

  const keepSet = new Set(keepFileIds.filter(Boolean));
  const docPrefixes = docIds.map((docId) => `${refNumber}_${docId}_`);
  const files = await listFolderFiles(folderId);
  const targets = files.filter(
    (file) =>
      !keepSet.has(file.id) &&
      docPrefixes.some((prefix) => file.name.startsWith(prefix)),
  );
  const drive = getDriveClient();

  await Promise.all(
    targets.map((file) =>
      drive.files.update({
        fileId: file.id,
        requestBody: { trashed: true },
      }),
    ),
  );

  return targets;
}

export async function deleteReplacedProofPaymentFiles({
  folderId,
  refNumber,
  keepFileIds = [],
}) {
  if (!folderId || !refNumber) return [];

  const keepSet = new Set(keepFileIds.filter(Boolean));
  const prefix = `${refNumber}_proof_of_payment_`;
  const targets = (await listFolderFiles(folderId)).filter(
    (file) => !keepSet.has(file.id) && file.name.startsWith(prefix),
  );
  const trashedByPrefix = await trashDriveFiles(targets.map((file) => file.id));

  return targets.filter((file) => trashedByPrefix.includes(file.id));
}

/**
 * Converts a base64 data URL (from FileReader.readAsDataURL) to a Buffer
 * and extracts the MIME type.
 * @param {string} dataUrl
 * @returns {{ buffer: Buffer; mimeType: string }}
 */
export function base64ToBuffer(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid base64 data URL format");

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}
