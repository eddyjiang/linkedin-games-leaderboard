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
  console.log("chatContainer")

  const scores = {};  // Store the scores for each game
  let processingMessages = false;
  let lastSenderName = null;  // Track the last sender's name

  // Get the "TODAY" header XPath to start processing after it
  const todayHeaderXpath = "/html/body/div[5]/div[3]/div[2]/div/div/main/div/div[2]/div[2]/div[1]/div/div[4]/div[2]/ul/li[19]/time";
  const todayHeaderResult = document.evaluate(todayHeaderXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const todayHeader = todayHeaderResult.singleNodeValue;

  // Loop through existing chat messages and parse scores
  const messageNodes = chatContainer.querySelectorAll('.msg-s-event-listitem');
  console.log("messageNodes")
  messageNodes.forEach(node => {
    if (!processingMessages) {
      // Only start processing messages after "TODAY" header
      if (node === todayHeader) {
        processingMessages = true;
      }
    }

    // Only process messages after the "TODAY" header
    if (processingMessages) {
      const senderName = getSenderName(node);
      const messageText = getMessageText(node);

      // If we have a sender name, but it's the same as the last one, don't extract again
      if (senderName && senderName !== lastSenderName) {
        lastSenderName = senderName;
      }

      if (senderName && messageText) {
        parseMessage(lastSenderName, messageText);
      }
    }
  });

  // Generate leaderboard text
  let leaderboard = '🏆 Leaderboard 🏆\n';
  for (const game in scores) {
    const sortedScores = scores[game].sort((a, b) => a.score - b.score); // Lower is better for all games
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
  const xpath = "/html/body/div[5]/div[3]/div[2]/div/div/main/div/div[2]/div[2]/div[1]/div/div[4]/div[2]/ul/li[19]/div/div[1]/span/a/span";
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const senderNameElement = result.singleNodeValue;
  return senderNameElement ? senderNameElement.textContent.trim() : null;
}

// Helper function to get message text using XPath
function getMessageText(messageElement) {
  const xpath = "/html/body/div[5]/div[3]/div[2]/div/div/main/div/div[2]/div[2]/div[1]/div/div[4]/div[2]/ul/li[19]/div/div[2]/div/div/p";
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const messageTextElement = result.singleNodeValue;
  return messageTextElement ? messageTextElement.textContent.trim() : null;
}

// Parse the message for game scores
function parseMessage(playerName, message) {
  const lines = message.split('\n');
  if (lines.length < 1) return;

  lines.forEach(line => {
    let gameScoreMatch;

    // Pinpoint: "Pinpoint #266 | 2 guesses" (lower guesses = better)
    if (line.startsWith("Pinpoint")) {
      gameScoreMatch = line.match(/^Pinpoint #(\d+)\s*\|\s*(\d+)(?:.*)?$/);
      if (gameScoreMatch) {
        const game = "Pinpoint";
        const score = parseInt(gameScoreMatch[2], 10); // Lower guesses = better score
        addToScores(game, playerName, score);
      }
    }

    // Queens: "Queens #266 | 0:19" (lower time = better)
    else if (line.startsWith("Queens")) {
      gameScoreMatch = line.match(/^Queens #(\d+)\s*\|\s*(\d+):(\d+)(?:.*)?$/);
      if (gameScoreMatch) {
        const game = "Queens";
        const minutes = parseInt(gameScoreMatch[2], 10);
        const seconds = parseInt(gameScoreMatch[3], 10);
        const score = minutes * 60 + seconds; // Convert time to seconds
        addToScores(game, playerName, score);
      }
    }

    // Crossclimb: "Crossclimb #266 | 0:20" (lower time = better)
    else if (line.startsWith("Crossclimb")) {
      gameScoreMatch = line.match(/^Crossclimb #(\d+)\s*\|\s*(\d+):(\d+)(?:.*)?$/);
      if (gameScoreMatch) {
        const game = "Crossclimb";
        const minutes = parseInt(gameScoreMatch[2], 10);
        const seconds = parseInt(gameScoreMatch[3], 10);
        const score = minutes * 60 + seconds; // Convert time to seconds
        addToScores(game, playerName, score);
      }
    }

    // Tango: "Tango #106 | 0:35 and flawless" (lower time = better, extra text ignored)
    else if (line.startsWith("Tango")) {
      gameScoreMatch = line.match(/^Tango #(\d+)\s*\|\s*(\d+):(\d+)(?:.*)?$/);
      if (gameScoreMatch) {
        const game = "Tango";
        const minutes = parseInt(gameScoreMatch[2], 10);
        const seconds = parseInt(gameScoreMatch[3], 10);
        const score = minutes * 60 + seconds; // Convert time to seconds
        addToScores(game, playerName, score);
      }
    }
  });
}

// Helper function to add scores to the leaderboard
function addToScores(game, playerName, score) {
  if (!scores[game]) scores[game] = [];
  scores[game].push({ player: playerName, score: score });
}
