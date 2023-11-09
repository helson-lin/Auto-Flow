function getCurrentTabId(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (callback) callback(tabs.length ? tabs[0].id : null);
  });
}


function sendMessageToContentScript(message, callback) {
  getCurrentTabId(tabId => {
    chrome.tabs.sendMessage(tabId, message, function(response) {
      if (callback) callback(response);
    });
  });
}

chrome.action.onClicked.addListener(async tab => {
  sendMessageToContentScript({ toggleVisible: true });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  sendMessageToContentScript(request, sendResponse);
  return true;
});
