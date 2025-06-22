document.getElementById('generateLeaderboardBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: async () => {
          async function scrollUntilPastToday() {
            const scrollable = document.querySelector('#message-list-ember3');
            if (!scrollable) {
              console.error("No scrollable chat container.");
              return;
            }

            const SCROLL_INTERVAL = 300; // Wait time after scroll
            const MAX_SCROLLS = 30; // Prevent infinite scroll loop
            let scrolls = 0;

            while (scrolls < MAX_SCROLLS) {
              const timeHeaders = Array.from(document.querySelectorAll('time.msg-s-message-list__time-heading'));
              const hasOlderThanToday = timeHeaders.some(time => {
                const text = time.textContent.trim().toUpperCase();
                return text && text !== 'TODAY';
              });

              if (hasOlderThanToday) {
                console.log("Reached older-than-today message. Now processing messages.");
                break;
              }

              // Otherwise, scroll up
              scrollable.scrollBy({ top: -3000, behavior: 'instant' });
              await new Promise(resolve => setTimeout(resolve, SCROLL_INTERVAL));
              scrolls++;
            }
          }

          async function generateLeaderboard() {
            const chatContainer = document.querySelector('.msg-s-message-list-content');
            if (!chatContainer) {
              console.error("No chat container.");
              return;
            }

            await scrollUntilPastToday(chatContainer);

            let processMessages = false; // Start processing only after "TODAY" header
            let lastSenderName = null; // Track last sender
            const scores = {};
            const messageNodes = chatContainer.querySelectorAll('.msg-s-event-listitem');

            function isDayHeader(messageElement) {
              const parentText = messageElement.parentElement.innerText.trim();
              return parentText.startsWith('TODAY');
            }

            function getSenderName(messageElement) {
              // If message has at least 3 child elements, then sender name is included. Otherwise, use last sender name.
              if (messageElement.childElementCount >= 3) {
                lastSenderName = messageElement.firstElementChild.nextElementSibling.firstElementChild.innerText.trim();
              }
              return lastSenderName;
            }

            function getMessageText(messageElement) {
              let scoreText = messageElement.lastElementChild.innerText.trim(); // Default is that message has no reaction
              if (messageElement.childElementCount % 2 === 0) // Messsage has reaction
                scoreText = messageElement.lastElementChild.previousElementSibling.innerText.trim();
              return scoreText || null;
            }

            function getScore(line) {
              let scoreMatch;
              if (scoreMatch = line.match(/#(\d+)\s\|\s(\d+)\sguess/)) { // "Pinpoint #234 | 1 guess"
                return parseInt(scoreMatch[2], 10);
              }
              if (scoreMatch = line.match(/\((\d+)\/(\d+)\)/)) { // Alt format: "Pinpoint #234 \n 📌 ⬜ ⬜ ⬜ ⬜ (1/5)"
                return parseInt(scoreMatch[1], 10);
              }
              if (scoreMatch = line.match(/(\d+):(\d+)/)) { // Rest of games are time-based: "1:23"
                const minutes = parseInt(scoreMatch[1], 10);
                const seconds = parseInt(scoreMatch[2], 10);
                return minutes * 60 + seconds; // Convert time to seconds
              }
              return null;
            }

            function parseMessage(playerName, message) {
              const lines = message.split('\n');
              if (lines.length < 1) return;

              lines.forEach((line, index) => {
                let game;
                let score;

                if (line.match(/Pinpoint #(\d+)/)) game = 'Pinpoint 📌';
                else if (line.match(/Queens #(\d+)/)) game = 'Queens 👑';
                else if (line.match(/Crossclimb #(\d+)/)) game = 'Crossclimb 🪜';
                else if (line.match(/Tango #(\d+)/)) game = 'Tango 🌗';
                else if (line.match(/Zip #(\d+)/)) game = 'Zip 🏁';

                if (game) {
                  score = getScore(line);
                  if (!score && index < lines.length - 1) {
                    score = getScore(lines[index + 1]); // Alt format: score on second line
                  }
                  if (score) {
                    if (!scores[game]) scores[game] = [];
                    scores[game].push({ playerName, score });
                  }
                }
              });
            }

            messageNodes.forEach((node) => {
               // Start processing messages after "TODAY" header
              if (isDayHeader(node)) processMessages = true;
              if (processMessages) {
                const senderName = getSenderName(node);
                const messageText = getMessageText(node);
                if (senderName && messageText) parseMessage(senderName, messageText);
              }
            });

            // Generate leaderboard text
            let leaderboard = '<p>🏆 Leaderboard 🏆</p>';
            for (const game in scores) {
              leaderboard += '<p><br></p><p>' + game + '</p>';
              const sorted = scores[game].sort((a, b) => a.score - b.score); // Scores ranked from lowest to highest

              let lastScore = null;
              let rank = 0;
              let numTies = 1;
              sorted.forEach(entry => {
                // Tiebreaking logic: Include all ties, but exclude all inferior scores if number of superior scores is already at least 3
                if (rank > 2) return;
                if (entry.score !== lastScore) {
                  rank += numTies;
                  numTies = 1;
                } else {
                  numTies++;
                }

                const medal = ['🥇', '🥈', '🥉'][rank - 1] || '';
                if (game === 'Pinpoint 📌') {
                  leaderboard += `<p>${medal} ${entry.playerName} — ${entry.score}</p>`;
                } else { // Rest of games are time-based: display score in minutes and seconds
                  const minutes = Math.floor(entry.score / 60);
                  const seconds = entry.score % 60;
                  const finalTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  leaderboard += `<p>${medal} ${entry.playerName} — ${finalTime}</p>`;
                }
                lastScore = entry.score;
              });
            }

            const inputBox = document.querySelector('.msg-form__contenteditable');
            if (inputBox) {
              inputBox.innerHTML = `<p>${leaderboard}</p>`;
              inputBox.dispatchEvent(new Event('input', { bubbles: true })); // Dispatch input event to simulate user typing
            }
          }

          await generateLeaderboard();
        },
      },
      (result) => {
        console.log("Leaderboard generated:", result);
      }
    );
  });
});
