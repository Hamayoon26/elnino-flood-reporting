/**
 * El Niño Flood Reporting — Google Apps Script backend.
 *
 * Bind this script to a Google Sheet (Extensions > Apps Script), run setup() once,
 * paste the codes into the "Codes" tab, then Deploy > New deployment > Web app
 * (Execute as: Me, Who has access: Anyone). Put the web app URL in config.js.
 *
 * The PIN codes live only in the "Codes" tab of your sheet, never in the public page.
 * Every request is checked here: a code only reads and writes data for its own districts.
 * Code types: IM (impact entry), RM (response entry), VIEW (reports only), ALL (super code: everything, incl. delete).
 */

const IMPACT_FIELDS = ['id','_savedAt','_createdAt','_pin','reporting_organisation','abc_role','crisis_type','crisis_onset',
  'report_reference','event_status','event_summary','affected_region','affected_district','affected_settlement','location_type',
  'geo_lat','geo_lon','location_reference_note','people_affected','returnees','deaths','injuries','shelters_damaged',
  'shelters_destroyed','latrines_damaged','water_points_damaged','farmland_affected','schools_affected',
  'health_facilities_affected','livestock_dead','access_status','reported_access_constraints','reported_access_note',
  'main_source','human_source_reference'];

const RESP_IND = ['Food_rations','RUTF','F75','F100','RUSF','LNS_MQ','MPCA','Hygiene_kits','Aquatabs','HH_WT_Chlor_Floc',
  'Bulk_water_treatment','MedConsultation','Med_Refferals','MobileTeams','Essential_Medicines','GP_CaseManagement',
  'Child_Protection','GBV_related','NFI_kits','ShelterKits_PlasticSheet','ChildrenEducation'];

const RESPONSE_FIELDS = ['id','_savedAt','Response_Form_Code','Reporting_Organisation_Name','affected_region','affected_district',
  'affected_settlement','report_date','response_status','TOTAL_Number_of_People'].concat(RESP_IND,
  ['_Response_Type_Other','Response_Type_Other_People_Reached','actual_start','actual_completion','remarks','confirm_accuracy']);

const QUAL_FIELDS = ['id','_savedAt','_createdAt','_pin','report_date','reporting_organisation','abc_role','crisis_onset',
  'event_status','affected_region','affected_district','event_description'];

const NUMERIC = new Set(['people_affected','returnees','deaths','injuries','shelters_damaged','shelters_destroyed',
  'latrines_damaged','water_points_damaged','farmland_affected','schools_affected','health_facilities_affected',
  'livestock_dead','TOTAL_Number_of_People','Response_Type_Other_People_Reached'].concat(RESP_IND));
const LISTS = new Set(['reported_access_constraints','main_source']);

const COLL = {
  impact:   { sheet: 'Impact',   fields: IMPACT_FIELDS,   needs: 'IM' },
  response: { sheet: 'Response', fields: RESPONSE_FIELDS, needs: 'RM' },
  qualitative: { sheet: 'Qualitative', fields: QUAL_FIELDS, needs: 'IM' },
};

/** Run once from the editor: creates the Codes, Impact, Response and Qualitative tabs with headers. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error('This script is not attached to a Google Sheet. Open your Sheet, go to Extensions > Apps Script, and paste the code there.');
  const codes = ss.getSheetByName('Codes') || ss.insertSheet('Codes');
  if (codes.getLastRow() === 0) {
    codes.getRange(1, 1, 1, 4).setValues([['Code', 'Type (IM, RM, ALL or VIEW)', 'Districts (Kobo codes, comma separated)', 'District names (for reference)']]);
    codes.setFrozenRows(1);
  }
  Object.keys(COLL).forEach(function (k) {
    const c = COLL[k];
    const sh = ss.getSheetByName(c.sheet) || ss.insertSheet(c.sheet);
    sh.getRange(1, 1, 1, c.fields.length).setValues([c.fields]);
    sh.setFrozenRows(1);
    // Plain-text format stops Sheets turning village names or dates into other values.
    c.fields.forEach(function (f, i) {
      if (!NUMERIC.has(f)) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@');
    });
  });
  SpreadsheetApp.flush();
  Logger.log('Tabs ready in "' + ss.getName() + '": ' + ss.getSheets().map(function (s) { return s.getName(); }).join(', '));
  Logger.log('Open it here: ' + ss.getUrl());
}

function doGet() {
  const ss = SpreadsheetApp.getActive();
  if (ss && (!ss.getSheetByName('Codes') || !ss.getSheetByName('Impact') || !ss.getSheetByName('Response') || !ss.getSheetByName('Qualitative'))) setup();
  return json({ ok: true, service: 'El Nino Flood Reporting API' });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'Bad request' }); }
  try {
    const who = auth(body.pin);
    if (!who) return json({ ok: false, error: 'bad_pin' });
    switch (body.action) {
      case 'login':  return json({ ok: true, types: who.types, districts: who.districts });
      case 'list':   return json({ ok: true, impact: readAll('impact', who), response: readAll('response', who), qualitative: readAll('qualitative', who) });
      case 'save':   return json(save(body.coll, body.rec, who, String(body.pin).toUpperCase()));
      case 'delete': return json(remove(body.coll, body.id, who));
      default:       return json({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Looks a code up in the Codes tab. Returns {types:[...], districts:[...]} or null. */
