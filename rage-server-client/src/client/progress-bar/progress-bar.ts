let progressBarBrowser: BrowserMp | null = null;
let isProgressBarVisible = false;

// Listen for 'I' key to toggle progress bar
mp.keys.bind(0x49, true, () => {
  // 0x49 is the 'I' key
  if (!isProgressBarVisible) {
    // Show progress bar
    if (!progressBarBrowser) {
      progressBarBrowser = mp.browsers.new('package://cef/src/modules/progress-bar/index.html');
    }
    isProgressBarVisible = true;
    mp.gui.chat.push('Progress bar shown');
  } else {
    // Hide progress bar
    if (progressBarBrowser) {
      progressBarBrowser.destroy();
      progressBarBrowser = null;
    }
    isProgressBarVisible = false;
    mp.gui.chat.push('Progress bar hidden');
  }
});

// Listen for Spacebar to reset progress bar
mp.keys.bind(0x20, true, () => {
  // 0x20 is the Spacebar key
  if (isProgressBarVisible && progressBarBrowser) {
    // Execute the reset function in the CEF browser
    progressBarBrowser.execute('if (typeof resetProgressBar === "function") resetProgressBar();');
    mp.gui.chat.push('Progress bar reset');
  }
});
