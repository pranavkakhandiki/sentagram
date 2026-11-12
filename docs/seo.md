# Search indexing

The canonical homepage is https://sentagram.win/. All puzzles and dialogs live at that URL, so the sitemap contains only the homepage.

The production HTML includes the game name and a short gameplay explanation before JavaScript runs. JavaScript is still required to play. The interactive game replaces that introduction without adding extra text to the interface.

GitHub Actions builds the site, runs `npm run check:seo`, and uploads `dist/` to GitHub Pages. Vite copies `public/robots.txt`, `public/sitemap.xml`, the favicon, and the social sharing images to the domain root. No GitHub Pages or DNS settings need changing.

After pushing and a successful Pages deployment:

1. Open https://sentagram.win/robots.txt, https://sentagram.win/sitemap.xml, and https://sentagram.win/social-card.png to confirm the files are live.
2. Add and verify `sentagram.win` in [Google Search Console](https://search.google.com/search-console). A domain property uses a DNS verification record; you can add that manually in Cloudflare.
3. Submit `https://sentagram.win/sitemap.xml` under **Sitemaps**.
4. Inspect `https://sentagram.win/` under **URL inspection**, test the live URL, and request indexing.

Google controls when it crawls and indexes the site and how it ranks results. These changes do not guarantee a particular search position. See Google's [indexing request guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
