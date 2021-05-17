var puppeteer = require('puppeteer');
var fs = require('fs');
var fetch = require('node-fetch');

/* Global Variables */
let DLCount = 0; // Shows successfull shares of new posts
let noDLCount = 0; // Shows how many scrapes have been completed

/* Helper Functions */

// Relays error messages to a private Discord Webhook
function discordErrorMsg(e) {
  const webhook = require('webhook-discord');
  const Hook = new webhook.Webhook(
    'https://discord.com/api/webhooks/809533547609718794/dsYjFm1D0mj_lztzqwE5iJc_kTydi8aKW1nlbSzhwoD-Rhya6RNro02x6_Fq--jWxsO-'
  );
  const msg = new webhook.MessageBuilder()
    .setName('Error')
    .setColor('#e74c3c')
    .setDescription(`**Error: ${e}**\n ${e.stack}`);
  Hook.send(msg);
}

// Relays successful messages to a private Discord Webhook
function discordSuccessMsg(str) {
  const webhook = require('webhook-discord');
  const Hook = new webhook.Webhook(
    'https://discord.com/api/webhooks/809546530632892446/C5EDXyZkFY_ppKyqnr4n1oFeAClLf1Byl8JaR8GOmgCqIQh1-v7fcCIFdTZtYyKLGsHf'
  );
  const msg = new webhook.MessageBuilder()
    .setName('Console')
    .setColor('#3ce74c')
    .setDescription(`${str}`)
    .setFooter(
      `::: ${new Date().toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
      })} ::: Uptime: ${scriptUptime(DLCount + noDLCount)} hours :::`
    );
  Hook.send(msg);
}

// Helper function for fixing stats from webserver
function reFetchStats() {
  fetch('https://genshinnews.com/statsJSON')
    .then((response) => response.json())
    .then((data) =>
      fs.writeFile(
        './stats.json',
        JSON.stringify(data),
        'utf-8',
        function (err) {
          if (err) discordErrorMsg(err);
        }
      )
    );
}

function totalScrapes() {
  fs.readFile('./stats.json', 'utf-8', function (err, data) {
    if (err) discordErrorMsg(err);
    var statsArray = JSON.parse(data);
    statsArray.totalScrapes++;
    fs.writeFile(
      './stats.json',
      JSON.stringify(statsArray),
      'utf-8',
      function (err) {
        if (err) discordErrorMsg(err);
      }
    );
  });
}

//successfullSCrape reads a local file, parses the JSON, and then increments totalSuccessful when a post to Discord is successfull
function successfullScrape() {
  fs.readFile('./stats.json', 'utf-8', function (err, data) {
    if (err) discordErrorMsg(err);
    var statsArray = JSON.parse(data);
    var today = Date.now();
    statsArray.lastPosted = today;
    statsArray.totalSuccessful++;
    fs.writeFile(
      './stats.json',
      JSON.stringify(statsArray),
      'utf-8',
      function (err) {
        if (err) discordErrorMsg(err);
      }
    );
  });
}

// When an article has been scraped, the server will push an update to the webserver via post
function postArticles() {
  let article = fs.readFileSync('./genshin.json');
  let parsedArticle = JSON.parse(article);
  let options = {
    method: 'post',
    body: JSON.stringify(parsedArticle),
    headers: {
      'Content-Type': 'application/json',
    },
  };
  fetch('https://genshinnews.com/article', options).then(
    (response) => response
  ); // can be consolelogged for troubleshooting
}

// Uses post to transfer stats data from server to webserver
function postStatsJson() {
  try {
    let stats = fs.readFileSync('./stats.json');
    let newStats = JSON.parse(stats);
    let options = {
      method: 'post',
      body: JSON.stringify(newStats),
      headers: {
        'Content-Type': 'application/json',
      },
    };
    fetch('https://genshinnews.com/statsJSON', options).then(
      (response) => response
    ); // can be used for troubleshooting and verification
  } catch (e) {
    discordErrorMsg(e);
  }
}

// Total Webhooks fetchs total servers from webserver, parses it, and then returns a total a total number of websites
function totalWebhooks() {
  fetch('http://genshinnews.com/api')
    .then((response) => response.text())
    .then((data) => {
      discordHooks = JSON.parse(`[${data}]`);

      fs.readFile('./stats.json', 'utf-8', function (e, data) {
        try {
          var statsArray = JSON.parse(data);
          statsArray.totalWebhooks = discordHooks.length;
          fs.writeFile(
            './stats.json',
            JSON.stringify(statsArray),
            'utf-8',
            function (err) {
              if (err) discordErrorMsg(err);
            }
          );
        } catch (e) {
          reFetchStats();
        }
      });
    });
}

// Helper function for calculating uptime
function scriptUptime(time) {
  let newTime = (time / 60).toFixed(2);
  return newTime;
}

