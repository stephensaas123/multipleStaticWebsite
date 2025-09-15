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

        teamHTML += '</div></div>';
        return teamHTML;
    }

    async renderProductsPage(data) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;

        let productsHTML = '<div class="products-container">';

        if (data.products && data.products.enabled && data.products.categories.length > 0) {
            for (const category of data.products.categories) {
                if (category.items && category.items.length > 0) {
                    productsHTML += await this.renderProductsSection(category.name, category.items);
                }
            }
        }

        productsHTML += '</div>';

        if (productsHTML === '<div class="products-container"></div>') {
            productsHTML = '<div class="no-content"><p>Les produits ne sont pas encore disponibles.</p></div>';
        }

        pageContent.innerHTML = productsHTML;
    }

    async renderProductsSection(title, items) {
        let sectionHTML = `<div class="products-section"><h3>${this.escapeHTML(title)}</h3><div class="product-items">`;

        for (const item of items) {
            const imageUrl = item.image_url ? await this.getImageUrl(item.image_url) : null;
            
            sectionHTML += `
                <div class="product-item">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${this.escapeHTML(item.name)}" class="product-item-image" loading="lazy">` : ''}
                    <div class="product-item-content">
                        <h4 class="product-item-name">${this.escapeHTML(item.name)}</h4>
                        ${item.description ? `<p class="product-item-description">${this.escapeHTML(item.description)}</p>` : ''}
                        ${item.price ? `<span class="product-item-price">${this.escapeHTML(item.price)}€</span>` : ''}
                    </div>
                </div>
            `;
        }

        sectionHTML += '</div></div>';
        return sectionHTML;
    }

    renderContactPage(basicInfo) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;

        let contactHTML = `
            <div class="contact-container">
                <div class="contact-info">
                    <h2>Nous contacter</h2>
                    ${basicInfo.address ? `
                        <div class="contact-item">
                            <h3>Adresse</h3>
                            <p>${this.escapeHTML(basicInfo.address).replace(/\n/g, '<br>')}</p>
                        </div>
                    ` : ''}
                    
                    ${basicInfo.phone ? `
                        <div class="contact-item">
                            <h3>Téléphone</h3>
                            <p><a href="tel:${basicInfo.phone}">${this.escapeHTML(basicInfo.phone)}</a></p>
                        </div>
                    ` : ''}
                    
                    ${basicInfo.email ? `
                        <div class="contact-item">
                            <h3>Email</h3>
                            <p><a href="mailto:${basicInfo.email}">${this.escapeHTML(basicInfo.email)}</a></p>
                        </div>
                    ` : ''}
                    
                    ${this.hasOpeningHours(basicInfo.hours) ? `
                        <div class="contact-item">
                            <h3>Horaires d'ouverture</h3>
                            ${this.renderOpeningHours(basicInfo.hours)}
                        </div>
                    ` : ''}
                </div>
                
                <div class="contact-form">
                    <h3>Envoyez-nous un message</h3>
                    <form id="contact-form">
                        <div class="form-group">
                            <input type="text" name="name" placeholder="Votre nom" required>
                        </div>
                        <div class="form-group">
                            <input type="email" name="email" placeholder="Votre email" required>
                        </div>
                        <div class="form-group">
                            <input type="text" name="subject" placeholder="Sujet">
                        </div>
                        <div class="form-group">
                            <textarea name="message" rows="5" placeholder="Votre message" required></textarea>
                        </div>
                        <button type="submit" class="btn-primary">Envoyer</button>
                    </form>
                </div>
            </div>
        `;

        pageContent.innerHTML = contactHTML;

        // Gérer l'envoi du formulaire
        document.getElementById('contact-form').addEventListener('submit', this.handleContactForm.bind(this));
    }

    hasOpeningHours(hours) {
        if (!hours) return false;
        return Object.values(hours).some(hour => hour && hour.trim() !== '');
    }

    renderOpeningHours(hours) {
        if (!hours) return '';

        const dayNames = {
            monday: 'Lundi',
            tuesday: 'Mardi',
            wednesday: 'Mercredi',
            thursday: 'Jeudi',
            friday: 'Vendredi',
            saturday: 'Samedi',
            sunday: 'Dimanche'
        };

        let hoursHTML = '<div class="opening-hours">';
        
        Object.keys(dayNames).forEach(day => {
            if (hours[day] && hours[day].trim() !== '') {
                hoursHTML += `
                    <div class="hour-item">
                        <span class="day">${dayNames[day]}:</span>
                        <span class="hours">${this.escapeHTML(hours[day])}</span>
                    </div>
                `;
            }
        });

        hoursHTML += '</div>';
        return hoursHTML;
    }

    async renderBookingPage(data) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;

        let bookingHTML = '<div class="booking-container">';

        // Titre selon le type de business
        const title = this.businessType === 'restaurant' ? 'Réservation de table' : 'Prendre rendez-vous';
        bookingHTML += `<h2>${title}</h2>`;

        // Widget selon le type de business
        if (data.widgets) {
            const widgetHTML = this.renderBookingWidget(data.widgets);
            if (widgetHTML) {
                bookingHTML += widgetHTML;
            } else {
                bookingHTML += '<p>La réservation en ligne sera bientôt disponible.</p>';
            }
        }

        bookingHTML += '</div>';
        pageContent.innerHTML = bookingHTML;
    }

    renderBookingWidget(widgets) {
        if (this.businessType === 'restaurant' && widgets.gloria_food && widgets.gloria_food.enabled) {
            return `
                <div id="gloria-food-widget" class="widget-container">
                    <div class="widget-loading">Chargement du système de réservation...</div>
                    <div id="gloria-food-content" style="display: none;"></div>
                </div>
            `;
        } else if ((this.businessType === 'coiffeur' || this.businessType === 'independant') && widgets.fresha && widgets.fresha.enabled) {
            return `
                <div id="fresha-widget" class="widget-container">
                    <div class="widget-loading">Chargement du système de rendez-vous...</div>
                    <div id="fresha-content" style="display: none;"></div>
                </div>
            `;
        } else if (this.businessType === 'independant' && widgets.calendly && widgets.calendly.enabled) {
            return `
                <div id="calendly-widget" class="widget-container">
                    <div class="widget-loading">Chargement du système de rendez-vous...</div>
                    <div id="calendly-content" style="display: none;"></div>
                </div>
            `;
        }
        return null;
    }

    renderMenuPreview(data) {
        const container = document.getElementById('menu-preview-container');
        if (!container) return;

        let previewHTML = '';
        let hasContent = false;

        // Menu du jour
        if (data.menu_du_jour && data.menu_du_jour.enabled && data.menu_du_jour.items && data.menu_du_jour.items.length > 0) {
            previewHTML += this.createPreviewSection('Menu du jour', data.menu_du_jour.items.slice(0, 3), 'menu.html');
            hasContent = true;
        }

        // Carte principale (première catégorie)
        if (data.carte_principale && data.carte_principale.enabled && data.carte_principale.categories && data.carte_principale.categories.length > 0) {
            const firstCategory = data.carte_principale.categories.find(cat => cat.items && cat.items.length > 0);
            if (firstCategory) {
                previewHTML += this.createPreviewSection(firstCategory.name, firstCategory.items.slice(0, 3), 'menu.html');
                hasContent = true;
            }
        }

        if (hasContent) {
            container.innerHTML = previewHTML;
        } else {
            container.remove();
        }
    }

    renderServicesPreview(servicesData) {
        const container = document.getElementById('services-preview-container') || this.createServicesPreviewContainer();
        if (!container || !servicesData || !servicesData.enabled) return;

        let previewHTML = '';
        let hasContent = false;

        if (servicesData.categories && servicesData.categories.length > 0) {
            const firstCategory = servicesData.categories.find(cat => cat.items && cat.items.length > 0);
            if (firstCategory) {
                previewHTML += this.createPreviewSection('Nos services', firstCategory.items.slice(0, 3), 'services.html');
                hasContent = true;
            }
        }

        if (hasContent) {
            container.innerHTML = previewHTML;
        } else {
            container.remove();
        }
    }

    createServicesPreviewContainer() {
        const container = document.createElement('div');
        container.id = 'services-preview-container';
        
        const mainContent = document.querySelector('.main-content');
        const gallerySection = document.getElementById('gallery-section');
        
        if (gallerySection) {
            mainContent.insertBefore(container, gallerySection);
        } else {
            mainContent.appendChild(container);
        }
        
        return container;
    }

    createPreviewSection(title, items, linkUrl) {
        let sectionHTML = `
            <section class="preview-section">
                <div class="preview-header">
                    <h2>${this.escapeHTML(title)}</h2>
                    <a href="${linkUrl}" class="btn-secondary">Voir tout</a>
                </div>
        `;

        if (this.businessType === 'restaurant') {
            sectionHTML += '<div class="menu-preview-items">';
        } else {
            sectionHTML += '<div class="services-preview-items">';
        }

        items.forEach(item => {
            sectionHTML += `
                <div class="preview-item">
                    <h4>${this.escapeHTML(item.name)}</h4>
                    ${item.description ? `<p>${this.escapeHTML(item.description)}</p>` : ''}
                    ${item.price ? `<span class="price">${this.escapeHTML(item.price)}€</span>` : ''}
                    ${item.duration ? `<span class="duration">${this.escapeHTML(item.duration)}</span>` : ''}
                </div>
            `;
        });

        sectionHTML += '</div></section>';
        return sectionHTML;
    }

    renderFooter(basicInfo) {
        const footerContent = document.getElementById('footer-content');
        if (!footerContent) return;

        let footerHTML = `
            <div class="footer-info">
                <h3>${this.escapeHTML(basicInfo.name || 'Mon Business')}</h3>
                ${basicInfo.description ? `<p>${this.escapeHTML(basicInfo.description)}</p>` : ''}
            </div>
            <div class="footer-contact">
                ${basicInfo.address ? `<p>📍 ${this.escapeHTML(basicInfo.address).replace(/\n/g, '<br>')}</p>` : ''}
                ${basicInfo.phone ? `<p>📞 <a href="tel:${basicInfo.phone}">${this.escapeHTML(basicInfo.phone)}</a></p>` : ''}
                ${basicInfo.email ? `<p>✉️ <a href="mailto:${basicInfo.email}">${this.escapeHTML(basicInfo.email)}</a></p>` : ''}
            </div>
        `;

        footerContent.innerHTML = footerHTML;
    }

    async loadWidgets(widgets) {
        if (!widgets) return;

        // GloriaFood Widget
        if (widgets.gloria_food && widgets.gloria_food.enabled) {
            await this.loadGloriaFoodWidget(widgets.gloria_food);
        }

        // Fresha Widget
        if (widgets.fresha && widgets.fresha.enabled) {
            await this.loadFreshaWidget(widgets.fresha);
        }

        // Calendly Widget
        if (widgets.calendly && widgets.calendly.enabled) {
            await this.loadCalendlyWidget(widgets.calendly);
        }
    }

    async loadGloriaFoodWidget(gloriaFoodData) {
        const container = document.getElementById('gloria-food-widget');
        if (!container) return;

        try {
            if (gloriaFoodData.widget_code) {
                // Injecter le code widget fourni par GloriaFood
                const contentDiv = document.getElementById('gloria-food-content');
                contentDiv.innerHTML = gloriaFoodData.widget_code;
                contentDiv.style.display = 'block';
                container.querySelector('.widget-loading').style.display = 'none';
            } else {
                container.innerHTML = '<p>Configuration du widget GloriaFood en cours...</p>';
            }
        } catch (error) {
            console.error('Erreur lors du chargement du widget GloriaFood:', error);
            container.innerHTML = '<p>Erreur lors du chargement du système de commande.</p>';
        }
    }

    async loadFreshaWidget(freshaData) {
        const container = document.getElementById('fresha-widget');
        if (!container) return;

        try {
            if (freshaData.widget_code) {
                const contentDiv = document.getElementById('fresha-content');
                contentDiv.innerHTML = freshaData.widget_code;
                contentDiv.style.display = 'block';
                container.querySelector('.widget-loading').style.display = 'none';
            } else {
                container.innerHTML = '<p>Configuration du widget Fresha en cours...</p>';
            }
        } catch (error) {
            console.error('Erreur lors du chargement du widget Fresha:', error);
            container.innerHTML = '<p>Erreur lors du chargement du système de rendez-vous.</p>';
        }
    }

    async loadCalendlyWidget(calendlyData) {
        const container = document.getElementById('calendly-widget');
        if (!container) return;

        try {
            if (calendlyData.url) {
                // Charger le script Calendly
                if (!document.querySelector('script[src*="calendly"]')) {
                    const script = document.createElement('script');
                    script.src = 'https://assets.calendly.com/assets/external/widget.js';
                    document.head.appendChild(script);
                }

                const contentDiv = document.getElementById('calendly-content');
                contentDiv.innerHTML = `
                    <div class="calendly-inline-widget" 
                         data-url="${calendlyData.url}" 
                         style="min-width:320px;height:630px;">
                    </div>
                `;
                contentDiv.style.display = 'block';
                container.querySelector('.widget-loading').style.display = 'none';
            } else {
                container.innerHTML = '<p>Configuration du widget Calendly en cours...</p>';
            }
        } catch (error) {
            console.error('Erreur lors du chargement du widget Calendly:', error);
            container.innerHTML = '<p>Erreur lors du chargement du système de rendez-vous.</p>';
        }
    }

    async getImageUrl(gsUrl) {
        if (!gsUrl) return null;
        
        try {
            if (gsUrl.startsWith('gs://')) {
                // Convertir l'URL gs:// en URL de téléchargement
                const ref = storage.refFromURL(gsUrl);
                return await ref.getDownloadURL();
            }
            return gsUrl;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'URL de l\'image:', error);
            return null;
        }
    }

    handleContactForm(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const contactData = Object.fromEntries(formData.entries());
        
        // Ici, vous pourriez envoyer les données à un service d'email
        // Pour l'instant, on affiche juste une confirmation
        this.showMessage('Votre message a été envoyé ! Nous vous répondrons dans les plus brefs délais.', 'success');
        event.target.reset();
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 5px;
            z-index: 10000;
            ${type === 'success' ? 'background: #d4edda; border: 1px solid #c3e6cb; color: #155724;' : 'background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;'}
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    hideLoadingStates() {
        document.querySelectorAll('.loading').forEach(loading => {
            loading.style.display = 'none';
        });
    }

    showErrorState() {
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(loading => {
            loading.textContent = 'Erreur lors du chargement des données.';
            loading.style.color = '#dc3545';
        });
    }

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Fonction globale d'initialisation
async function initializePage() {
    if (typeof BUSINESS_ID === 'undefined' || typeof BUSINESS_TYPE === 'undefined') {
        console.error('Variables BUSINESS_ID et BUSINESS_TYPE non définies');
        return;
    }

    const dataLoader = new DataLoader(BUSINESS_ID, BUSINESS_TYPE);
    await dataLoader.initialize();
}

// Export pour utilisation en tant que module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}