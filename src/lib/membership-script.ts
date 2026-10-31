/**
 * Google Apps Script that is pasted into the Google Form. It runs on Google's
 * servers for EVERY submission — so it is exact (no matter how the person
 * reached the form) and it knows who registered and when.
 */
export function buildFormScript(supabaseUrl: string, publishableKey: string): string {
  return `// Adey CP — sends every Google Form response to the website.
// Paste this whole file into the form's Apps Script editor (see steps above).
const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
const SUPABASE_KEY = ${JSON.stringify(publishableKey)};

// Add a trigger for this function: Triggers → Add Trigger →
// onFormSubmit · From form · On form submit.
function onFormSubmit(e) {
  sendResponse_(e.response);
}

// OPTIONAL — run ONCE by hand to also import the people who registered
// BEFORE this script was installed. Safe to run again: nobody is counted twice.
// (If you do this, lower "Starting offset" in Website Settings → Membership
// by the same amount, or those people will be counted twice.)
function importOldResponses() {
  FormApp.getActiveForm().getResponses().forEach(sendResponse_);
}

function sendResponse_(r) {
  const answers = {};
  r.getItemResponses().forEach(function (ir) {
    answers[ir.getItem().getTitle()] = ir.getResponse();
  });
  const pick = function (re) {
    for (const k in answers) {
      if (re.test(k) && answers[k]) return String(answers[k]);
    }
    return null;
  };
  const headers = { apikey: SUPABASE_KEY };
  if (SUPABASE_KEY.indexOf('sb_') !== 0) headers.Authorization = 'Bearer ' + SUPABASE_KEY;

  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/record_google_registration', {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    muteHttpExceptions: true,
    payload: JSON.stringify({
      p_response_id: r.getId(),
      p_full_name: pick(/name/i),
      p_email: r.getRespondentEmail() || pick(/e-?mail/i),
      p_submitted_at: r.getTimestamp().toISOString(),
      p_answers: answers,
    }),
  });
  if (res.getResponseCode() >= 300) {
    // Throwing makes Google email you about the failure.
    throw new Error('Website rejected the response: ' + res.getContentText());
  }
}
`;
}
