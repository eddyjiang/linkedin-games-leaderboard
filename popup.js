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

  const scores = {}; // Store the scores for each game
  let processingMessages = false;
  let lastSenderName = null; // Track the last sender's name

  // Find the last message from yesterday
  const lastYesterdayMessage = Array.from(
    chatContainer.querySelectorAll(
      '.msg-s-event-listitem.msg-s-event-listitem--m2m-msg-followed-by-date-boundary'
    )
  ).pop();

  // Loop through existing chat messages and parse scores
  const messageNodes = chatContainer.querySelectorAll('.msg-s-event-listitem');
  console.log(messageNodes);
  messageNodes.forEach((node) => {
    if (!processingMessages) {
      // Only start processing messages after yesterday's last message
      if (node === lastYesterdayMessage) {
        console.log("Found yesterday's last message!");
        processingMessages = true;
        return; // Skip yesterday's last message itself
      }
    }

    // Only process messages after yesterday's last message
    if (processingMessages) {
      const senderName = getSenderName(node);
      const messageText = getMessageText(node);
      console.log(senderName);
      console.log(messageText);

      // If the message has 3 child elements, we have a new sender, so parse the name
      if (node.childElementCount === 3 && senderName && senderName !== lastSenderName) {
        lastSenderName = senderName; // Update the last sender's name
      }

      // Parse the message if we have both sender and text
      if (lastSenderName && messageText) {
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

// Helper function to get sender name using the new property path
function getSenderName(messageElement) {
  // Check if message has 3 child elements (name is included)
  const senderNameElement =
    messageElement.childElementCount === 3
      ? messageElement.firstElementChild.nextElementSibling.firstElementChild
      : null;
  return senderNameElement ? senderNameElement.innerText.trim() : null;
  // .firstElementChild.nextElementSibling.firstElementChild.innerText
}

// Helper function to get message text using lastElementChild.innerText
function getMessageText(messageElement) {
  const scoreText = messageElement.lastElementChild.innerText.trim();
  return scoreText || null; // Return the game score text or null if not found
}

// Parse the message for game scores
function parseMessage(playerName, message) {
  const lines = message.split('\n');
  if (lines.length < 1) return;

  lines.forEach((line) => {
    let gameScoreMatch;

    // Pinpoint: "Pinpoint #266 | 2 guesses" (lower guesses = better)
    if (line.startsWith('Pinpoint')) {
      gameScoreMatch = line.match(/^Pinpoint #(\d+)\s*\|\s*(\d+)(?:.*)?$/);
      if (gameScoreMatch) {
        const game = 'Pinpoint';
        const score = parseInt(gameScoreMatch[2], 10); // Lower guesses = better score
        addToScores(game, playerName, score);
      }
    }

    // Queens: "Queens #266 | 0:19" (lower time = better)
    else if (line.startsWith('Queens')) {
      gameScoreMatch = line.match(/^Queens #(\d+)\s*\|\s*(\d+):(\d+)(?:.*)?$/);
      if (gameScoreMatch) {
        const game = 'Queens';
        const minutes = parseInt(gameScoreMatch[2], 10);
        const seconds = parseInt(gameScoreMatch[3], 10);
        const score = minutes * 60 + seconds; // Convert time to seconds
        addToScores(game, playerName, score);
      }
    }

    // Crossclimb: "Crossclimb #266 | 0:20" (lower time = better)
    else if (line.startsWith('Crossclimb')) {
      gameScoreMatch = line.match(/^Crossclimb #(\d+)\s*\|\s*(\d+):(\d+)(?:.*)?$/);
      if (gameScoreMatch) {
        const game = 'Crossclimb';
        const minutes = parseInt(gameScoreMatch[2], 10);
        const seconds = parseInt(gameScoreMatch[3], 10);
        const score = minutes * 60 + seconds; // Convert time to seconds
        addToScores(game, playerName, score);
      }
    }

    // Tango: "Tango #106 | 0:35 and flawless" (lower time = better)
    else if (line.startsWith('Tango')) {
      gameScoreMatch = line.match(/^Tango #(\d+)\s*\|\s*(\d+):(\d+)(?:.*)?$/);
      if (gameScoreMatch) {
        const game = 'Tango';
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
