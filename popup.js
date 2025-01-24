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

// Helper function to get sender name using XPath
function getSenderName(messageElement) {
  // Define the XPath for the sender's name
  const xpath = "/html/body/div[6]/div[3]/div[2]/div/div/main/div/div[2]/div[2]/div[1]/div/div[4]/div[2]/ul/li[19]/div[1]/div[1]/span[1]/a/span";

  // Execute the XPath query to get the sender's name element
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const senderNameElement = result.singleNodeValue;

  // Return the sender's name if found, otherwise return null
  return senderNameElement ? senderNameElement.textContent.trim() : null;
}

// Helper function to get message text using XPath
function getMessageText(messageElement) {
  // Define the XPath for the message content
  const xpath = "/html/body/div[6]/div[3]/div[2]/div/div/main/div/div[2]/div[2]/div[1]/div/div[4]/div[2]/ul/li[19]/div[1]/div[2]/div/div/p";

  // Execute the XPath query to get the message content element
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const messageTextElement = result.singleNodeValue;

  // Return the message text if found, otherwise return null
  return messageTextElement ? messageTextElement.textContent.trim() : null;
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
