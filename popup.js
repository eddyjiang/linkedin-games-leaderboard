document.getElementById('generateLeaderboardBtn').addEventListener('click', () => {
  // Send a message to the content script to generate the leaderboard
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: generateLeaderboard,
      },
      (result) => {
        console.log("Leaderboard generated:", result);
      }
    );
  });
});

function generateLeaderboard() {
  // This function will be injected into the page (content.js equivalent logic)
  const scores = {};  // Use your existing score logic here.

  // Add your leaderboard generation and message sending logic as you did before in content.js.
  let leaderboard = '🏆 Leaderboard 🏆\n';
  for (const game in scores) {
    const sortedScores = scores[game].sort((a, b) => b.score - a.score);
    leaderboard += `\n${game}:\n`;

    let lastScore = null;
    let rank = 1;
    sortedScores.slice(0, 3).forEach((entry, index) => {
      if (lastScore !== entry.score) {
        rank = index + 1;
      }
      leaderboard += `${rank}. ${entry.player} - ${entry.score}\n`;
      lastScore = entry.score;
    });
  }

  const inputBox = document.querySelector('.msg-form__contenteditable');
  if (inputBox) {
    inputBox.textContent = leaderboard;
    inputBox.dispatchEvent(new Event('input', { bubbles: true }));

    const sendButton = document.querySelector('.msg-form__send-button');
    if (sendButton) {
      sendButton.click();
    }
  }
}