function auth(pin) {
  pin = String(pin || '').trim().toUpperCase();
  if (!pin) return null;
  const sh = SpreadsheetApp.getActive().getSheetByName('Codes');
  if (!sh || sh.getLastRow() < 2) return null;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues();
  const types = new Set(), districts = new Set();
  rows.forEach(function (r) {
    if (String(r[0]).trim().toUpperCase() !== pin) return;
    const t = String(r[1]).trim().toUpperCase();
    if (t === 'ALL') { types.add('IM'); types.add('RM'); types.add('SUPER'); }
    else if (t === 'VIEW') types.add('VIEW');
    else if (t) types.add(t);
    String(r[2]).split(',').forEach(function (d) { d = d.trim().toLowerCase(); if (d) districts.add(d); });
  });
  if (!types.size) return null;
  return { types: Array.from(types), districts: Array.from(districts) };
}

function sheetFor(coll) {
  const c = COLL[coll];
  if (!c) throw new Error('Unknown collection');
  return { c: c, sh: SpreadsheetApp.getActive().getSheetByName(c.sheet) };
}

function rowToObj(fields, row) {
  const o = {};
  fields.forEach(function (f, i) {
    let v = row[i];
    if (v instanceof Date) v = f.charAt(0) === '_' ? v.toISOString() : Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (NUMERIC.has(f)) v = (v === '' || v === null) ? null : Number(v);
    else if (LISTS.has(f)) v = v ? String(v).split(' ').filter(String) : [];
    else v = v === null ? '' : String(v);
    o[f] = v;
  });
  return o;
}

function objToRow(fields, o) {
  return fields.map(function (f) {
    const v = o[f];
    if (v === null || v === undefined) return '';
    if (LISTS.has(f)) return Array.isArray(v) ? v.join(' ') : String(v);
    if (NUMERIC.has(f)) { const n = Number(v); return isFinite(n) ? n : ''; }
    return String(v).slice(0, 5000);
  });
}

function readAll(coll, who) {
  const t = sheetFor(coll);
  if (!t.sh || t.sh.getLastRow() < 2) return [];
  const allowed = new Set(who.districts);
  const vals = t.sh.getRange(2, 1, t.sh.getLastRow() - 1, t.c.fields.length).getValues();
  return vals.map(function (r) { return rowToObj(t.c.fields, r); })
             .filter(function (o) { return o.id && allowed.has(o.affected_district); });
}

function findRow(sh, id) {
  if (sh.getLastRow() < 2) return -1;
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}

function save(coll, rec, who, pin) {
  const t = sheetFor(coll);
  if (!rec || !rec.id || !/^[A-Za-z0-9_.\-]{1,200}$/.test(rec.id)) throw new Error('Missing or invalid record id');
  if (who.types.indexOf(t.c.needs) < 0) return { ok: false, error: 'not_allowed' };
  if (who.districts.indexOf(rec.affected_district) < 0) return { ok: false, error: 'not_allowed' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, error: 'busy' };
  try {
    const now = new Date().toISOString();
    const r = findRow(t.sh, rec.id);
    if (r > 0) {
      const old = rowToObj(t.c.fields, t.sh.getRange(r, 1, 1, t.c.fields.length).getValues()[0]);
      if (who.districts.indexOf(old.affected_district) < 0) return { ok: false, error: 'not_allowed' };
      if (coll !== 'response') rec._createdAt = old._createdAt || now;
    } else if (coll !== 'response') rec._createdAt = now;
    rec._savedAt = now;
    if (coll === 'response') rec.Response_Form_Code = pin; else rec._pin = pin;
    const row = objToRow(t.c.fields, rec);
    if (r > 0) t.sh.getRange(r, 1, 1, row.length).setValues([row]);
    else t.sh.appendRow(row);
    return { ok: true, rec: rowToObj(t.c.fields, row) };
  } finally { lock.releaseLock(); }
}

function remove(coll, id, who) {
  const t = sheetFor(coll);
  if (who.types.indexOf('SUPER') < 0) return { ok: false, error: 'not_allowed' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, error: 'busy' };
  try {
    const r = findRow(t.sh, String(id));
    if (r < 0) return { ok: true };
    const old = rowToObj(t.c.fields, t.sh.getRange(r, 1, 1, t.c.fields.length).getValues()[0]);
    if (who.districts.indexOf(old.affected_district) < 0) return { ok: false, error: 'not_allowed' };
    t.sh.deleteRow(r);
    return { ok: true };
  } finally { lock.releaseLock(); }
}
