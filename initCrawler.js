const Crawler = require('./crawler');

// ajouter vos urls ici
async function initCrawler() {
    const sitesToCrawl = [
        
    ];
    
    const crawler = new Crawler();
    
    for (const url of sitesToCrawl) {
        try {
            await crawler.crawlPage(url);
            console.log(`Crawled: ${url}`);
        } catch (err) {
            console.error(`Error crawling ${url}:`, err);
        }
    }
}

initCrawler().catch(console.error);
