/**
 * Writing Center — sync Google Form submissions to Code4Community.
 *
 * Setup: docs/writing-center-google-form.md
 * Re-authorize after updates (Forms API scope for response links).
 */

function onFormSubmit(e) {
  if (!e) {
    console.error("No event object. Add an On form submit trigger and test by submitting the form.");
    return;
  }

  var props = PropertiesService.getScriptProperties();
  var syncUrl = props.getProperty("WC_SYNC_URL");
  var secret = props.getProperty("WC_SYNC_SECRET");

  if (!syncUrl || !secret) {
    console.error("Set WC_SYNC_URL and WC_SYNC_SECRET in Script properties.");
    return;
  }

  var fields = {};
  var responseId;
  var submittedAt;
  var googleFormResponseUrl = "";
  var formResponse = null;

  if (e.response) {
    formResponse = e.response;
    formResponse.getItemResponses().forEach(function (item) {
      fields[item.getItem().getTitle()] = item.getResponse();
    });
    responseId = formResponse.getId();
    submittedAt = formResponse.getTimestamp().toISOString();
  } else if (e.namedValues) {
    var named = e.namedValues;
    for (var key in named) {
      if (!named.hasOwnProperty(key)) continue;
      var val = named[key];
      fields[key] = Array.isArray(val) ? val.join(", ") : String(val);
    }
    var row = e.range ? e.range.getRow() : 0;
    responseId = "sheet-row-" + row + "-" + new Date().getTime();
    submittedAt = new Date().toISOString();
    formResponse = findFormResponseForSheetRow_(e, fields);
    if (formResponse) {
      responseId = formResponse.getId() || responseId;
      submittedAt = formResponse.getTimestamp().toISOString();
    }
  } else {
    console.error(
      "Unexpected trigger event. Recreate trigger: onFormSubmit → On form submit → " +
        "From form or From spreadsheet."
    );
    return;
  }

  googleFormResponseUrl = buildFormResponseViewUrl_(formResponse, submittedAt, fields, props);

  var payload = {
    responseId: responseId,
    submittedAt: submittedAt,
    fields: fields,
    googleFormResponseUrl: googleFormResponseUrl,
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

/** Opens this submission in Google Forms → Responses (not the spreadsheet). */
function buildFormResponseViewUrl_(formResponse, submittedAtIso, fields, props) {
  var form = FormApp.getActiveForm();
  if (!form) {
    form = getLinkedForm_();
  }
  if (!form) {
    return props.getProperty("WC_FORM_EDIT_URL") || "";
  }

  var formId = form.getId();
  var submittedAt = submittedAtIso ? new Date(submittedAtIso) : new Date();
  var email = pickEmailFromFields_(fields);

  var apiResponseId = null;
  if (formResponse) {
    apiResponseId = lookupFormsApiResponseId_(formId, submittedAt, email, formResponse.getId());
  } else {
    apiResponseId = lookupFormsApiResponseId_(formId, submittedAt, email, null);
  }

  if (apiResponseId) {
    return "https://docs.google.com/forms/d/" + formId + "/edit#response=" + apiResponseId;
  }

  return props.getProperty("WC_FORM_EDIT_URL") || form.getEditUrl();
}

/**
 * Forms API responseId matches the ID in .../edit#response= (unlike FormResponse.getId()).
 * Requires scope: https://www.googleapis.com/auth/forms.responses.readonly
 */
function lookupFormsApiResponseId_(formId, submittedAt, email, appsScriptResponseId) {
  var url =
    "https://forms.googleapis.com/v1/forms/" +
    encodeURIComponent(formId) +
    "/responses?pageSize=100";
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    console.error("Forms API list responses (" + res.getResponseCode() + "): " + res.getContentText());
    return null;
  }

  var data = JSON.parse(res.getContentText());
  if (!data.responses || !data.responses.length) return null;

  var targetMs = submittedAt.getTime();
  var bestId = null;
  var bestDelta = Infinity;

  for (var i = 0; i < data.responses.length; i++) {
    var r = data.responses[i];
    var t = new Date(r.lastSubmittedTime).getTime();
    var delta = Math.abs(t - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestId = r.responseId;
    }
    if (delta < 120000) break;
  }

  return bestId;
}

function getLinkedForm_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var formUrl = ss.getFormUrl();
    if (formUrl) return FormApp.openByUrl(formUrl);
  } catch (err) {
    console.error("getLinkedForm_: " + err);
  }
  return null;
}

function findFormResponseForSheetRow_(e, fields) {
  var form = getLinkedForm_();
  if (!form || !e.range) return null;

  var responses = form.getResponses();
  var rowIndex = e.range.getRow() - 2;
  if (rowIndex >= 0 && rowIndex < responses.length) {
    return responses[rowIndex];
  }

  var email = pickEmailFromFields_(fields);
  if (!email) return responses.length ? responses[responses.length - 1] : null;

  for (var i = responses.length - 1; i >= 0; i--) {
    var items = responses[i].getItemResponses();
    for (var j = 0; j < items.length; j++) {
      var title = (items[j].getItem().getTitle() || "").toLowerCase();
      if (title.indexOf("email") !== -1 && String(items[j].getResponse()).toLowerCase() === email) {
        return responses[i];
      }
    }
  }
  return responses.length ? responses[responses.length - 1] : null;
}

function pickEmailFromFields_(fields) {
  var keys = ["email", "email address", "lcps email", "your email", "student email", "school email"];
  for (var i = 0; i < keys.length; i++) {
    for (var title in fields) {
      if (!fields.hasOwnProperty(title)) continue;
      if (title.toLowerCase().indexOf(keys[i]) !== -1) {
        var v = String(fields[title] || "").trim().toLowerCase();
        if (v) return v;
      }
    }
  }
  return "";
}
