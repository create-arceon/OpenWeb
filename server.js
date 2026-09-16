const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Configuration des en-têtes de sécurité HTTP (résout X-Frame-Options et CSP)
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    );
    next();
});

// Dossiers statiques pour le front-end et les images capturées
app.use(express.static(path.join(__dirname, 'public')));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));
app.use(express.static(__dirname));
app.use(express.json());

// Fonction utilitaire pour lire les données du crawler
function getSearchData() {
    // Essaie de lire searchData.json ou results.json
    const filePath = path.join(__dirname, 'searchData.json');
    const fallbackPath = path.join(__dirname, 'results.json');
    
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else if (fs.existsSync(fallbackPath)) {
        return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    }
    return [];
}

// Route API de recherche paginée
app.get('/api/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;

    const data = getSearchData();

    let results = data;
    if (q) {
        results = data.filter(item =>
            (item.title && item.title.toLowerCase().includes(q)) ||
            (item.description && item.description.toLowerCase().includes(q)) ||
            (item.content && item.content.toLowerCase().includes(q))
        );
    }

    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = results.slice(start, start + limit);

    res.json({
        results: paginated,
        total,
        page,
        limit,
        totalPages
    });
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});