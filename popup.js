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

  let processMessages = false; // Start processing only after "TODAY"
  let lastSenderName = null; // Track the last sender

  const messageNodes = chatContainer.querySelectorAll('.msg-s-event-listitem');
  
  console.log(messageNodes);
  
  messageNodes.forEach((node) => {
    // Check for "TODAY" header
    if (isDayHeader(node)) {
      console.log("Reached 'TODAY' header. Starting to process messages.");
      processMessages = true;
    }

    if (processMessages) {
      console.log("Now processing messages");
      const senderName = getSenderName(node); // Get the sender name (or reuse lastSenderName)
      const messageText = getMessageText(node); // Get the message text

      console.log("Sender Name:", senderName);
      console.log("Message Text:", messageText);

      if (senderName && messageText) {
        parseMessage(senderName, messageText);
      }
    }
  });

  // Helper: Detect if the message is a "TODAY" header
  function isDayHeader(messageElement) {
    const parentText = messageElement.parentElement.innerText.trim();
    return parentText.startsWith('TODAY');
  }
  
  const scores = {}; // Store the scores for each game

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
  console.log(messageElement.childElementCount);
  const senderNameElement =
    messageElement.childElementCount == 3
      ? messageElement.firstElementChild.nextElementSibling.firstElementChild
      : null;
  console.log(senderNameElement.innerText.trim());
  return senderNameElement ? senderNameElement.innerText.trim() : null;
  // .firstElementChild.nextElementSibling.firstElementChild.innerText
}

// Helper function to get message text using lastElementChild.innerText
function getMessageText(messageElement) {
  const scoreText = messageElement.lastElementChild.innerText.trim();
  console.log("Score text:", scoreText);
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
