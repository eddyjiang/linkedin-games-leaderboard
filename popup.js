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
  const scores = {}; // Store the scores for each game

  const messageNodes = chatContainer.querySelectorAll('.msg-s-event-listitem');
  
  console.log(messageNodes);
  
  messageNodes.forEach((node) => {
    // Check for "TODAY" header
    if (isDayHeader(node)) {
      console.log("Reached 'TODAY' header. Now processing messages.");
      processMessages = true;
    }

    if (processMessages) {
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

  // Generate leaderboard text
  let leaderboard = '<p>🏆 Leaderboard 🏆</p>';
  for (const game in scores) {
    leaderboard += '<p><br></p>';
    const sortedScores = scores[game].sort((a, b) => a.score - b.score); // Lower is better for all games
    leaderboard += `<p>${game}</p>`;

    let lastScore = null;
    let rank = 1;
    sortedScores.forEach((entry, index) => {
      if (lastScore !== entry.score) {
        rank = index + 1;
      }
      if (rank > 3) {
        return;
      }
      let medal = ['🥇', '🥈', '🥉'];
      if (game == 'Pinpoint 📌') {
        leaderboard += `<p>${medal[rank - 1]} ${entry.player} — ${entry.score}</p>`;
      }
      else {
        const minutes = Math.floor(entry.score / 60);
        const seconds = entry.score - minutes * 60;

        function str_pad_left(string, pad, length) {
          return (new Array(length + 1).join(pad) + string).slice(-length);
        }

        const finalTime = minutes.toString() + ':' + str_pad_left(seconds, '0', 2);

        leaderboard += `<p>${medal[rank - 1]} ${entry.player} — ${finalTime}</p>`;
      }
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
  }

  // Helper function to get sender name using the new property path
  function getSenderName(messageElement) {
    // Check if message has 3 child elements (name is included)
    if (messageElement.childElementCount == 3)
      lastSenderName = messageElement.firstElementChild.nextElementSibling.firstElementChild.innerText.trim()
    return lastSenderName;
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
          const game = 'Pinpoint 📌';
          const score = parseInt(gameScoreMatch[2], 10); // Lower guesses = better score
          addToScores(game, playerName, score);
        }
      }
  
      // Queens: "Queens #266 | 0:19" (lower time = better)
      else if (line.startsWith('Queens')) {
        gameScoreMatch = line.match(/^Queens #(\d+)\s*\|\s*(\d+):(\d+)(?:.*)?$/);
        if (gameScoreMatch) {
          const game = 'Queens 👑';
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
          const game = 'Crossclimb 🪜';
          const minutes = parseInt(gameScoreMatch[2], 10);
          const seconds = parseInt(gameScoreMatch[3], 10);
          const score = minutes * 60 + seconds; // Convert time to seconds
          addToScores(game, playerName, score);
        }
      }
  
      // Tango: "Tango #106 | 0:21" (lower time = better)
      else if (line.startsWith('Tango')) {
        gameScoreMatch = line.match(/^Tango #(\d+)\s*\|\s*(\d+):(\d+)(?:.*)?$/);
        if (gameScoreMatch) {
          const game = 'Tango 🌗';
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
}
