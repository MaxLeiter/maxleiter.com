---
title: How hackers* run their sites
description: An analysis based on 700 personal websites
slug: hacker-sites
date: Apr 7, 2022
---

<small>\* hackers: users of hacker news</small>

Yesterday, when I probably should have been doing something productive, I instead [asked hacker news users for links to their personal sites](<(https://news.ycombinator.com/item?id=30934529)>).

It got far more replies than I expected (over 1000 at the time of writing) so I had the idea to do some scraping and see how commenters build and host their sites.

I wrote a quick-and-dirty typescript script (at the bottom of page) for scraping, pinging, and sorting the comments. I could've used a pre-existing library or service for determining tech used on the sites, but where's the fun in that? I’d have loved to add features like checking for git repository links and doing some API calls for a more in-depth analysis, but I’ll leave the complicated parts as exercises for the reader.

If I were to do this all again, I would absolutely not choose JavaScript. Just 0 real benefits; I spent more time than I care to admit bashing my head before remembering `Promise.allSettled` exists. I should've just used Python.

## The stats:

Of the 721 top level comments, 692 contained links and were analyzed at the time of writing. I only looked at the first link in a comment, timed out after 30 seconds, and skipped invalid/self-signed certificates.

#### Some fun ones:

- 4 sites offer the `onion-location` response header
- One `"x-nananana": "Batcache",` response header
- One site is behind `Apache/2.4.7`, which was released in 2013 and has [multiple CVEs](https://www.cvedetails.com/vulnerability-list/vendor_id-45/product_id-66/version_id-524064/Apache-Http-Server-2.4.7.html)
  - This is also the only site to advertise `mod_perl`, so do with that what you may.

#### The scraped stuff:

- Contains JavaScript: 567
- Github Pages: 146
- Cloudflare: 141
- Nginx: 114
- Netlify: 83
- Apache: 70
- Vercel: 50
- Bootstrap: 45
- Gatsby: 30
- Nextjs: 28
- Amazon S3: 27
- Wordpress: 22
- Cloudfront: 17
- Express: 16
- PHP: 14
- Caddy: 9
- Litespeed: 8
- Open Resty: 8
- Google App Engine: 3
- FlyIO: 3
- MicorosftIIS: 3
- Drupal: 2
- Tailwind: 2
- Lighttpd: 2
- Godlighty: 1
- Perl: 1
- Neocities: 1
- Asp.NET: 1
- Gatsby Cloud: 1
- Openbsd Httpd: 1

Instead of using a proper DOM scraping library or anything, I just search the headers and page text. Not the most efficient or accurate, so if you find an issue please let me know! You can see my source code [here](https://paste.maxleiter.com/post/17dd30b8-4fd2-4270-a8a4-c6aab73a0211), although I'd recommend just doing it yourself from scratch and not scarring your eyes.
