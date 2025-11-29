// Factify Extension - Background Service Worker

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Factify Extension installed');
  } else if (details.reason === 'update') {
    console.log('Factify Extension updated');
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'verifyUrl') {
    verifyUrl()
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getTabInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true;
  }
});

// Verify URL function
async function verifyUrl() {
  return {
    status: 'safe',
    confidence: 95,
    summary: 'Website appears to be safe',
    details: 'No suspicious patterns detected'
  };
}
