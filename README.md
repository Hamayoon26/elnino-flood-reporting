# El Niño Flood Reporting

A web app for Area-Based Coordination forums in Somalia. People enter a district code, then can:

1. **Daily Qualitative Information entry**: a short daily narrative per district (organisation, ABC role, when the crisis began, event status, region, district, description), saved to the `Qualitative` tab
2. **Flood Impact entry**: the El Niño Impact Reporting Form, one settlement or site per record
3. **Flood Response entry**: a table of affected villages where partners report people reached by sector
4. **Flood Impact Report**: Location Summary and Location Detail
5. **Flood Response Report**: Village Settlement Summary, Partner Mapping and Org Village entries
6. **Daily Impact Report**: every impact record, filtered by region, district, month and day, with a subtotal per district
7. **Daily Response Report**: the same for response entries
8. **Daily Qualitative Report**: every qualitative entry, filtered by region, district, month and day

All five reports have Month and Day filters and an Export to Excel button.

Code types (column B of the `Codes` tab):

| Type | Opens | Notes |
|---|---|---|
| `IM` | 1 Daily Qualitative entry, 2 Flood Impact entry, 5 Flood Response Report | Can edit impact and qualitative records, cannot delete |
| `RM` | 3 Flood Response entry, 4 Flood Impact Report | Cannot edit or delete from the submitted list |
| `VIEW` | 4 to 8 (reports only) | Cannot enter or change data |
| `ALL` | Everything, 1 to 8 | Super code: the only type that can delete, and edit from the submitted responses list |

Every code only sees and changes data for its own districts.

## How it fits together

- **This repository** holds the web page (`index.html`). GitHub Pages hosts it for free.
- **A Google Sheet** stores the data and the codes, in three tabs: `Codes`, `Impact` and `Response`.
- **A Google Apps Script** attached to that Sheet is the server. It checks each code and returns only that code's districts. The codes never appear in the public page.

## Setup (about 10 minutes)

### 1. Create the Google Sheet and script

1. Create a new Google Sheet, for example "El Niño Flood Reporting data".
2. Open **Extensions → Apps Script**.
3. Delete the sample code and paste in everything from `apps-script/Code.gs`. Save.
4. In the function menu at the top, choose **setup** and press **Run**. Approve the permissions when asked. This creates the `Codes`, `Impact`, `Response` and `Qualitative` tabs.

### 2. Add the codes

1. Open the `Codes` tab.
2. Paste in the rows from `codes-PRIVATE.csv`, which is sent separately and is **not** in this repository. Alternatively, use **File → Import → Upload**, choose "Replace current sheet", and make sure the tab is still named `Codes`.
3. Columns are: Code, Type (`IM`, `RM`, `VIEW` or `ALL`), District Kobo codes separated by commas, and district names for reference. Edit this tab any time to add, change or remove codes. Changes apply straight away.

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
