document.addEventListener('DOMContentLoaded', function () {
  const extractBtn = document.getElementById('extractBtn');
  const copyShortCommitBtn = document.getElementById('copyShortCommitBtn');
  const copyFullCommitBtn = document.getElementById('copyFullCommitBtn');
  const historyBtn = document.getElementById('historyBtn');
  const status = document.getElementById('status');

  // Open history page
  historyBtn.addEventListener('click', function () {
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
  });

  extractBtn.addEventListener('click', async function () {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Execute the script on the current tab
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const getText = (node) => {
            if (!node) return '';
            return (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
          };

          const collectFilePaths = () => {
            const uniquePaths = [];
            const seen = new Set();

            const addPath = (value) => {
              if (!value) return;
              const cleaned = value
                .replace(/^(?:\.\.\/)+/, '')
                .replace(/(?:^|\/)(?:[A-Z0-9_-]+\.)+[A-Z0-9_-]+\//g, (match) =>
                  match.startsWith('/') ? '/' : ''
                )
                .replace(/\s*\/\s*/g, '/')
                .trim();

              if (!cleaned || seen.has(cleaned)) return;
              seen.add(cleaned);
              uniquePaths.push(cleaned);
            };

            document.querySelectorAll('diff-file[data-file-data]').forEach((diffFile) => {
              try {
                const payload = JSON.parse(diffFile.dataset.fileData || '{}');
                addPath(payload.new_path || payload.old_path || '');
              } catch (e) {
                // Ignore invalid JSON payloads and continue to other selectors.
              }
            });

            document.querySelectorAll(
              '.rd-diff-file-link, .gl-mr-3.gl-grow.gl-font-bold.gl-truncate, .diff-file-title a, .file-title, [data-testid="diff-file-name"]'
            ).forEach((element) => {
              addPath(getText(element));
            });

            return uniquePaths;
          };

          const filePaths = collectFilePaths();
          const files = filePaths.join('\n');

          // Get total file count from the Changes tab badge (older and newer GitLab layouts)
          const badgeElement = document.querySelector(
            '.commit-ci-menu .gl-badge-content, .nav-link.active .gl-badge-content, .nav-item.active .gl-badge-content, .scrollable-tabs .nav-item.active .gl-badge-content'
          );
          const totalCount = badgeElement ? parseInt(badgeElement.innerText, 10) || filePaths.length : filePaths.length;

          // Get current page number from URL
          const urlParams = new URLSearchParams(window.location.search);
          const currentPage = parseInt(urlParams.get('page'), 10) || 1;

          // Try common GitLab commit title selectors
          const commitMessageElement = document.querySelector(
            '.commit-box .commit-title, .commit-title, .qa-commit-title, h1[data-testid="commit-title"]'
          );
          const commitMessage = commitMessageElement
            ? getText(commitMessageElement)
            : '';

          return {
            files: files,
            extractedCount: filePaths.length,
            totalCount: totalCount,
            currentPage: currentPage,
            commitMessage: commitMessage
          };
        }
      });

      const result = results[0].result;
      const extractedText = result.files;
      const extractedCount = result.extractedCount;
      const totalCount = result.totalCount;
      const currentPage = result.currentPage;
      const commitMessage = result.commitMessage || '';
      const filesPerPage = 20;
      const currentUrl = tab.url;
      
      if (extractedText && extractedText.trim()) {
        // Copy to clipboard
        await navigator.clipboard.writeText(extractedText);
        
        // Save to history
        await saveToHistory(extractedText, currentUrl, commitMessage);
        
        // Check if there are more files on subsequent pages
        // Only warn if total files > current page * files per page
        const hasMorePages = totalCount > currentPage * filesPerPage;
        if (hasMorePages) {
          const remainingFiles = totalCount - (currentPage * filesPerPage);
          status.innerHTML = `Copied ${extractedCount} items!<br /><span class="warning">Warning: ${remainingFiles} more files on next page(s)!</span>`;
          status.className = 'success';
        } else {
          status.textContent = `Copied ${extractedText.trim().split('\n').length} items!`;
          status.className = 'success';
        }
      } else {
        status.textContent = 'No matching elements found.';
        status.className = 'error';
      }
    } catch (error) {
      status.textContent = 'Error: ' + error.message;
      status.className = 'error';
      console.error(error);
    }
  });

  copyShortCommitBtn.addEventListener('click', function () {
    copyCommitId('short');
  });

  copyFullCommitBtn.addEventListener('click', function () {
    copyCommitId('full');
  });

  async function copyCommitId(type) {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Extract commit IDs from URL and page elements
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const candidates = [];

          const pushMatches = (text) => {
            if (!text) {
              return;
            }
            const matches = text.match(/\b[0-9a-f]{7,40}\b/gi);
            if (matches) {
              candidates.push(...matches);
            }
          };

          pushMatches(window.location.href);
          pushMatches(window.location.pathname);
          pushMatches(window.location.search);

          const commitLinks = document.querySelectorAll('a[href*="/commit/"]');
          for (const link of commitLinks) {
            pushMatches(link.getAttribute('href'));
            pushMatches(link.innerText);
          }

          const commitShaElement = document.querySelector(
            '[data-testid="commit-sha"], .commit-sha, .qa-commit-sha'
          );
          pushMatches(commitShaElement ? commitShaElement.innerText : '');

          const fullId = candidates.find(id => id.length === 40) || '';
          const anyId = fullId || candidates.find(id => id.length >= 7) || '';
          const shortId = anyId ? anyId.slice(0, 8) : '';

          return {
            shortId: shortId,
            fullId: fullId
          };
        }
      });

      const commitData = results[0].result || {};
      const shortId = (commitData.shortId || '').trim();
      const fullId = (commitData.fullId || '').trim();
      const commitId = type === 'full' ? fullId : shortId;

      if (commitId) {
        await navigator.clipboard.writeText(commitId);
        status.textContent =
          type === 'full'
            ? `Copied full commit ID: ${commitId}`
            : `Copied short commit ID: ${commitId}`;
        status.className = 'success';
      } else {
        status.textContent =
          type === 'full'
            ? 'No full commit ID found on this page.'
            : 'No commit ID found on this page.';
        status.className = 'error';
      }
    } catch (error) {
      status.textContent = 'Error: ' + error.message;
      status.className = 'error';
      console.error(error);
    }
  }

  // Function to save copied text to history
  async function saveToHistory(text, url, commitMessage) {
    const timestamp = new Date().toISOString();
    const historyItem = {
      id: Date.now(),
      text: text,
      url: url,
      commitMessage: commitMessage,
      timestamp: timestamp
    };

    // Get existing history
    chrome.storage.local.get(['copyHistory'], function (result) {
      let history = result.copyHistory || [];
      
      // Check if duplicate entry already exists (same URL and text)
      const duplicateIndex = history.findIndex(
        item => item.url === url && item.text === text
      );
      
      // If duplicate exists, remove it so we can add it fresh with new timestamp
      if (duplicateIndex !== -1) {
        history.splice(duplicateIndex, 1);
      }
      
      // Add new item to beginning
      history.unshift(historyItem);
      
      // Keep only last 50 items
      history = history.slice(0, 50);
      
      // Save back to storage
      chrome.storage.local.set({ copyHistory: history });
    });
  }
});
  