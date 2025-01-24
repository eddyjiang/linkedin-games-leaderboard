document.getElementById('generateLeaderboardBtn').addEventListener('click', () => {
  // Send a message to the content script to generate the leaderboard
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: generateLeaderboard,
      },
      (result) => {
        console.log("Leaderboard generated:", result);
      }
    );
  });
});

function generateLeaderboard() {
  // Grab the chat container and ensure it exists
  const chatContainer = document.querySelector('.msg-s-message-list-content');
  if (!chatContainer) {
    console.error("Chat container not found.");
    return;
  }

  const scores = {};  // Store the scores for each game
  let processingMessages = false;

  // Loop through existing chat messages and parse scores
  const messageNodes = chatContainer.querySelectorAll('.msg-s-event-listitem');
  messageNodes.forEach(node => {
    // Look for the "TODAY" header and start processing after it
    if (!processingMessages) {
      const todayHeader = node.querySelector('.msg-s-message-list__time-heading.t-12.t-black--light.t-bold');
      if (todayHeader) {
        processingMessages = true; // Start processing after this point
      }
    }

    // Only process messages after the "TODAY" header
    if (processingMessages) {
      const senderName = getSenderName(node);
      const messageText = getMessageText(node);

      if (senderName && messageText) {
        parseMessage(senderName, messageText);
      }
    }
  });

  // Generate leaderboard text
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

  // Find the input box and insert the leaderboard into it
  const inputBox = document.querySelector('.msg-form__contenteditable');
  if (inputBox) {
    // Use innerHTML to insert the leaderboard HTML properly into the input box
    inputBox.innerHTML = `<p>${leaderboard}</p>`;

    // Dispatch the input event to simulate the user typing
    inputBox.dispatchEvent(new Event('input', { bubbles: true }));

    // Trigger the send button click
    const sendButton = document.querySelector('.msg-form__send-button');
    if (sendButton) {
      sendButton.click();
    }
  }
}

// Helper functions to extract sender name and message text
function getSenderName(messageElement) {
  const nameElement = messageElement.closest('.msg-s-event-listitem')?.querySelector('.msg-s-message-group__profile-link');
  return nameElement ? nameElement.textContent.trim() : null;
}

function getMessageText(messageElement) {
  const textElement = messageElement.querySelector('.msg-s-event-listitem__body');
  return textElement ? textElement.textContent.trim() : null;
}

// Parse the message for game scores
function parseMessage(playerName, message) {
  const lines = message.split('\n');
  if (lines.length < 1) return;

  lines.forEach(line => {
    const gameScorePattern = /^(?<game>[\w\s]+)\s*\|\s*(?<score>\d+)$/;
    const gameScoreMatch = line.match(gameScorePattern);

    if (gameScoreMatch) {
      const { game, score } = gameScoreMatch.groups;

      // Add to the scores object
      if (!scores[game]) scores[game] = [];
      scores[game].push({ player: playerName, score: parseInt(score, 10) });
    }
  });
}
