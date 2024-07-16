/**
 * This script is designed to automate the process of rebuilding a website by scheduling triggers based on specific conditions.
 * It checks for upcoming rebuild dates, compares them with the current date, and schedules rebuilds accordingly.
 * Additionally, it ensures that rebuilds are not triggered too frequently by maintaining a minimum interval between rebuilds.
 * The script also includes functionality to delete all existing triggers to prevent duplicate or unnecessary rebuilds.
 * 
 * Author: Mani Kumar [https://businessaddons.com]
 * License: MIT
 *
 * Usage:
 * - Replace the url in `scheduleRebuild` with your own api endpoint url.
 * - Replace the URL in `rebuildSite` function with your actual build hook URL.
 * - Ensure that the Google Apps Script project has permission to access the necessary services, such as UrlFetchApp and ScriptApp.
 */

/**
 * Main function to execute. 
 * Schedules the rebuild of the site by first deleting all existing triggers, then checking for the next rebuild date.
 * If a rebuild is needed and not too recent, it schedules a new trigger for it. It also ensures a periodic check every 6 hours. 
*/
function scheduleRebuild() { 
  // Delete old triggers
  deleteAllTriggers();
  // Now check for upcoming rebuilds
  Logger.log("Checking rebuilds...");
  var url = "http://example.com/rebuild_at/index.json"; // Replace with your API endpoint
  var response = UrlFetchApp.fetch(url);
  var data = JSON.parse(response.getContentText());
  var now = new Date(); // Get the current date and time
  var earliestrebuildDate = null;

  // Find the earliest (most future) rebuild date
  data.forEach(rebuild => {
    if (rebuild.hasOwnProperty("date")) {
      var startDate = new Date(rebuild.date);
      // Ensure the rebuild start date is in the future
      if (startDate > now && (!earliestrebuildDate || startDate < earliestrebuildDate)) {
        earliestrebuildDate = startDate;
      }
    }
  });

  // Check for recent rebuild
  var lastRebuildTimestamp = PropertiesService.getScriptProperties().getProperty('lastRebuildTimestamp');
  var fifteenMinutesAgo = new Date(now.getTime() - 15 * 60000);

  if (earliestrebuildDate && (!lastRebuildTimestamp || new Date(parseInt(lastRebuildTimestamp)) < fifteenMinutesAgo)) {
    Logger.log("Earliest future rebuild date found: " + earliestrebuildDate);
    // Schedule a new trigger for the earliest rebuild date
    scheduleTriggerForRebuild(earliestrebuildDate);
  } else if (!earliestrebuildDate) {
    Logger.log("No upcoming rebuilds found in the future.");
    // If no future rebuilds and more than 15 minutes since last rebuild, trigger rebuild
    if (!lastRebuildTimestamp || new Date(parseInt(lastRebuildTimestamp)) < fifteenMinutesAgo) {
      rebuildSite();
    }
  }

  // Schedule to run every 6 hours, regardless of other conditions
  ScriptApp.newTrigger("scheduleRebuild")
    .timeBased()
    .everyHours(6)
    .create();
  Logger.log("Scheduled to run every 6 hours.");
}

/**
 * Schedules a trigger for the site rebuild at the specified date.
 * @param {Date} date - The date and time when the rebuild should be triggered.
 */
function scheduleTriggerForRebuild(date) {
  try {
    var trigger = ScriptApp.newTrigger("triggerRebuildSite")
      .timeBased()
      .at(date)
      .create();
    Logger.log("New trigger scheduled for: " + date);
    // You might also want to log the trigger ID for verification
    Logger.log("Trigger ID: " + trigger.getUniqueId());
  } catch (e) {
    Logger.log("Failed to create trigger: " + e.toString());
  }
}

/**
 * Checks if a daily trigger for the `scheduleRebuild` function is already set.
 * @returns {boolean} True if a daily trigger is set, false otherwise.
 */
function isDailyTriggerSet() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.getHandlerFunction() === "scheduleRebuild" && trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
      return true;
    }
  }
  return false;
}

/**
 * Function to be called by the scheduled trigger to rebuild the site and reschedule for the next rebuild.
 * It logs the outcome of the rebuild and attempts to schedule the next rebuild.
 */
function triggerRebuildSite() {
  Logger.log("Triggered site rebuild...");  
  // Rebuild the site
  var rebuildSuccessful = rebuildSite();
  if (rebuildSuccessful) {
    Logger.log("Site rebuild was successful.");
  } else {
    Logger.log("Site rebuild failed.");
  }

  // Run scheduleRebuild logic again to set up the next trigger, if applicable
  scheduleRebuild();
}

/**
 * Deletes all triggers associated with the Google Apps Script project.
 */
function deleteAllTriggers() {
  Logger.log("Deleting all triggers...");
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

/**
 * Triggers the site rebuild process by sending a POST request to a predefined URL.
 * It logs the outcome and updates the last rebuild timestamp on success.
 * @returns {boolean} True if the rebuild was successfully triggered, false otherwise.
 */
function rebuildSite() {
  var url = "https://exampple.com/build-hook/"; // Replace with your build hook URL
  var options = {
    "method": "post",
    "payload": {},
    "muteHttpExceptions": true
  };
  var response = UrlFetchApp.fetch(url, options);
  var statusCode = response.getResponseCode();
  if (statusCode === 200) {
    Logger.log("Site rebuild triggered successfully.");
    // Save the current timestamp
    var now = new Date().getTime();
    PropertiesService.getScriptProperties().setProperty('lastRebuildTimestamp', now.toString());
    Logger.log("lastRebuildTimestamp (ScriptProperty) is set to: " + now.toString())
    return true;
  } else {
    Logger.log("Failed to trigger site rebuild. Status code: " + statusCode);
    return false;
  }
}
