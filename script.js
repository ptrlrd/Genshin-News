// Stats declarations
const scrapes = document.querySelector(".totalScrapes");
const articles = document.querySelector(".articles");
const subscribers = document.querySelector(".servers");
const last = document.querySelector(".last");

// Discord Embed Declerations
const title = document.querySelector(".discordTitle");
const content = document.querySelector(".discordContentText");
const img = document.querySelector(".discordimg");
const titleLink = document.querySelector(".discordTitleLink");

// request stats from main server
function stats() {
  fetch("https://genshinnews.com/statsJSON", {
    mode: "no-cors",
  })
    .then((response) => response.json())
    .then((data) => {
      (scrapes.textContent = data.totalScrapes),
        (articles.textContent = data.totalSuccessful),
        (subscribers.textContent = data.totalWebhooks),
        (last.textContent = Date(data.lastPosted).toLocaleString("en-US"));
    });
}

// request article from main server and generates embed on website
function discordMessage() {
  fetch("https://genshinnews.com/article", {
    mode: "no-cors",
  })
    .then((response) => response.json())
    .then((data) => {
      (title.textContent = data.news[0].title),
        (titleLink.href = data.news[0].link),
        (content.textContent = data.description[0].content
          .replaceAll("〓", "")
          .replaceAll("●", "")),
        (img.src = data.news[0].image);
    });
}

// Refreshes stats in real time on website
discordMessage();
setInterval(discordMessage, 6000);
stats();
setInterval(stats, 6000);
