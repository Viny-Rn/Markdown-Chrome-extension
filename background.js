// Background service worker for Markdown Studio

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: 'editor.html'
  });
});
