/**
 * Writing Center — sync Google Form submissions to Code4Community.
 *
 * Setup:
 * 1. Open the form → Responses → Link to Sheets → create/select spreadsheet.
 * 2. Extensions → Apps Script → paste this file.
 * 3. Project Settings → Script properties:
 *      WC_SYNC_URL = https://code4community.net/api/writing-center/google-form-sync
 *      (or http://localhost:3000/api/... for local testing)
 *      WC_SYNC_SECRET = same value as WRITING_CENTER_GOOGLE_FORM_SYNC_SECRET on the server
 * 4. Triggers → Add trigger → onFormSubmit → From form → your form → Save → authorize.
 * 5. Submit a test response while logged into Code4Community with the same email.
 */

function onFormSubmit(e) {
  var props = PropertiesService.getScriptProperties();
  var syncUrl = props.getProperty("WC_SYNC_URL");
  var secret = props.getProperty("WC_SYNC_SECRET");

  if (!syncUrl || !secret) {
    console.error("Set WC_SYNC_URL and WC_SYNC_SECRET in Script properties.");
    return;
  }

  var response = e.response;
  var fields = {};

  response.getItemResponses().forEach(function (item) {
    var title = item.getItem().getTitle();
    fields[title] = item.getResponse();
  });

  var payload = {
    responseId: response.getId(),
    submittedAt: response.getTimestamp().toISOString(),
    fields: fields,
  };

  var res = UrlFetchApp.fetch(syncUrl, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    console.error("Sync failed (" + code + "): " + res.getContentText());
  }
}
