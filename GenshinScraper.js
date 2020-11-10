var puppeteer = require("puppeteer");
var chalk = require("chalk");
var fs = require("fs");
var fetch = require("node-fetch");

/*
 * DLCount shows the program admin how many times genshin has successfully shared news posts
 * noDLCount shows the program how many times the program has checked the news website without sharing any news
 */

let DLCount = 0;
let noDLCount = 0;

function totalWebhooks() {
    fetch('http://genshinnews.com/api')
        .then(response => response.text())
        .then(data => {
            discordHooks = JSON.parse(`[${data}]`)

            fs.readFile('./stats.json', 'utf-8', function(err, data) {
                if (err) throw err
                var statsArray = JSON.parse(data);
                statsArray.totalWebhooks = discordHooks.length
                fs.writeFile('./stats.json', JSON.stringify(statsArray), 'utf-8', function(err) {
                    if (err) throw err
                })
            })

        });
}

function totalScrapes() {
    fs.readFile('./stats.json', 'utf-8', function(err, data) {
        if (err) throw err
        var statsArray = JSON.parse(data);
        statsArray.totalScrapes++
        fs.writeFile('./stats.json', JSON.stringify(statsArray), 'utf-8', function(err) {
            if (err) throw err
        })
    })
}

function successfullScrape() {
    fs.readFile('./stats.json', 'utf-8', function(err, data) {
        if (err) throw err
        var statsArray = JSON.parse(data);
        var today = Date.now()
        statsArray.lastPosted = today;
        statsArray.totalSuccessful++
        fs.writeFile('./stats.json', JSON.stringify(statsArray), 'utf-8', function(err) {
            if (err) throw err
        })
    })
}

function postStatsJson() {
    let stats = fs.readFileSync('./stats.json');
    let newStats = JSON.parse(stats);
    let options = {
        method: 'post',
        body: JSON.stringify(newStats),
        headers: {
            'Content-Type': 'application/json',
        }
    };
    fetch('https://genshinnews.com/statsJSON', options)
        .then(response => console.log("Posted"));
}

function scrape() {
    var jsonFile = fs.readFileSync('genshin.json');
    var genshinJSON = JSON.parse(jsonFile);

    // Website that the scraper visits
    var url = "http://genshin.mihoyo.com/en/news/";

    // Pretifys the Console Log
    var error = chalk.bold.red;
    var success = chalk.keyword("green");

    (async () => {
        try {
            // open browser
            const browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio', ]
            });
            // open new page
            var page = await browser.newPage();
            // Navigation Timeout
            await page.setDefaultNavigationTimeout(0);
            // Enter URL
            await page.goto(url, {
                waitUntil: 'load',
                timeout: 0
            });
            await page.waitForSelector(".news__item")

            var news = await page.evaluate(() => {
                var newsList = document.querySelectorAll(".news__item")
                var newsLinkArray = [];

                // Has the ability to pull all 5 news topics but is currently set to one article
                for (var i = 0; i < newsList.length; i++) {

                    newsLinkArray[0] = {
                        title: newsList[0].childNodes[0].querySelector('H3').innerText,
                        image: newsList[0].childNodes[0].querySelector('img').src,
                        link: newsList[0].querySelector('a').href,
                    };
                }

                return newsLinkArray
            });

            await page.goto(news[0].link, {
                waitUntil: 'load',
                timeout: 0
            });
            await page.waitForSelector(".article")

            var article = await page.evaluate(() => {
                function removeParagraphs(str) {
                    return str.replace(/[\r\n]+/gm, " ");
                }

                var articleList = document.querySelector(".article__content")
                var articleArray = [];

                for (var i = 0; i < 1; i++) {

                    articleArray[0] = {
                        content: removeParagraphs(`${articleList.innerText.slice(0,500).trim('')}`)
                    };
                }
                return articleArray
            })

            // Combines both JSON files into one object
            var result = {
                news: news,
                description: article,
            };

            await browser.close();
            var list = "";

            // Retrieves webhooks from other server 
            function getItems() {
                fetch('http://genshinnews.com/
                ')
                    .then(response => response.text())
                    .then(data => {
                        discordHooks = JSON.parse(`[${data}]`)
                        webhookLoop(discordHooks)
                    });
            }


            /** Desctiption of webhookLoop
             *
             * @param {object} discordWebhook - A JSON containing registered users
             * 
             **/

            function webhookLoop(discordWebhook) {

                for (let i = 0; i < discordWebhook.length; i++) {
                    list += discordWebhook[i].webhook.url
                    try {
                        const webhook = require("webhook-discord")
                        const hook = new webhook.Webhook(discordWebhook[i].webhook.url)
                        const msg = new webhook.MessageBuilder()
                            .setAvatar("https://lh3.googleusercontent.com/So91qs_eRRralMxUzt_tkj4aBXvVSYqWiEJrzrk_LBd5071mSMv_gBKslyulIOrPsiQ=s180-rw")
                            .setName("Genshin News")
                            .setAuthor('GenshinNews.com', '', 'https://genshinnews.com')
                            .setColor("#aabbcc")
                            .setURL(result.news[0].link)
                            .setDescription(`${result.description[0].content}\n\n More details [here](${result.news[0].link})!`)
                            .setImage(result.news[0].image)
                            .setTitle(result.news[0].title);
                        hook.send(msg)
                    } catch(error) {
                        console.log(`Error:${error}`)
                        delete discordWebhook[i]
                    };
                }
                return list
            }

            // Checks if a new article has been posted on Genshin website

            if (result.news[0].title === genshinJSON.news[0].title) {
                noDLCount += 1;
                totalScrapes(); // updates stats.json
                console.log(success(`No new articles have been detected. This sessions has had ${noDLCount} checks`))
                await browser.close();
            } else {
                DLCount += 1;
                // Write the news inside JSON file
                fs.writeFile("genshin.json", JSON.stringify(result), function(err) {
                    if (err) throw err;
                    console.log(success(`This sessions has had ${DLCount} successful downloads`));
                    successfullScrape()
                    getItems()
                });
                await browser.close();
                console.log(success("Browser Closed"));
            }

        } catch (err) {
            //Catch and display errors
            console.log(error(err));
            await browser.close();
            console.log(error("Browser Closed"));
        }

    })()
};

/**
 * PURPOSE
 * Loops the script to every 5 minutes
 * Change minutes number to increase/decrease time
 */

const minutes = 1 // sets the total time to check the file
const interval = minutes * 60 * 1000; // **DO NOT EDIT ** converts milleseconds to minutes
setInterval(function() {
    console.log(`Performing my ${minutes} minute check`);
    scrape();
    totalWebhooks();
    postStatsJson();
}, interval);
