# MTV Portal - Google Sheets & Apps Script Setup Guide

This guide will help you migrate quiz data to Google Sheets and set up automatic certificate generation using Google Apps Script.

## Step 1: Set Up Google Sheets Structure

### 1.1 Create New Tabs in Your Google Sheet

Open your existing Google Sheet and create these new tabs:

#### Tab: `Quiz_Questions`

| Column | Header        | Example                                                                 |
| ------ | ------------- | ----------------------------------------------------------------------- |
| A      | id            | 1                                                                       |
| B      | question      | What is the minimum temperature requirement for chilled meat transport? |
| C      | option1       | 0°C to 4°C                                                              |
| D      | option2       | 0°C to 7°C                                                              |
| E      | option3       | -5°C to 0°C                                                             |
| F      | option4       | 5°C to 10°C                                                             |
| G      | correct_index | 1                                                                       |

**Important:** Add all your quiz questions here. The `correct_index` is 0-based (0 = first option, 1 = second option, etc.).

#### Tab: `Quiz_Config`

| Column | Header | Value           |
| ------ | ------ | --------------- |
| A      | key    | pass_threshold  |
| B      | value  | 0.7             |
| A      | key    | total_questions |
| B      | value  | 5               |

#### Tab: `Quiz_Attempts`

This tab will be automatically populated by the app. Headers will be:

- attempt_id
- timestamp
- name
- email
- score
- total_questions
- pct
- status (PASSED/FAILED)
- cert_number
- completed_at

## Step 2: Create Google Slides Certificate Template

### 2.1 Create a New Google Slides Presentation

1. Go to [slides.google.com](https://slides.google.com) and create a new presentation
2. Design your certificate template
3. Use these placeholders that will be automatically replaced:
   - `{{NAME}}` - Student's full name
   - `{{CERT_NUMBER}}` - Certificate number (e.g., GHP-2026-1234)
   - `{{SCORE}}` - Score percentage (e.g., 80%)
   - `{{DATE}}` - Completion date

### 2.2 Get the Template ID

The template ID is in the URL: `https://docs.google.com/presentation/d/TEMPLATE_ID_HERE/edit`

## Step 3: Set Up Google Apps Script

### 3.1 Open Apps Script Editor

1. Open your Google Sheet
2. Go to **Extensions > Apps Script**
3. Delete the default code
4. Copy and paste the code from `google-apps-script.js`
5. Update the configuration variables at the top:
   ```javascript
   const TEMPLATE_SLIDES_ID = "YOUR_SLIDES_TEMPLATE_ID_HERE";
   const CERTIFICATES_FOLDER_ID = "YOUR_DRIVE_FOLDER_ID_HERE";
   const SPREADSHEET_ID = "YOUR_SHEET_ID_HERE";
   ```

### 3.2 Create Certificates Folder

1. Go to [drive.google.com](https://drive.google.com)
2. Create a new folder called "MTV Certificates"
3. Get the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### 3.3 Set Up Triggers

In the Apps Script editor:

1. Click the **clock icon** (Triggers) on the left sidebar
2. Click **+ Add Trigger** at the bottom
3. Configure:
   - Function: `checkForNewCertificates`
   - Event source: `Time-driven`
   - Type: `Minutes timer`
   - Interval: `Every 5 minutes`
4. Click **Save**

### 3.4 Authorize the Script

1. Run the `setup()` function once to create the trigger
2. Grant all requested permissions when prompted

## Step 4: Test the System

### 4.1 Test Quiz Data Loading

1. Restart your Next.js dev server
2. Visit the GHP page
3. The quiz should now load questions from Google Sheets

### 4.2 Test Certificate Generation

1. Take the quiz and pass it
2. Check the `Quiz_Attempts` tab - you should see a new row
3. Wait 5 minutes or manually run `checkForNewCertificates()` in Apps Script
4. Check your email for the certificate
5. Verify the certificate was saved in your "MTV Certificates" Drive folder

## Troubleshooting

### Quiz Questions Not Loading

- Check that the `Quiz_Questions` tab exists and has the correct column headers
- Verify the Google Sheets API permissions
- Check browser console for errors

### Certificate Generation Fails

- Verify the Slides template ID is correct
- Ensure the template has the required placeholders
- Check that the certificates folder exists and is accessible
- Review Apps Script execution logs

### Apps Script Permissions

- Make sure you've granted all requested permissions
- The script needs access to Gmail, Drive, and Sheets APIs

## Advanced Configuration

### Custom Certificate Design

Edit the `generateCertificate()` function to customize:

- Font styles and sizes
- Colors and layouts
- Additional text fields
- Images and logos

### Email Templates

Modify the `sendCertificateEmail()` function to customize:

- Email subject and body
- Sender name
- Additional attachments

### Automation Frequency

Change the trigger interval in step 3.3 for more/less frequent checking.

## Security Notes

- The Apps Script runs with your Google account permissions
- Be careful with the certificate template access
- Regularly review the generated certificates folder permissions
- Consider setting up separate service accounts for production use
