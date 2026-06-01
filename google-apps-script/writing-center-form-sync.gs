/**
 * Writing Center — sync Google Form submissions to Code4Community.
 *
 * Setup: docs/writing-center-google-form.md
 * Requires Google Forms API enabled + forms.responses.readonly scope (re-authorize after changes).
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
    console.error("Unexpected trigger event.");
    return;
  }

  var link = resolveFormResponseLink_(submittedAt, fields, props);

  var payload = {
    responseId: responseId,
    submittedAt: submittedAt,
    fields: fields,
    googleFormId: link.formId,
    googleFormApiResponseId: link.apiResponseId,
    googleFormResponseUrl: link.url,
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
  } else if (!link.apiResponseId) {
    console.error(
      "Synced session but no Forms API responseId — enable Google Forms API for this script's " +
        "GCP project and re-authorize. Link will not open a specific response."
    );
  }
}

function resolveFormResponseLink_(submittedAtIso, fields, props) {
  var form = FormApp.getActiveForm() || getLinkedForm_();
  var formId =
    (form && form.getId()) || props.getProperty("WC_FORM_ID") || "";
  if (!formId) {
    console.error("Could not determine form ID. Set WC_FORM_ID in Script properties.");
    return { formId: "", apiResponseId: "", url: "" };
  }

  var submittedAt = submittedAtIso ? new Date(submittedAtIso) : new Date();
  var email = pickEmailFromFields_(fields);
  var apiResponseId = lookupFormsApiResponseIdWithRetry_(formId, submittedAt, email);

  if (apiResponseId) {
    return {
      formId: formId,
      apiResponseId: apiResponseId,
      url:
        "https://docs.google.com/forms/d/" +
        formId +
        "/edit#response=" +
        apiResponseId,
    };
  }

  return { formId: formId, apiResponseId: "", url: "" };
}

/** Retries — Forms API may lag a few seconds after submit. */
function lookupFormsApiResponseIdWithRetry_(formId, submittedAt, email) {
  var attempts = 5;
  for (var i = 0; i < attempts; i++) {
    if (i > 0) Utilities.sleep(2000);
    var id = lookupFormsApiResponseIdOnce_(formId, submittedAt, email);
    if (id) return id;
  }
  return null;
}

function lookupFormsApiResponseIdOnce_(formId, submittedAt, email) {
  var data = listFormResponses_(formId);
  if (!data || !data.responses || !data.responses.length) return null;

  var responses = data.responses.slice().sort(function (a, b) {
    return (
      new Date(b.lastSubmittedTime).getTime() - new Date(a.lastSubmittedTime).getTime()
    );
  });

  var targetMs = submittedAt.getTime();

  if (email) {
    for (var i = 0; i < responses.length; i++) {
      var r = responses[i];
      if (
        r.respondentEmail &&
        String(r.respondentEmail).toLowerCase() === email
      ) {
        var emailDelta = Math.abs(new Date(r.lastSubmittedTime).getTime() - targetMs);
        if (emailDelta < 600000) return r.responseId;
      }
    }
  }

  var bestId = null;
  var bestDelta = Infinity;
  for (var j = 0; j < responses.length; j++) {
    var resp = responses[j];
    var delta = Math.abs(new Date(resp.lastSubmittedTime).getTime() - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestId = resp.responseId;
    }
  }
  if (bestDelta < 300000) return bestId;

  var newest = responses[0];
  if (
    newest &&
    Math.abs(new Date(newest.lastSubmittedTime).getTime() - Date.now()) < 180000
  ) {
    return newest.responseId;
  }

  return null;
}

function listFormResponses_(formId) {
  if (typeof Forms !== "undefined" && Forms.Forms && Forms.Forms.Responses) {
    try {
      return Forms.Forms.Responses.list(formId);
    } catch (err) {
      console.error("Forms advanced service: " + err);
    }
  }

  var url =
    "https://forms.googleapis.com/v1/forms/" +
    encodeURIComponent(formId) +
    "/responses?pageSize=100";
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    console.error(
      "Forms API (" +
        res.getResponseCode() +
        "): " +
        res.getContentText() +
        " — enable Google Forms API on this script's GCP project."
    );
    return null;
  }

  return JSON.parse(res.getContentText());
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

/**
 * Run once from the editor (not the trigger) after updating appsscript.json scopes.
 * Forces a new authorization dialog including Forms API access.
 */
function authorizeFormsApiAccess() {
  var form = FormApp.getActiveForm() || getLinkedForm_();
  if (!form) {
    throw new Error("Open this project from the form or linked response spreadsheet, then run again.");
  }
  var data = listFormResponses_(form.getId());
  if (!data) {
    throw new Error("Forms API call failed — check Executions log and docs/writing-center-google-form.md");
  }
  Logger.log("Forms API OK. Response count: " + (data.responses ? data.responses.length : 0));
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
