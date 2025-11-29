// Factify Extension - Content Script

// Inject safety indicator on page
(function() {
  'use strict';

  // Check if already injected
  if (window.factifyInjected) {
    return;
  }
  window.factifyInjected = true;

  // Create floating safety indicator
  function createSafetyIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'factify-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    `;

    indicator.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    indicator.addEventListener('mouseenter', () => {
      indicator.style.transform = 'scale(1.1)';
    });

    indicator.addEventListener('mouseleave', () => {
      indicator.style.transform = 'scale(1)';
    });

    indicator.addEventListener('click', () => {
      // Send message to open popup
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });

    document.body.appendChild(indicator);
  }

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSafetyIndicator);
  } else {
    createSafetyIndicator();
  }

  // Monitor suspicious forms
  function monitorForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      // Check for password fields
      const passwordFields = form.querySelectorAll('input[type="password"]');
      
      if (passwordFields.length > 0) {
        // Check if HTTPS
        if (window.location.protocol !== 'https:') {
          showWarning('⚠️ Warning: This form is not secure (HTTP). Your data may be at risk.');
        }
        
        // Check for suspicious domains
        if (checkSuspiciousDomain()) {
          showWarning('⚠️ Warning: This website may be impersonating a legitimate service.');
        }
      }
    });
  }

  // Check for suspicious domain
  function checkSuspiciousDomain() {
    const hostname = window.location.hostname.toLowerCase();
    const suspiciousKeywords = [
      'paypal', 'amazon', 'microsoft', 'google', 'facebook',
      'apple', 'netflix', 'bank', 'secure', 'verify', 'login'
    ];

    // Check if domain contains suspicious keywords but isn't the real domain
    return suspiciousKeywords.some(keyword => {
      return hostname.includes(keyword) && !hostname.endsWith(`${keyword}.com`);
    });
  }

  // Show warning banner
  function showWarning(message) {
    const banner = document.createElement('div');
    banner.id = 'factify-warning';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #fef3c7;
      border-bottom: 2px solid #f59e0b;
      padding: 12px 20px;
      z-index: 999998;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #92400e;
    `;

    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 20px;">⚠️</span>
        <span><strong>Factify Security Alert:</strong> ${message}</span>
      </div>
      <button id="factify-close-warning" style="
        background: transparent;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #92400e;
      ">×</button>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    // Close button
    document.getElementById('factify-close-warning').addEventListener('click', () => {
      banner.remove();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (banner.parentNode) {
        banner.remove();
      }
    }, 10000);
  }

  // Monitor forms after page load
  setTimeout(monitorForms, 1000);

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showWarning') {
      showWarning(request.message);
      sendResponse({ success: true });
    }
  });

})();
