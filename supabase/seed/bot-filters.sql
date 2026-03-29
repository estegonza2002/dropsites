-- Bot filter seed data
-- Common bot User-Agent patterns for reference / future DB-driven filtering.
--
-- Currently bot detection is handled in-memory by lib/serving/bot-filter.ts.
-- This seed file documents the canonical bot patterns and can be loaded into
-- a lookup table if the system moves to DB-driven classification.

-- Search engine crawlers
-- Googlebot/2.1 (+http://www.google.com/bot.html)
-- Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)
-- Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)
-- Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)
-- DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)
-- Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)
-- Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)

-- Social / preview bots
-- facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)
-- Twitterbot/1.0
-- LinkedInBot/1.0 (compatible; Mozilla/5.0)
-- WhatsApp/2.21.12.21 A
-- TelegramBot (like TwitterBot)
-- Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)
-- Discordbot/2.0

-- AI / LLM crawlers
-- GPTBot/1.0 (+https://openai.com/gptbot)
-- ClaudeBot/1.0
-- CCBot/2.0 (https://commoncrawl.org/faq/)
-- Bytespider (bytedance crawler)
-- PetalBot

-- SEO tools
-- AhrefsBot/7.0
-- SemrushBot/7~bl
-- MJ12bot/v1.4.8
-- DotBot/1.2
-- rogerbot/1.2

-- Monitoring
-- UptimeRobot/2.0
-- Pingdom.com_bot_version_1.4
-- Site24x7
-- StatusCake

-- Generic indicators (substrings)
-- bot, crawl, spider, headlesschrome, phantomjs, puppeteer, selenium
