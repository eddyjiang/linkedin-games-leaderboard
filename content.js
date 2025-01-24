document.addEventListener("DOMContentLoaded", () => {
  // Chat container selector
  const chatContainer = document.querySelector('.msg-s-message-list-content');
  if (!chatContainer) return;

  // Add a button to generate the leaderboard
  const leaderboardButton = document.createElement('button');
  leaderboardButton.textContent = 'Generate Leaderboard';
  leaderboardButton.style = 'margin: 10px; padding: 5px;';
  chatContainer.parentElement.prepend(leaderboardButton);

  const scores = {};

  // Observe the chat container for new messages
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Extract sender name
          const senderName = getSenderName(node);

          // Extract message text
          const messageText = getMessageText(node);

          if (senderName && messageText) {
            parseMessage(senderName, messageText);
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
    // Split message into lines
    const lines = message.split('\n');
    if (lines.length < 1) return;

    // Extract game name and score
    const gameScorePattern = /^(?<game>[\w\s]+)\s*\|\s*(?<score>\d+)$/;
    const gameScoreMatch = lines[0].match(gameScorePattern);

    if (gameScoreMatch) {
      const { game, score } = gameScoreMatch.groups;

      // Add to the scores object
      if (!scores[game]) scores[game] = [];
      scores[game].push({ player: playerName, score: parseInt(score, 10) });
    }
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
      sortedScores.slice(0, 3).forEach((entry, index) => {
        leaderboard += `${index + 1}. ${entry.player} - ${entry.score}\n`;
      });
    }

    return leaderboard;
  }

  function sendToChat(message) {
    // Input box selector
    const inputBox = document.querySelector('.msg-form__contenteditable');
    if (inputBox) {
      inputBox.textContent = message; // Update the content
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));

      // Send button selector
      const sendButton = document.querySelector('.msg-form__send-button');
      if (sendButton) {
        sendButton.click();
      }
    }
  }
});