// Core function of program: Visits MiHoYo's News Website and creates a JSON file, if a new news article is found then post to Discord
async function scrape() {
  // Declaration of local JSON file
  var jsonFile = fs.readFileSync('genshin.json');
  var genshinJSON = JSON.parse(jsonFile);
  // Opens Browser
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio'],
  });
  // open new page
  var page = await browser.newPage();
  // Navigation Timeout
  await page.setDefaultNavigationTimeout(0);
  // Remove all Listeners
  await page.removeAllListeners(0);
  // Visits MiHoYo Website
  await page.goto('http://genshin.mihoyo.com/en/news/', {
    waitUntil: 'domcontentloaded',
  });
  // Wait for load and select news item
  await page
    .waitForSelector('.news__item', { timeout: 0 })
    .catch((e) => discordErrorMsg(`Wait for Selector Error: ${e}`));

  var news = await page.evaluate(() => {
    var newsList = document.querySelectorAll('.news__item');
    var newsLinkArray = [];

    // Has the ability to pull all 5 news topics but is currently set to one article
    for (var i = 0; i < 1; i++) {
      newsLinkArray[0] = {
        title: newsList[0].childNodes[0].querySelector('H3').innerText,
        image: newsList[0].childNodes[0].querySelector('img').src,
        link: newsList[0].querySelector('a').href,
      };
    }

    return newsLinkArray;
  });

  await page.goto(news[0].link, {
    waitUntil: 'domcontentloaded',
  });

  await page
    .waitForSelector('.article', { timeout: 0 })
    .catch((e) => discordErrorMsg(`Wait for Selector Error: ${e}`));

  var article = await page.evaluate(() => {
    // Function to trim down text, remove spacing, and paragraphs
    function cutString(string) {
      var cut = string.indexOf(' ', 450);
      if (cut == -1)
        return string
          .replaceAll(/[\r\n]+/gm, ' ')
          .replaceAll(/\s+/g, ' ')
          .replaceAll('〓', '')
          .replaceAll('●', '')
          .trim();
      return string
        .substring(0, cut)
        .replaceAll(/[\r\n]+/gm, ' ')
        .replaceAll(/\s+/g, ' ')
        .replaceAll('〓', '')
        .replaceAll('●', '')
        .trim();
    }

    var articleList = document.querySelector('.article__content');
    var articleArray = [];

    for (var i = 0; i < 1; i++) {
      articleArray[0] = {
        content: cutString(`${articleList.innerText}`),
      };
    }
    return articleArray;
  });

  // Combines both JSON files into one object
  var result = {
    news: news,
    description: article,
  };

  // Closes the browser
  await browser.close();

  // Loops through the discord webhooks and posts the latest news

  // Retrieves list of discord webhooks from webserver
  function getItems() {
    fetch('http://genshinnews.com/api')
      .then((response) => response.text())
      .then((data) => {
        discordHooks = JSON.parse(`[${data}]`);
        webhookLoop(discordHooks);
      });
  }

  function webhookLoop(discordWebhook) {
    for (let i = 0; i < discordWebhook.length; i++) {
      if (discordWebhook[i].error === 'invalid_request') {
        discordErrorMsg(`Check for ${discordWebhook[i].error}`);
      } else {
        const { Webhook, MessageBuilder } = require('discord-webhook-node');
        const hook = new Webhook({
          url: discordWebhook[i].webhook.url,
          //If throwErrors is set to false, no errors will be thrown if there is an error sending
          throwErrors: false,
        });
        hook.setUsername('Genshin News');
        hook.setAvatar(
          'https://lh3.googleusercontent.com/So91qs_eRRralMxUzt_tkj4aBXvVSYqWiEJrzrk_LBd5071mSMv_gBKslyulIOrPsiQ=s180-rw'
        );
        const embed = new MessageBuilder()
          .setAuthor('GenshinNews.com', '', 'https://genshinnews.com')
          .setColor('#aabbcc')
          .setURL(result.news[0].link)
          .setDescription(
            `${result.description[0].content}... Continue reading [here](${result.news[0].link})!`
          )
          .setImage(result.news[0].image)
          .setTitle(result.news[0].title);
        hook.send(embed);
      }
    }
  }

  if (result.news[0].title === genshinJSON.news[0].title) {
    noDLCount += 1;
    totalScrapes(); // updates stats.json
    discordSuccessMsg(
      `No new articles have been scraped. ${noDLCount} checks have been conducted`
    );
    postStatsJson();
    postArticles();
    totalWebhooks();
  } else {
    DLCount += 1;
    // Write the news inside JSON file
    fs.writeFile('genshin.json', JSON.stringify(result), function (err) {
      if (err) discordErrorMsg(err);
      discordSuccessMsg(`This session has had ${DLCount} successful scrapes`);
      successfullScrape();
      postStatsJson();
      getItems();
      postArticles();
      totalWebhooks();
    });
  }
}

setInterval(scrape, 60000); // run application every minute
