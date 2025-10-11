# OpenWeb Search Engine

## Les Fonctions

- Recherche web fonctionelle (a vous de désidez)
- Recherche d'images avec prévisualisation
- Sécurité renforcée contre les contenus malveillants (NORMALEMENT)
- Interface utilisateur jolie
- Mode sombre natif
- Design pour mobile et pc

## Les langages utilisé

- HTML5 et CSS3
- JavaScript
- Node js
- Express
- Cheerio (pour crawling (trés long (il est en BETA mon script))

## SI VOUS VOULEZ CONTRIBUER A SE PROJ

### Fork et Installation
(merci CHATGPT POUR LE MINI TUTO)
1. Forkez le repository en cliquant sur le bouton "Fork" en haut à droite de la page GitHub
2. Clonez votre fork
```bash
git clone https://github.com/votre-username/OpenWeb.git
cd OpenWeb
```

3. Ajoutez le repository original comme remote
```bash
git remote add upstream https://github.com/original-owner/OpenWeb.git
```

4. Installez les dépendances
```bash
npm install
```

5. Lancez le projet
```bash
npm start
```
(FIN) TANK YOU SO MUCH

## Mise en places

### Crawler

Modifiez le fichier `initCrawler.js` pour ajouter vos URLs :

```javascript
const sitesToCrawl = [
    'https://votre-site.com',
    'https://autre-site.com',
    'https://https://social.mtdv.me/ne-cliquer-pas
];
```

### Sécurité OU PAS

Le moteur intègre plusieurs couches de sécurité :
- Filtrage des domaines malveillants
- Protection contre le contenu NSFW
- Vérification des URLs HTTPS
- Protection contre les attaques XSS


