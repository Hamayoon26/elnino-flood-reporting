# El Niño Flood Reporting

A web app for Area-Based Coordination forums in Somalia. People enter a district code, then can:

1. **Flood Impact entry**: the El Niño Impact Reporting Form, one settlement or site per record
2. **Flood Response entry**: a table of affected villages where partners report people reached by sector
3. **Flood Impact Report**: Location Summary and Location Detail
4. **Flood Response Report**: Village Settlement Summary, Partner Mapping and Org Village entries

IM codes open buttons 1 and 4. RM codes open buttons 2 and 3. An ALL code opens everything. Every code only sees and changes data for its own districts.

## How it fits together

- **This repository** holds the web page (`index.html`). GitHub Pages hosts it for free.
- **A Google Sheet** stores the data and the codes, in three tabs: `Codes`, `Impact` and `Response`.
- **A Google Apps Script** attached to that Sheet is the server. It checks each code and returns only that code's districts. The codes never appear in the public page.

## Setup (about 10 minutes)

### 1. Create the Google Sheet and script

1. Create a new Google Sheet, for example "El Niño Flood Reporting data".
2. Open **Extensions → Apps Script**.
3. Delete the sample code and paste in everything from `apps-script/Code.gs`. Save.
4. In the function menu at the top, choose **setup** and press **Run**. Approve the permissions when asked. This creates the `Codes`, `Impact` and `Response` tabs.

### 2. Add the codes

1. Open the `Codes` tab.
2. Paste in the rows from `codes-PRIVATE.csv`, which is sent separately and is **not** in this repository. Alternatively, use **File → Import → Upload**, choose "Replace current sheet", and make sure the tab is still named `Codes`.
3. Columns are: Code, Type (`IM`, `RM` or `ALL`), District Kobo codes separated by commas, and district names for reference. Edit this tab any time to add, change or remove codes. Changes apply straight away.

### 3. Deploy the script as a web app

1. In Apps Script, click **Deploy → New deployment**.
2. Click the gear icon, then choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

### 4. Connect the page

1. Edit `config.js` in this repository and paste the URL between the quotes:
   ```js
   window.FLOOD_API_URL = "https://script.google.com/macros/s/AKfy.../exec";
   ```
2. Commit the change.

### 5. Turn on GitHub Pages

1. In the repository, go to **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**, then branch `main` and folder `/ (root)`. Save.
3. After a minute the site is live at `https://<your-username>.github.io/<repository-name>/`.

## Updating the script later

If you change `Code.gs`, go to **Deploy → Manage deployments**, edit the existing deployment and choose **New version**. This keeps the same URL, so `config.js` doesn't need changing.

## Using the data in Power BI

Connect Power BI to the Google Sheet. One way: **File → Share → Publish to web** as CSV for each tab, then **Get data → Web**. The `Impact` and `Response` tabs have one row per record, with column names matching the Kobo field names.

## District codes

District values use the Kobo form's district list (`cabudwaaq`, `kaxda`, `burao`, ...). The `Codes` tab must use those codes.
