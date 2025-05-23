const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const redis = require("redis");
const rateLimit = require("express-rate-limit");
const client = redis.createClient();
const admin = require("firebase-admin");
const rssParser = require("rss-parser");
const serviceAccount = require('./firebase-config.json');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const contactRoutes = require('./contact');


const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', contactRoutes);

const PORT = 5000;

const parser = new rssParser();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// MySQL setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'mypass',
  database: 'destiny_com',
});



db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database.');
});

// Google News RSS Feed URLs
const rssFeeds = {
    "General": "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
    "Politics": "https://news.google.com/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en",
    "Education": "https://news.google.com/rss/search?q=Education&hl=en-IN&gl=IN&ceid=IN:en",
    "World": "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-IN&gl=IN&ceid=IN:en",
    "Business": "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en",
    "Technology": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en",
    "Sports": "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en",
    "Science": "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-IN&gl=IN&ceid=IN:en",
    "Entertainment": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-IN&gl=IN&ceid=IN:en",
    "Health": "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-IN&gl=IN&ceid=IN:en"
};

// Fetch news from Google RSS
// app.get("/google-news", async (req, res) => {
//     const category = req.query.category || "General";
//     const feedUrl = rssFeeds[category] || rssFeeds["General"];

//     try {
//         const feed = await parser.parseURL(feedUrl);
//         const articles = feed.items.map(item => ({
//             title: item.title,
//             link: item.link,
//             image: item.enclosure ? item.enclosure.url : "default.jpg" // Added image URL
//         }));

//         res.json(articles);
//     } catch (error) {
//         console.error("Error fetching news:", error);
//         res.status(500).json({ error: "Failed to fetch Google News" });
//     }
// });




app.get("/google-news", async (req, res) => {
    const category = req.query.category || "General";
    const feedUrl = rssFeeds[category] || rssFeeds["General"];

    try {
        const feed = await parser.parseURL(feedUrl);

        const articles = await Promise.all(feed.items.map(async (item) => {
            let image = "default.jpg"; // fallback image

            if (item.enclosure && item.enclosure.url) {
                image = item.enclosure.url;
            } else {
                try {
                    const { data } = await axios.get(item.link, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0 Safari/537.36'
                        }
                    });

                    const $ = cheerio.load(data);

                    // Try to get image from og:image or twitter:image
                    const ogImage = $('meta[property="og:image"]').attr("content") ||
                                    $('meta[name="twitter:image"]').attr("content");

                    if (ogImage && ogImage.startsWith("http")) {
                        image = ogImage;
                    }

                } catch (err) {
                    console.warn(`Image scraping failed for ${item.link}: ${err.message}`);
                }
            }

            return {
                title: item.title,
                link: item.link,
                image
            };
        }));

        res.json(articles);
    } catch (error) {
        console.error("Error fetching Google News:", error);
        res.status(500).json({ error: "Failed to fetch Google News" });
    }
});



const BASE_URL = "https://theprint.in/";

const categories = {
    "Political News": "category/politics/",
    "Education News": "category/education/",
    "Business News": "category/business/",
    "StockMarket News": "category/economy/",
    "Religious News": "category/religion/",
    "JobRelated News": "category/jobs/",
    "Sports News": "category/sports/",
    "Foreign News": "category/world/"
};

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https:news-aggregation-b4290.firebaseio.com"  // Replace with your project URL
});

// Verify Firebase Integration
admin.auth().listUsers()
    .then(userRecords => {
        console.log('Successfully fetched user data:', userRecords);
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
    });

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await admin.auth().getUserByEmail(email);
        res.json({ success: true, user });
    } catch (error) {
        res.status(400).json({ error: "Invalid credentials" });
    }
});

app.post('/submit-contact', (req, res) => {
    const { name, email, message } = req.body;
  
    if (!name || !email || !message) {
      return res.status(400).send('All fields are required.');
    }
  
    const query = 'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)';
    db.query(query, [name, email, message], (err, results) => {
      if (err) {
        console.error('Error inserting data:', err);
        return res.status(500).send('Something went wrong. Please try again.');
      }
  
      res.send(`<script>alert("Message sent successfully!"); window.location.href="/";</script>`);
    });
  });

app.get("/news", async (req, res) => {
    try {
        const category = req.query.category;
        const categoryUrl = categories[category] ? `${BASE_URL}${categories[category]}` : BASE_URL;

        const { data } = await axios.get(categoryUrl);
        const $ = cheerio.load(data);
        let news = [];

        $(".td-module-container").each((index, element) => {
            const title = $(element).find(".entry-title a").text().trim();
            const link = $(element).find(".entry-title a").attr("href");
            const image = $(element).find("img").attr("src");

            if (title && link) {
                news.push({ title, link, image });
            }
        });

        res.json(news);
    } catch (error) {
        console.error("Error fetching news:", error);
        res.status(500).json({ error: "Error fetching news" });
    }
});

app.get("/news", async (req, res) => {
    const category = req.query.category || "general";

    client.get(category, async (err, cachedData) => {
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        try {
            const { data } = await axios.get(`https://theprint.in/category/${category}`);
            const articles = extractArticles(data); // A function to extract news articles
            client.setex(category, 3600, JSON.stringify(articles)); // Cache for 1 hour
            res.json(articles);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch news." });
        }
    });
});

app.get("/news", async (req, res) => {
    const category = req.query.category || "general";
    const page = req.query.page || 1;
    const url = `https://theprint.in/category/${category}?page=${page}`;

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const articles = [];

        $(".td-module-container").each((i, element) => {
            const title = $(element).find(".entry-title a").text();
            const link = $(element).find(".entry-title a").attr("href");
            articles.push({ title, url: link });
        });

        res.json({ articles });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch news." });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

admin.auth().listUsers()
    .then((userRecords) => {
        userRecords.users.forEach(user => {
            console.log(`UID: ${user.uid}`);
            console.log(`Email: ${user.email}`);
        });
        userRecords.users.forEach(user => {
            console.log(`UID: ${user.uid}`);
            console.log(`Email: ${user.email}`);
        });
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
    });

admin.auth().updateUser('EFfc6Ls4LQdf9USvZJfAxwiN4dS2', {
    displayName: 'Nethra GR'
})
    .then(userRecord => {
        console.log('Successfully updated user:', userRecord.toJSON());
    })
    .catch(error => {
        console.error('Error updating user:', error);
    });

admin.auth().deleteUser('EFfc6Ls4LQdf9USvZJfAxwiN4dS2')
    .then(() => {
        console.log('Successfully deleted user');
    })
    .catch(error => {
        console.error('Error deleting user:', error);
    });

