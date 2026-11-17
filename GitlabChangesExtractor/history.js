document.addEventListener('DOMContentLoaded', function () {
  const historyList = document.getElementById('historyList');
  const emptyMessage = document.getElementById('emptyMessage');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const itemCount = document.getElementById('itemCount');

  // Load and display history
  function loadHistory() {
    chrome.storage.local.get(['copyHistory'], function (result) {
      const history = result.copyHistory || [];
      itemCount.textContent = history.length;

      historyList.innerHTML = '';

      if (history.length === 0) {
        emptyMessage.style.display = 'block';
        return;
      }

      emptyMessage.style.display = 'none';

      history.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        const date = new Date(item.timestamp);
        const timeString = date.toLocaleString();
        const shortCommitId = extractShortCommitId(item.url);

        li.innerHTML = `
          <div class="item-header">
            <strong>#${index + 1}</strong>
            <span class="item-timestamp" title="${getDaysAgo(item.timestamp)}">${timeString}</span>
          </div>
          <div class="item-url" title="${item.url}">
            <strong>URL:</strong> <a href="${item.url}" target="_blank" style="color: #2196F3; text-decoration: none;">${item.url}</a>
          </div>
          ${item.commitMessage ? `<div class="item-commit-message" title="${escapeHtml(item.commitMessage)}"><strong>Commit Message:</strong> ${escapeHtml(item.commitMessage)}</div>` : ''}
          <div class="item-text">${escapeHtml(item.text)}</div>
          <div class="item-actions">
            ${shortCommitId ? `<button class="copy-commit-btn" data-index="${index}" data-commit="${shortCommitId}">Copy Commit ID</button>` : ''}
            ${item.commitMessage ? `<button class="copy-commit-message-btn" data-index="${index}">Copy Commit Message</button>` : ''}
            <button class="copy-btn" data-index="${index}">Copy</button>
            <button class="delete-btn" data-index="${index}">Delete</button>
          </div>
        `;

        // Copy commit ID button click handler
        const copyCommitBtn = li.querySelector('.copy-commit-btn');
        if (copyCommitBtn) {
          copyCommitBtn.addEventListener('click', function () {
            navigator.clipboard.writeText(shortCommitId).then(() => {
              const btn = this;
              const originalText = btn.textContent;
              btn.textContent = 'Copied!';
              btn.disabled = true;
              setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
              }, 2000);
            });
          });
        }

        // Copy commit message button click handler
        const copyCommitMessageBtn = li.querySelector('.copy-commit-message-btn');
        if (copyCommitMessageBtn) {
          copyCommitMessageBtn.addEventListener('click', function () {
            navigator.clipboard.writeText(item.commitMessage).then(() => {
              const btn = this;
              const originalText = btn.textContent;
              btn.textContent = 'Copied!';
              btn.disabled = true;
              setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
              }, 2000);
            });
          });
        }

        // Copy button click handler
        li.querySelector('.copy-btn').addEventListener('click', function () {
          navigator.clipboard.writeText(item.text).then(() => {
            const btn = this;
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            btn.disabled = true;
            setTimeout(() => {
              btn.textContent = originalText;
              btn.disabled = false;
            }, 2000);
          });
        });

        // Delete button click handler
        li.querySelector('.delete-btn').addEventListener('click', function () {
          deleteHistoryItem(item.id);
        });

        historyList.appendChild(li);
      });
    });
  }

  // Delete specific history item
  function deleteHistoryItem(itemId) {
    if (confirm('Delete this item from history?')) {
      chrome.storage.local.get(['copyHistory'], function (result) {
        let history = result.copyHistory || [];
        history = history.filter(item => item.id !== itemId);
        chrome.storage.local.set({ copyHistory: history }, function () {
          loadHistory();
        });
      });
    }
  }

  // Clear all history
  clearBtn.addEventListener('click', function () {
    if (confirm('Clear all copy history? This action cannot be undone.')) {
      chrome.storage.local.set({ copyHistory: [] }, function () {
        loadHistory();
      });
    }
  });

  // Export history as JSON
  exportBtn.addEventListener('click', function () {
    chrome.storage.local.get(['copyHistory'], function (result) {
      const history = result.copyHistory || [];
      if (history.length === 0) {
        alert('No history to export!');
        return;
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        itemCount: history.length,
        history: history
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `copy-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  // Extract short (8-char) commit SHA from a GitLab URL
  function extractShortCommitId(url) {
    const match = url.match(/\/commit\/([a-f0-9]{7,40})/i);
    return match ? match[1].substring(0, 8) : null;
  }

  // Return a human-readable "days ago" string for a timestamp
  function getDaysAgo(timestamp) {
    const diffDays = Math.floor((Date.now() - new Date(timestamp).getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }

  // Escape HTML to prevent injection
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initial load
  loadHistory();
});
