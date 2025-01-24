document.addEventListener("DOMContentLoaded", () => {
  // Chat container selector
  const chatContainer = document.querySelector('.msg-s-message-list-content');
  if (!chatContainer) return;

  // Select the message input container
  const inputBoxContainer = document.querySelector('.msg-form__msg-content-container');
  if (!inputBoxContainer) return;

  // Add a button to generate the leaderboard
  const leaderboardButton = document.createElement('button');
  leaderboardButton.textContent = 'Generate Leaderboard';
  leaderboardButton.style = 'margin: 10px; padding: 5px;';

  // Prepend the button right above the message input container
  inputBoxContainer.prepend(leaderboardButton);

  const scores = {};
  let processingMessages = false;

  // Observe the chat container for new messages
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Look for the "TODAY" header and start processing after it
          if (!processingMessages) {
            const todayHeader = node.querySelector('.msg-s-message-list__time-heading.t-12.t-black--light.t-bold');
            if (todayHeader) {
              processingMessages = true; // Start processing after this point
            }
          }

          // Only process messages after the "TODAY" header
          if (processingMessages) {
            // Extract sender name and message text
            const senderName = getSenderName(node);
            const messageText = getMessageText(node);

            if (senderName && messageText) {
              parseMessage(senderName, messageText);
            }
          }
        }
      });
    });
  });

  observer.observe(chatContainer, { childList: true, subtree: true });

  // Function to get the sender's name
  function getSenderName(messageElement) {
    const nameElement = messageElement.closest('.msg-s-event-listitem')?.querySelector('.msg-s-message-group__profile-link');
    return nameElement ? nameElement.textContent.trim() : null;
  }

  // Function to get the message text
  function getMessageText(messageElement) {
    const textElement = messageElement.querySelector('.msg-s-event-listitem__body');
    return textElement ? textElement.textContent.trim() : null;
  }

  // Parse messages to extract scores
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

  // Generate leaderboard and send it to the chat
  leaderboardButton.addEventListener('click', () => {
    const leaderboard = generateLeaderboard(scores);
    sendToChat(leaderboard);
  });

  function generateLeaderboard(scores) {
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

    return leaderboard;
  }

  function sendToChat(message) {
    if (!message) {
      message = "No valid game scores found.";
    }
    const inputBox = document.querySelector('.msg-form__contenteditable');
    if (inputBox) {
      inputBox.textContent = message;
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));

      const sendButton = document.querySelector('.msg-form__send-button');
      if (sendButton) {
        sendButton.click();
      }
    }
  }
});
