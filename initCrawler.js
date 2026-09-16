const fs = require('fs');
const path = require('path');
const InfiniteCrawler = require('./crawler');

async function initCrawler() {
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) {
        console.error("Fichier config.json introuvable.");
        return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const crawler = new InfiniteCrawler(config);

    // Sauvegarde en cas d'interruption (CTRL+C)
    process.on('SIGINT', () => {
        console.log("\nInterruption detectee. Sauvegarde de l'etat...");
        crawler.saveState();
        process.exit(0);
    });

    await crawler.start();
}

initCrawler().catch(console.error);