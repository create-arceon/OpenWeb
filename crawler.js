const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class InfiniteCrawler {
    constructor(config = {}) {
        this.seeds = config.seeds || [];
        this.maxDepth = config.maxDepth || 5;
        this.visited = new Set();
        this.queue = [];
        this.crawledData = [];

        // Fichiers d'état et de destination
        this.stateFilePath = path.join(__dirname, 'crawler_state.json');
        this.outputFilePath = path.join(__dirname, 'public', 'searchData.json');

        this.loadState();
    }
    loadState() {
        if (fs.existsSync(this.stateFilePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf-8'));
                this.visited = new Set(data.visited || []);
                this.queue = data.queue || [];
            } catch (e) {
                console.error("Erreur de lecture de crawler_state.json:", e.message);
            }
        }

        if (fs.existsSync(this.outputFilePath)) {
            try {
                this.crawledData = JSON.parse(fs.readFileSync(this.outputFilePath, 'utf-8'));
            } catch (e) {
                this.crawledData = [];
            }
        }
        if (this.queue.length === 0) {
            this.seeds.forEach(seed => {
                if (!this.visited.has(seed)) {
                    this.queue.push({ url: seed, depth: 0 });
                }
            });
        }
    }
    saveState() {
        const state = {
            visited: Array.from(this.visited),
            queue: this.queue
        };
        fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
        const publicDir = path.dirname(this.outputFilePath);
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(this.outputFilePath, JSON.stringify(this.crawledData, null, 2));

        console.log(`\nDonnées sauvegardées : ${this.crawledData.length} pages indexées dans public/searchData.json`);
    }

    async start() {
        console.log(`Démarrage avec ${this.queue.length} URLs dans la file...`);

        while (this.queue.length > 0) {
            const { url, depth } = this.queue.shift();

            if (this.visited.has(url) || depth > this.maxDepth) {
                continue;
            }

            this.visited.add(url);
            console.log(`[Profondeur ${depth}] Crawling: ${url} (Reste: ${this.queue.length})`);

            try {
                const response = await axios.get(url, {
                    timeout: 8000,
                    headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }
                });

                const contentType = response.headers['content-type'] || '';
                if (contentType.includes('text/html')) {
                    const $ = cheerio.load(response.data);

                    // --- Extraction des métadonnées pour le moteur de recherche ---
                    const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
                    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
                    
                    // Récupération de l'image principale (OG Image ou première image de la page)
                    let image = $('meta[property="og:image"]').attr('content') || $('img').first().attr('src') || null;
                    if (image) {
                        try {
                            image = new URL(image, url).href;
                        } catch (e) {
                            image = null;
                        }
                    }

                    // Nettoyage du texte pour la recherche
                    $('script, style, noscript').remove();
                    const content = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 1000);

                    // Mise à jour ou ajout dans la base
                    const existingIndex = this.crawledData.findIndex(item => item.url === url);
                    const pageEntry = { title, description, url, content, image, categories: [] };

                    if (existingIndex !== -1) {
                        this.crawledData[existingIndex] = pageEntry;
                    } else {
                        this.crawledData.push(pageEntry);
                    }

                    // --- Extraction des liens pour la suite du crawl ---
                    let newLinks = 0;
                    $('a[href]').each((_, element) => {
                        const href = $(element).attr('href');
                        try {
                            const absoluteUrl = new URL(href, url).href;
                            if (absoluteUrl.startsWith('http') && !this.visited.has(absoluteUrl)) {
                                this.queue.push({ url: absoluteUrl, depth: depth + 1 });
                                newLinks++;
                            }
                        } catch (e) {
                            // Ignorer liens invalides
                        }
                    });

                    console.log(`   -> Extraits: "${title.slice(0, 30)}..." | ${newLinks} nouveaux liens`);
                }
            } catch (error) {
                console.log(`   -> Échec sur ${url}: ${error.message}`);
            }

            // Sauvegarde automatique toutes les 5 pages crawlées
            if (this.visited.size % 5 === 0) {
                this.saveState();
            }
        }
    }
}

module.exports = InfiniteCrawler;