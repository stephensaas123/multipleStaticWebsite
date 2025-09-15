// data-loader.js - Système de chargement dynamique des données Firebase

class DataLoader {
    constructor(businessId, businessType) {
        this.businessId = businessId;
        this.businessType = businessType;
        this.businessData = null;
        this.isLoading = false;
    }

    async initialize() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            await this.loadBusinessData();
            await this.renderPage();
            this.hideLoadingStates();
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
        }
    }

    async loadBusinessData() {
        try {
            const doc = await db.collection('businesses').doc(this.businessId).get();
            
            if (doc.exists) {
                this.businessData = doc.data();
                console.log('Données business chargées:', this.businessData);
            } else {
                throw new Error('Business non trouvé');
            }
        } catch (error) {
            console.error('Erreur Firebase:', error);
            throw error;
        }
    }

    async renderPage() {
        if (!this.businessData) return;

        const data = this.businessData.data;

        // Rendu des éléments communs
        this.renderNavigation();
        this.renderBasicInfo(data.basic_info);
        this.renderFooter(data.basic_info);

        // Rendu spécifique à la page
        const currentPage = this.getCurrentPage();
        switch (currentPage) {
            case 'accueil':
            case 'index':
                await this.renderHomePage(data);
                break;
            case 'menu':
                await this.renderMenuPage(data);
                break;
            case 'services':
                await this.renderServicesPage(data);
                break;
            case 'produits':
                await this.renderProductsPage(data);
                break;
            case 'contact':
                this.renderContactPage(data.basic_info);
                break;
            case 'reservation':
            case 'rdv':
                await this.renderBookingPage(data);
                break;
        }

        // Charger les widgets si nécessaire
        await this.loadWidgets(data.widgets);
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'index';
        return page === 'index' ? 'accueil' : page;
    }

    renderNavigation() {
        const navMenu = document.getElementById('nav-menu');
        if (!navMenu) return;

        const pages = this.getPagesByBusinessType();
        let navHTML = '';

        pages.forEach(page => {
            const isActive = this.getCurrentPage() === page.key ? 'active' : '';
            navHTML += `<li><a href="${page.url}" class="${isActive}">${page.title}</a></li>`;
        });

        navMenu.innerHTML = navHTML;
    }

    getPagesByBusinessType() {
        const commonPages = [
            { key: 'accueil', url: 'index.html', title: 'Accueil' },
            { key: 'contact', url: 'contact.html', title: 'Contact' }
        ];

        const businessPages = {
            restaurant: [
                { key: 'menu', url: 'menu.html', title: 'Menu' },
                { key: 'reservation', url: 'reservation.html', title: 'Réserver' }
            ],
            coiffeur: [
                { key: 'services', url: 'services.html', title: 'Services' },
                { key: 'rdv', url: 'rdv.html', title: 'Rendez-vous' }
            ],
            independant: [
                { key: 'services', url: 'services.html', title: 'Services' },
                { key: 'rdv', url: 'rdv.html', title: 'Rendez-vous' }
            ],
            commerce: [
                { key: 'produits', url: 'produits.html', title: 'Produits' }
            ]
        };

        const pages = [commonPages[0]]; // Accueil en premier
        if (businessPages[this.businessType]) {
            pages.push(...businessPages[this.businessType]);
        }
        pages.push(commonPages[1]); // Contact en dernier

        return pages;
    }

    renderBasicInfo(basicInfo) {
        // Nom du business
        const businessNameElement = document.getElementById('business-name');
        if (businessNameElement) {
            businessNameElement.textContent = basicInfo.name || 'Mon Business';
        }

        // Titre de la page
        if (basicInfo.name) {
            document.title = `${this.getPageTitle()} - ${basicInfo.name}`;
        }
    }

    getPageTitle() {
        const titles = {
            'accueil': 'Accueil',
            'menu': 'Menu',
            'services': 'Services',
            'produits': 'Produits',
            'contact': 'Contact',
            'reservation': 'Réservation',
            'rdv': 'Rendez-vous'
        };
        return titles[this.getCurrentPage()] || 'Page';
    }

    async renderHomePage(data) {
        await this.renderHeroSection(data.hero);
        await this.renderGallery(data.gallery);
        
        // Sections spécifiques selon le type de business
        if (this.businessType === 'restaurant') {
            this.renderMenuPreview(data);
        } else if (this.businessType === 'coiffeur' || this.businessType === 'independant') {
            this.renderServicesPreview(data.services);
        }
    }

    async renderHeroSection(heroData) {
        if (!heroData || (!heroData.title && !heroData.image_url)) return;

        const heroContainer = document.getElementById('hero-section') || this.createHeroSection();

        let heroHTML = '<div class="hero-content">';
        
        if (heroData.title) {
            heroHTML += `<h1 class="hero-title">${this.escapeHTML(heroData.title)}</h1>`;
        }
        
        if (heroData.subtitle) {
            heroHTML += `<p class="hero-subtitle">${this.escapeHTML(heroData.subtitle)}</p>`;
        }
        
        if (heroData.cta_text) {
            const ctaUrl = this.getCtaUrl();
            heroHTML += `<a href="${ctaUrl}" class="hero-cta btn-primary">${this.escapeHTML(heroData.cta_text)}</a>`;
        }
        
        heroHTML += '</div>';

        if (heroData.image_url) {
            const imageUrl = await this.getImageUrl(heroData.image_url);
            heroContainer.style.backgroundImage = `url(${imageUrl})`;
            heroContainer.classList.add('hero-with-bg');
        }

        heroContainer.innerHTML = heroHTML;
    }

    createHeroSection() {
        const heroSection = document.createElement('section');
        heroSection.id = 'hero-section';
        heroSection.className = 'hero-section';
        
        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(heroSection, mainContent.firstChild);
        
        return heroSection;
    }

    getCtaUrl() {
        const ctaUrls = {
            restaurant: 'reservation.html',
            coiffeur: 'rdv.html',
            independant: 'rdv.html',
            commerce: 'produits.html'
        };
        return ctaUrls[this.businessType] || 'contact.html';
    }

    async renderGallery(galleryData) {
        if (!galleryData || galleryData.length === 0) return;

        const galleryContainer = document.getElementById('gallery-section') || this.createGallerySection();
        
        let galleryHTML = '<h2>Galerie</h2><div class="gallery-grid">';
        
        for (const image of galleryData) {
            const imageUrl = await this.getImageUrl(image.url);
            galleryHTML += `
                <div class="gallery-item">
                    <img src="${imageUrl}" alt="${this.escapeHTML(image.alt || '')}" loading="lazy">
                    ${image.caption ? `<p class="gallery-caption">${this.escapeHTML(image.caption)}</p>` : ''}
                </div>
            `;
        }
        
        galleryHTML += '</div>';
        galleryContainer.innerHTML = galleryHTML;
    }

    createGallerySection() {
        const gallerySection = document.createElement('section');
        gallerySection.id = 'gallery-section';
        gallerySection.className = 'gallery-section';
        
        const mainContent = document.querySelector('.main-content');
        mainContent.appendChild(gallerySection);
        
        return gallerySection;
    }

    async renderMenuPage(data) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;

        let menuHTML = '<div class="menu-container">';

        // Menu du jour
        if (data.menu_du_jour && data.menu_du_jour.enabled && data.menu_du_jour.items.length > 0) {
            menuHTML += await this.renderMenuSection('Menu du jour', data.menu_du_jour.items);
        }

        // Carte principale
        if (data.carte_principale && data.carte_principale.enabled && data.carte_principale.categories.length > 0) {
            menuHTML += '<h2>Carte principale</h2>';
            for (const category of data.carte_principale.categories) {
                if (category.items && category.items.length > 0) {
                    menuHTML += await this.renderMenuSection(category.name, category.items);
                }
            }
        }

        // Menu boissons
        if (data.menu_boissons && data.menu_boissons.enabled && data.menu_boissons.categories.length > 0) {
            menuHTML += '<h2>Menu des boissons</h2>';
            for (const category of data.menu_boissons.categories) {
                if (category.items && category.items.length > 0) {
                    menuHTML += await this.renderMenuSection(category.name, category.items);
                }
            }
        }

        menuHTML += '</div>';

        if (menuHTML === '<div class="menu-container"></div>') {
            menuHTML = '<div class="no-content"><p>Le menu n\'est pas encore disponible.</p></div>';
        }

        pageContent.innerHTML = menuHTML;
    }

    async renderMenuSection(title, items) {
        let sectionHTML = `<div class="menu-section"><h3>${this.escapeHTML(title)}</h3><div class="menu-items">`;

        for (const item of items) {
            const imageUrl = item.image_url ? await this.getImageUrl(item.image_url) : null;
            
            sectionHTML += `
                <div class="menu-item">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${this.escapeHTML(item.name)}" class="menu-item-image" loading="lazy">` : ''}
                    <div class="menu-item-content">
                        <h4 class="menu-item-name">${this.escapeHTML(item.name)}</h4>
                        ${item.description ? `<p class="menu-item-description">${this.escapeHTML(item.description)}</p>` : ''}
                        ${item.price ? `<span class="menu-item-price">${this.escapeHTML(item.price)}€</span>` : ''}
                    </div>
                </div>
            `;
        }

        sectionHTML += '</div></div>';
        return sectionHTML;
    }

    async renderServicesPage(data) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;

        let servicesHTML = '<div class="services-container">';

        if (data.services && data.services.enabled && data.services.categories.length > 0) {
            for (const category of data.services.categories) {
                if (category.items && category.items.length > 0) {
                    servicesHTML += await this.renderServicesSection(category.name, category.items);
                }
            }
        }

        // Section équipe pour les coiffeurs
        if (data.team && data.team.enabled && data.team.members.length > 0) {
            servicesHTML += await this.renderTeamSection(data.team.members);
        }

        servicesHTML += '</div>';

        if (servicesHTML === '<div class="services-container"></div>') {
            servicesHTML = '<div class="no-content"><p>Les services ne sont pas encore disponibles.</p></div>';
        }

        pageContent.innerHTML = servicesHTML;
    }

    async renderServicesSection(title, items) {
        let sectionHTML = `<div class="services-section"><h3>${this.escapeHTML(title)}</h3><div class="service-items">`;

        for (const item of items) {
            const imageUrl = item.image_url ? await this.getImageUrl(item.image_url) : null;
            
            sectionHTML += `
                <div class="service-item">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${this.escapeHTML(item.name)}" class="service-item-image" loading="lazy">` : ''}
                    <div class="service-item-content">
                        <h4 class="service-item-name">${this.escapeHTML(item.name)}</h4>
                        ${item.description ? `<p class="service-item-description">${this.escapeHTML(item.description)}</p>` : ''}
                        <div class="service-item-details">
                            ${item.price ? `<span class="service-item-price">${this.escapeHTML(item.price)}€</span>` : ''}
                            ${item.duration ? `<span class="service-item-duration">${this.escapeHTML(item.duration)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        sectionHTML += '</div></div>';
        return sectionHTML;
    }

    async renderTeamSection(members) {
        let teamHTML = '<div class="team-section"><h3>Notre équipe</h3><div class="team-members">';

        for (const member of members) {
            const imageUrl = member.image_url ? await this.getImageUrl(member.image_url) : null;
            
            teamHTML += `
                <div class="team-member">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${this.escapeHTML(member.name)}" class="team-member-image" loading="lazy">` : ''}
                    <div class="team-member-content">
                        <h4 class="team-member-name">${this.escapeHTML(member.name)}</h4>
                        ${member.speciality ? `<p class="team-member-speciality">${this.escapeHTML(member.speciality)}</p>` : ''}
                        ${member.bio ? `<p class="team-member-bio">${this.escapeHTML(member.bio)}</p>` : ''}
                    </div>
                </div>
            `;
        }

        teamHTML