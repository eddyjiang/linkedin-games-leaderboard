document.getElementById('generateLeaderboardBtn').addEventListener('click', () => {
  // Send message to content script to generate leaderboard
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
  // Grab chat container and ensure it exists
  const chatContainer = document.querySelector('.msg-s-message-list-content');
  if (!chatContainer) {
    console.error("Chat container not found.");
    return;
  }

  let processMessages = false; // Start processing only after "TODAY" header
  let lastSenderName = null; // Track last sender
  const scores = {}; // Store scores for each game

  const messageNodes = chatContainer.querySelectorAll('.msg-s-event-listitem');
  
  console.log(messageNodes);
  
  messageNodes.forEach((node) => {
    // Check for "TODAY" header
    if (isDayHeader(node)) {
      console.log("Reached 'TODAY' header. Now processing messages.");
      processMessages = true;
    }

    if (processMessages) {
      const senderName = getSenderName(node); // Get sender name or reuse lastSenderName
      const messageText = getMessageText(node);

      console.log("Sender Name:", senderName);
      console.log("Message Text:", messageText);

      if (senderName && messageText) {
        parseMessage(senderName, messageText);
      }
    }
  });

  // Helper: Detect "TODAY" header
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
    let rank = 0;
    let numTies = 1;
    sortedScores.forEach((entry) => {
      if (lastScore !== entry.score) {
        rank += numTies;
        numTies = 1;
      }
      else {
        numTies++;
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

  // Find input box and insert leaderboard
  const inputBox = document.querySelector('.msg-form__contenteditable');
  if (inputBox) {
    // Use innerHTML to insert leaderboard HTML properly into input box
    inputBox.innerHTML = `<p>${leaderboard}</p>`;

    // Dispatch input event to simulate user typing
    inputBox.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Helper: Get sender name using new property path
  function getSenderName(messageElement) {
    // Check if message has at least 3 child elements (name is included)
    if (messageElement.childElementCount >= 3)
      lastSenderName = messageElement.firstElementChild.nextElementSibling.firstElementChild.innerText.trim()
    return lastSenderName;
  }
  
  // Helper: Get message text
  function getMessageText(messageElement) {
    let scoreText = messageElement.lastElementChild.innerText.trim(); // Message has no reaction
    if (messageElement.childElementCount % 2 == 0) // Messsage has reaction
      scoreText = messageElement.lastElementChild.previousElementSibling.innerText.trim();
    return scoreText || null; // Return game score text or null if not found
  }
  
  // Parse message for game scores
  function parseMessage(playerName, message) {
    const lines = message.split('\n');
    if (lines.length < 1) return;
  
    lines.forEach((line, index) => {
      let gameScoreMatch;
      let altGameScoreMatch;
  
      // "Pinpoint #234 | 1 guess"
      // "Pinpoint #234 \n 📌 ⬜ ⬜ ⬜ ⬜ (1/5)"
      if (line.match(/Pinpoint #(\d+)/)) {
        gameScoreMatch = line.match(/Pinpoint #(\d+)\s\|\s(\d+)/);
        if (index < lines.length - 1) {
          altGameScoreMatch = lines[index + 1].match(/\((\d+)\/(\d+)\)/);
        }
        const game = 'Pinpoint 📌';
        if (gameScoreMatch) {
          const score = parseInt(gameScoreMatch[2], 10);
          addToScores(game, playerName, score);
        }
        else if (altGameScoreMatch) {
          const score = parseInt(altGameScoreMatch[1], 10);
          addToScores(game, playerName, score);
        }
      }
  
      // "Queens #234 | 1:23"
      // "Queens #234 \n 1:23 👑"
      else if (line.match(/Queens #(\d+)/)) {
        gameScoreMatch = line.match(/Queens #(\d+)\s\|\s(\d+):(\d+)/);
        if (index < lines.length - 1) {
          altGameScoreMatch = lines[index + 1].match(/(\d+):(\d+)/);
        }
        const game = 'Queens 👑';
        if (gameScoreMatch) {
          const minutes = parseInt(gameScoreMatch[2], 10);
          const seconds = parseInt(gameScoreMatch[3], 10);
          const score = minutes * 60 + seconds; // Convert time to seconds
          addToScores(game, playerName, score);
        }
        else if (altGameScoreMatch) {
          const minutes = parseInt(altGameScoreMatch[1], 10);
          const seconds = parseInt(altGameScoreMatch[2], 10);
          const score = minutes * 60 + seconds; // Convert time to seconds
          addToScores(game, playerName, score);
        }
      }
  
      // "Crossclimb #234 | 0:20"
      // "Crossclimb #234 \n 0:20 🪜"
      else if (line.match(/Crossclimb #(\d+)/)) {
        gameScoreMatch = line.match(/Crossclimb #(\d+)\s\|\s(\d+):(\d+)/);
        if (index < lines.length - 1) {
          altGameScoreMatch = lines[index + 1].match(/(\d+):(\d+)/);
        }
        const game = 'Crossclimb 🪜';
        if (gameScoreMatch) {
          const minutes = parseInt(gameScoreMatch[2], 10);
          const seconds = parseInt(gameScoreMatch[3], 10);
          const score = minutes * 60 + seconds; // Convert time to seconds
          addToScores(game, playerName, score);
        }
        else if (altGameScoreMatch) {
          const minutes = parseInt(altGameScoreMatch[1], 10);
          const seconds = parseInt(altGameScoreMatch[2], 10);
          const score = minutes * 60 + seconds; // Convert time to seconds
          addToScores(game, playerName, score);
        }
      }
  
      // "Tango #100 | 0:21"
      // "Tango #100 \n 0:21 🌗"
      else if (line.match(/Tango #(\d+)/)) {
        gameScoreMatch = line.match(/Tango #(\d+)\s\|\s(\d+):(\d+)/);
        if (index < lines.length - 1) {
          altGameScoreMatch = lines[index + 1].match(/(\d+):(\d+)/);
        }
        const game = 'Tango 🌗';
        if (gameScoreMatch) {
          const minutes = parseInt(gameScoreMatch[2], 10);
          const seconds = parseInt(gameScoreMatch[3], 10);
          const score = minutes * 60 + seconds; // Convert time to seconds
          addToScores(game, playerName, score);
        }
        else if (altGameScoreMatch) {
          const minutes = parseInt(altGameScoreMatch[1], 10);
          const seconds = parseInt(altGameScoreMatch[2], 10);
          const score = minutes * 60 + seconds; // Convert time to seconds
          addToScores(game, playerName, score);
        }
      }
    });
  }
  
  // Helper: Add scores to leaderboard
  function addToScores(game, playerName, score) {
    if (!scores[game]) scores[game] = [];
    scores[game].push({ player: playerName, score: score });
  }
}
