document.addEventListener('DOMContentLoaded', async () => {
    // 1. Éléments DOM & Paramètres URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    const page = parseInt(params.get('page'), 10) || 1;
    const resultsPerPage = 50;

    const resultsContainer = document.getElementById('results');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('searchInput');
    let currentTab = localStorage.getItem('searchTab') || 'web';

    // 2. Gestion de la barre de recherche
    if (searchInput) {
        searchInput.value = query;
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const searchQuery = searchInput.value.trim();
                if (searchQuery) {
                    window.location.href = `/search.html?q=${encodeURIComponent(searchQuery)}`;
                }
            });
        }
    }

    if (loader) loader.style.display = 'block';

    // 3. Récupération des données
    let data = [];
    try {
        const res = await fetch('/searchData.json');
        if (!res.ok) throw new Error('Erreur HTTP');
        data = await res.json();
    } catch (e) {
        if (loader) loader.style.display = 'none';
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div style="color:red;text-align:center;padding:2rem;">Erreur lors du chargement des données de recherche.</div>';
        }
        return;
    }

    // 4. Contrôles de sécurité
    const securityChecks = {
        isDarkWebDomain: (url) => {
            const darkwebPatterns = ['.onion', '.i2p', 'darknet', 'hidden'];
            return darkwebPatterns.some(pattern => url.toLowerCase().includes(pattern));
        },
        isSuspiciousDomain: (url) => {
            const suspiciousPatterns = ['scam', 'phishing', 'hack', 'crack', 'warez', 'malware', 'trojan', 'botnet', 'exploit'];
            return suspiciousPatterns.some(pattern => url.toLowerCase().includes(pattern));
        },
        hasUnsafeContent: (content) => {
            const unsafePatterns = ['password stealer', 'credit card', 'bank account', 'social security', 'identity theft'];
            return unsafePatterns.some(pattern => content.toLowerCase().includes(pattern));
        },
        isSecureUrl: (url) => {
            try {
                return new URL(url).protocol === 'https:';
            } catch {
                return false;
            }
        }
    };

    // 5. Filtrage des données
    const q = query.trim().toLowerCase();
    const filtered = data.filter(item => {
        if (!item.url) return false;
        if (securityChecks.isDarkWebDomain(item.url) || 
            securityChecks.isSuspiciousDomain(item.url) ||
            securityChecks.hasUnsafeContent(item.content || '') ||
            !securityChecks.isSecureUrl(item.url)) {
            return false;
        }

        return (item.title && item.title.toLowerCase().includes(q)) ||
               (item.description && item.description.toLowerCase().includes(q)) ||
               (item.content && item.content.toLowerCase().includes(q));
    });

    if (loader) loader.style.display = 'none';

    // 6. Gestion du basculement d'onglets (Web / Images / etc.)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.type === currentTab) btn.classList.add('active');

        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.type;
            localStorage.setItem('searchTab', currentTab);
            
            renderCurrentView();
        });
    });

    // 7. Fonction d'affichage principale selon l'onglet
    function renderCurrentView() {
        if (!filtered.length) {
            resultsContainer.innerHTML = '<div style="padding:2rem;text-align:center;color:#888;font-size:1.2rem;">Aucun résultat trouvé.</div>';
            return;
        }

        if (currentTab === 'images') {
            renderImageResults(filtered);
        } else if (currentTab === 'web') {
            renderWebResults(filtered);
        } else {
            resultsContainer.innerHTML = '<div class="coming-soon" style="text-align:center;padding:2rem;color:#666;">Cette fonctionnalité sera bientôt disponible.</div>';
        }
    }

    // 8. Rendu des résultats Web avec Pagination
    function renderWebResults(items) {
        const start = (page - 1) * resultsPerPage;
        const paginatedResults = items.slice(start, start + resultsPerPage);
        const totalPages = Math.ceil(items.length / resultsPerPage);

        const resultsWrapper = document.createElement('div');
        resultsWrapper.className = 'results-wrapper';
        
        paginatedResults.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'result-item';

            let imgHtml = '';
            if (item.image) {
                imgHtml = `<img class="result-image" src="${item.image}" alt="Aperçu" loading="lazy" onerror="this.hidden=true">`;
            }

            let catHtml = '';
            if (item.categories && item.categories.length) {
                catHtml = `<div class="result-categories">${item.categories.map(cat =>
                    `<span class="result-chip">${cat}</span>`
                ).join('')}</div>`;
            }

            div.innerHTML = `
                ${imgHtml}
                <div class="result-content">
                    <a class="result-title" href="${item.url}" target="_blank" rel="noopener">${item.title || item.url}</a>
                    <span class="result-url">${item.url}</span>
                    <div class="result-desc">${item.description || ''}</div>
                    ${catHtml}
                </div>
            `;
            resultsWrapper.appendChild(div);
        });

        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(resultsWrapper);
        renderPagination(items.length, totalPages);
    }

    // 9. Rendu de la Galerie d'Images & Modale
    function renderImageResults(items) {
        resultsContainer.innerHTML = '';
        const imageResults = items.filter(item => item.image);
        
        if (!imageResults.length) {
            resultsContainer.innerHTML = '<div style="text-align:center;padding:2rem;">Aucune image disponible dans les résultats.</div>';
            return;
        }

        const imageGrid = document.createElement('div');
        imageGrid.className = 'image-results';

        // Nettoyage de l'ancienne modale si elle existe déjà
        const existingModal = document.querySelector('.image-modal');
        const existingOverlay = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();
        if (existingOverlay) existingOverlay.remove();

        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <button class="modal-close" aria-label="Fermer">&times;</button>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title"></h3>
                </div>
                <div class="modal-image-container">
                    <img class="modal-image" src="" alt="">
                </div>
                <div class="similar-images"></div>
            </div>
        `;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        document.body.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = () => {
            modal.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        };

        modal.querySelector('.modal-close').onclick = closeModal;
        overlay.onclick = closeModal;

        const openModal = (item) => {
            const modalImg = modal.querySelector('.modal-image');
            const modalTitle = modal.querySelector('.modal-title');
            
            modalImg.src = item.image;
            modalImg.alt = item.title || '';
            modalTitle.textContent = item.title || item.url;
            
            const similarImages = imageResults
                .filter(img => img !== item)
                .sort(() => 0.5 - Math.random())
                .slice(0, 6);

            const similarContainer = modal.querySelector('.similar-images');
            similarContainer.innerHTML = similarImages
                .map(img => `
                    <div class="similar-image">
                        <img src="${img.image}" alt="${img.title || ''}" loading="lazy">
                    </div>
                `).join('');

            similarContainer.querySelectorAll('.similar-image').forEach((simImg, i) => {
                simImg.onclick = (e) => {
                    e.stopPropagation();
                    openModal(similarImages[i]);
                };
            });

            modal.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        imageResults.forEach((item) => {
            const div = document.createElement('div');
            div.className = 'image-item';
            div.innerHTML = `
                <img src="${item.image}" alt="${item.title || ''}" loading="lazy">
                <div class="image-info">
                    <div>${item.title || 'Sans titre'}</div>
                    <small>${item.url}</small>
                </div>
            `;
            div.onclick = () => openModal(item);
            imageGrid.appendChild(div);
        });

        resultsContainer.appendChild(imageGrid);
    }

    // 10. Générateur de Pagination
    function renderPagination(totalItems, totalPages) {
        if (totalPages <= 1) return;

        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination-container';

        const resultCount = document.createElement('div');
        resultCount.className = 'result-count';
        resultCount.textContent = `${totalItems} résultats - Page ${page} sur ${totalPages}`;
        paginationDiv.appendChild(resultCount);

        const paginationNav = document.createElement('div');
        paginationNav.className = 'pagination';

        if (page > 1) {
            const prevBtn = document.createElement('a');
            prevBtn.href = `/search.html?q=${encodeURIComponent(query)}&page=${page - 1}`;
            prevBtn.className = 'page-btn';
            prevBtn.innerHTML = '&larr;';
            paginationNav.appendChild(prevBtn);
        }

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
                const pageBtn = document.createElement('a');
                pageBtn.href = `/search.html?q=${encodeURIComponent(query)}&page=${i}`;
                pageBtn.className = `page-btn ${i === page ? 'active' : ''}`;
                pageBtn.textContent = i;
                paginationNav.appendChild(pageBtn);
            } else if (i === page - 3 || i === page + 3) {
                const dots = document.createElement('span');
                dots.className = 'pagination-ellipsis';
                dots.textContent = '...';
                paginationNav.appendChild(dots);
            }
        }

        if (page < totalPages) {
            const nextBtn = document.createElement('a');
            nextBtn.href = `/search.html?q=${encodeURIComponent(query)}&page=${page + 1}`;
            nextBtn.className = 'page-btn';
            nextBtn.innerHTML = '&rarr;';
            paginationNav.appendChild(nextBtn);
        }

        paginationDiv.appendChild(paginationNav);
        resultsContainer.appendChild(paginationDiv);
    }

    // Lancement initial de la vue
    renderCurrentView();
});