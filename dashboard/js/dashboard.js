// dashboard.js - Gestion CRUD du dashboard

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.businessData = null;
        this.businessType = null;
        this.unsavedChanges = false;
        
        this.initializeEventListeners();
        this.loadBusinessTypes();
    }

    initializeEventListeners() {
        // Navigation entre sections
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // Formulaires
        document.getElementById('basic-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBasicInfo();
        });

        document.getElementById('hero-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHeroSection();
        });

        // Upload d'images
        document.getElementById('hero-image').addEventListener('change', (e) => {
            this.handleImageUpload(e, 'hero');
        });

        document.getElementById('gallery-images').addEventListener('change', (e) => {
            this.handleGalleryUpload(e);
        });

        // Boutons d'action
        document.getElementById('preview-site').addEventListener('click', () => {
            this.previewSite();
        });

        // Détection des changements
        document.addEventListener('input', () => {
            this.unsavedChanges = true;
        });

        // Alerte avant fermeture si changements non sauvés
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    async loadBusinessTypes() {
        try {
            const response = await fetch('/config/business-types.json');
            this.businessTypes = await response.json();
        } catch (error) {
            console.error('Erreur lors du chargement des types de business:', error);
        }
    }

    switchSection(sectionName) {
        // Masquer toutes les sections
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });

        // Désactiver tous les boutons de navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Activer la section et le bouton correspondants
        document.getElementById(`section-${sectionName}`).classList.add('active');
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Charger le contenu dynamique si nécessaire
        if (sectionName === 'content') {
            this.loadDynamicContent();
        } else if (sectionName === 'widgets') {
            this.loadWidgetsSection();
        }
    }

    async loadUserData(user) {
        this.currentUser = user;
        
        try {
            // Récupérer les données business de l'utilisateur
            const businessQuery = await db.collection('businesses')
                .where('owner_uid', '==', user.uid)
                .get();

            if (!businessQuery.empty) {
                const businessDoc = businessQuery.docs[0];
                this.businessData = businessDoc.data();
                this.businessType = this.businessData.business_type;
                this.businessDocId = businessDoc.id;
                
                // Mettre à jour l'interface
                this.populateForm();
                document.getElementById('business-name').textContent = this.businessData.data.basic_info.name || 'Mon Business';
            } else {
                this.showMessage('Aucun business trouvé pour cet utilisateur', 'error');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.showMessage('Erreur lors du chargement des données', 'error');
        }
    }

    populateForm() {
        if (!this.businessData) return;

        const data = this.businessData.data;
        
        // Informations de base
        document.getElementById('name').value = data.basic_info.name || '';
        document.getElementById('description').value = data.basic_info.description || '';
        document.getElementById('address').value = data.basic_info.address || '';
        document.getElementById('phone').value = data.basic_info.phone || '';
        document.getElementById('email-business').value = data.basic_info.email || '';

        // Horaires
        if (data.basic_info.hours) {
            Object.keys(data.basic_info.hours).forEach(day => {
                const input = document.querySelector(`input[name="hours.${day}"]`);
                if (input) {
                    input.value = data.basic_info.hours[day] || '';
                }
            });
        }

        // Section Hero
        if (data.hero) {
            document.getElementById('hero-title').value = data.hero.title || '';
            document.getElementById('hero-subtitle').value = data.hero.subtitle || '';
            document.getElementById('hero-cta').value = data.hero.cta_text || '';
            
            // Afficher l'image hero si elle existe
            if (data.hero.image_url) {
                this.displayImage('hero-preview', data.hero.image_url);
            }
        }

        // Galerie
        if (data.gallery && data.gallery.length > 0) {
            this.displayGallery(data.gallery);
        }
    }

    loadDynamicContent() {
        const container = document.getElementById('dynamic-content');
        container.innerHTML = '';

        if (!this.businessType || !this.businessTypes) return;

        const businessConfig = this.businessTypes[this.businessType];
        if (!businessConfig) return;

        // Générer les sections selon le type de business
        Object.keys(businessConfig.sections).forEach(sectionKey => {
            const section = businessConfig.sections[sectionKey];
            container.appendChild(this.createContentSection(sectionKey, section));
        });
    }

    createContentSection(sectionKey, sectionConfig) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'content-block';
        
        const title = this.getSectionTitle(sectionKey);
        
        if (sectionKey === 'menu_du_jour' || sectionKey === 'carte_principale' || sectionKey === 'menu_boissons') {
            sectionDiv.innerHTML = this.createMenuSection(sectionKey, title);
        } else if (sectionKey === 'services') {
            sectionDiv.innerHTML = this.createServicesSection(sectionKey, title);
        } else if (sectionKey === 'products') {
            sectionDiv.innerHTML = this.createProductsSection(sectionKey, title);
        } else {
            sectionDiv.innerHTML = this.createGenericSection(sectionKey, title);
        }

        return sectionDiv;
    }

    getSectionTitle(sectionKey) {
        const titles = {
            'menu_du_jour': 'Menu du jour',
            'carte_principale': 'Carte principale',
            'menu_boissons': 'Menu des boissons',
            'services': 'Services',
            'products': 'Produits',
            'team': 'Équipe',
            'testimonials': 'Témoignages',
            'about': 'À propos'
        };
        return titles[sectionKey] || sectionKey;
    }

    createMenuSection(sectionKey, title) {
        return `
            <h3>${title}</h3>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="${sectionKey}-enabled" ${this.isSectionEnabled(sectionKey) ? 'checked' : ''}>
                    Activer cette section
                </label>
            </div>
            <div id="${sectionKey}-content" style="display: ${this.isSectionEnabled(sectionKey) ? 'block' : 'none'}">
                <div class="menu-items" id="${sectionKey}-items">
                    ${this.renderMenuItems(sectionKey)}
                </div>
                <button type="button" class="btn-secondary" onclick="dashboard.addMenuItem('${sectionKey}')">
                    Ajouter un plat
                </button>
            </div>
            <button type="button" class="btn-primary" onclick="dashboard.saveSection('${sectionKey}')">
                Enregistrer
            </button>
        `;
    }

    createServicesSection(sectionKey, title) {
        return `
            <h3>${title}</h3>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="${sectionKey}-enabled" ${this.isSectionEnabled(sectionKey) ? 'checked' : ''}>
                    Activer cette section
                </label>
            </div>
            <div id="${sectionKey}-content" style="display: ${this.isSectionEnabled(sectionKey) ? 'block' : 'none'}">
                <div class="service-categories" id="${sectionKey}-categories">
                    ${this.renderServiceCategories(sectionKey)}
                </div>
                <button type="button" class="btn-secondary" onclick="dashboard.addServiceCategory('${sectionKey}')">
                    Ajouter une catégorie
                </button>
            </div>
            <button type="button" class="btn-primary" onclick="dashboard.saveSection('${sectionKey}')">
                Enregistrer
            </button>
        `;
    }

    isSectionEnabled(sectionKey) {
        if (!this.businessData || !this.businessData.data[sectionKey]) return false;
        return this.businessData.data[sectionKey].enabled === true;
    }

    renderMenuItems(sectionKey) {
        if (!this.businessData || !this.businessData.data[sectionKey]) return '';
        
        const section = this.businessData.data[sectionKey];
        let html = '';

        if (section.items) {
            section.items.forEach((item, index) => {
                html += this.createMenuItemHTML(sectionKey, item, index);
            });
        } else if (section.categories) {
            section.categories.forEach((category, catIndex) => {
                html += `<div class="category-block">
                    <h4>Catégorie: <input type="text" value="${category.name}" data-category="${catIndex}" data-field="name"></h4>`;
                category.items.forEach((item, itemIndex) => {
                    html += this.createMenuItemHTML(sectionKey, item, itemIndex, catIndex);
                });
                html += `<button type="button" class="btn-secondary" onclick="dashboard.addItemToCategory('${sectionKey}', ${catIndex})">Ajouter un plat à cette catégorie</button>
                </div>`;
            });
        }

        return html;
    }

    createMenuItemHTML(sectionKey, item, index, categoryIndex = null) {
        const prefix = categoryIndex !== null ? `${sectionKey}-${categoryIndex}-${index}` : `${sectionKey}-${index}`;
        
        return `
            <div class="menu-item" data-index="${index}" ${categoryIndex !== null ? `data-category="${categoryIndex}"` : ''}>
                <div class="form-group">
                    <label>Nom du plat</label>
                    <input type="text" id="${prefix}-name" value="${item.name || ''}" data-field="name">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="${prefix}-description" rows="2" data-field="description">${item.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Prix (€)</label>
                    <input type="text" id="${prefix}-price" value="${item.price || ''}" data-field="price">
                </div>
                <div class="form-group">
                    <label>Image</label>
                    <input type="file" id="${prefix}-image" accept="image/*" data-field="image">
                    ${item.image_url ? `<div class="image-preview"><img src="${item.image_url}" alt="Image du plat"></div>` : ''}
                </div>
                <button type="button" class="btn-danger" onclick="dashboard.removeMenuItem('${sectionKey}', ${index}, ${categoryIndex})">
                    Supprimer
                </button>
            </div>
        `;
    }

    async saveBasicInfo() {
        if (!this.businessDocId) return;

        const formData = new FormData(document.getElementById('basic-form'));
        const basicInfo = {};
        const hours = {};

        for (let [key, value] of formData.entries()) {
            if (key.startsWith('hours.')) {
                const day = key.split('.')[1];
                hours[day] = value;
            } else {
                basicInfo[key] = value;
            }
        }

        basicInfo.hours = hours;

        try {
            await db.collection('businesses').doc(this.businessDocId).update({
                'data.basic_info': basicInfo,
                updated_at: new Date()
            });

            this.unsavedChanges = false;
            this.showMessage('Informations sauvegardées avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            this.showMessage('Erreur lors de la sauvegarde', 'error');
        }
    }

    async saveHeroSection() {
        if (!this.businessDocId) return;

        const heroData = {
            title: document.getElementById('hero-title').value,
            subtitle: document.getElementById('hero-subtitle').value,
            cta_text: document.getElementById('hero-cta').value
        };

        // Conserver l'URL de l'image existante si elle existe
        if (this.businessData && this.businessData.data.hero && this.businessData.data.hero.image_url) {
            heroData.image_url = this.businessData.data.hero.image_url;
        }

        try {
            await db.collection('businesses').doc(this.businessDocId).update({
                'data.hero': heroData,
                updated_at: new Date()
            });

            this.unsavedChanges = false;
            this.showMessage('Section d\'accueil sauvegardée avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            this.showMessage('Erreur lors de la sauvegarde', 'error');
        }
    }

    async handleImageUpload(event, target) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const imageUrl = await this.uploadImage(file, target);
            
            if (target === 'hero') {
                await db.collection('businesses').doc(this.businessDocId).update({
                    'data.hero.image_url': imageUrl,
                    updated_at: new Date()
                });
                
                this.displayImage('hero-preview', imageUrl);
            }

            this.showMessage('Image uploadée avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            this.showMessage('Erreur lors de l\'upload de l\'image', 'error');
        }
    }

    async uploadImage(file, folder) {
        const storageRef = storage.ref();
        const imageRef = storageRef.child(`businesses/${this.businessData.business_id}/${folder}/${Date.now()}_${file.name}`);
        
        await imageRef.put(file);
        return await imageRef.getDownloadURL();
    }

    displayImage(previewId, imageUrl) {
        const preview = document.getElementById(previewId);
        preview.innerHTML = `<img src="${imageUrl}" alt="Image">`;
    }

    loadWidgetsSection() {
        const container = document.getElementById('widgets-container');
        container.innerHTML = '';

        if (!this.businessType || !this.businessTypes) return;

        const businessConfig = this.businessTypes[this.businessType];
        if (!businessConfig.widgets || businessConfig.widgets.length === 0) {
            container.innerHTML = '<p>Aucun widget disponible pour ce type de business.</p>';
            return;
        }

        businessConfig.widgets.forEach(widgetType => {
            container.appendChild(this.createWidgetSection(widgetType));
        });
    }

    createWidgetSection(widgetType) {
        const div = document.createElement('div');
        div.className = 'widget-section';
        
        const widgetData = this.businessData?.data?.widgets?.[widgetType] || {};
        
        div.innerHTML = `
            <h3>${this.getWidgetTitle(widgetType)}</h3>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="${widgetType}-enabled" ${widgetData.enabled ? 'checked' : ''}>
                    Activer ce widget
                </label>
            </div>
            <div id="${widgetType}-config" style="display: ${widgetData.enabled ? 'block' : 'none'}">
                ${this.getWidgetConfig(widgetType, widgetData)}
            </div>
            <button type="button" class="btn-primary" onclick="dashboard.saveWidget('${widgetType}')">
                Enregistrer
            </button>
        `;

        // Ajouter les event listeners
        div.querySelector(`#${widgetType}-enabled`).addEventListener('change', (e) => {
            const config = div.querySelector(`#${widgetType}-config`);
            config.style.display = e.target.checked ? 'block' : 'none';
        });

        return div;
    }

    getWidgetTitle(widgetType) {
        const titles = {
            'gloria_food': 'GloriaFood - Commandes & Réservations',
            'fresha': 'Fresha - Prise de rendez-vous',
            'calendly': 'Calendly - Prise de rendez-vous'
        };
        return titles[widgetType] || widgetType;
    }

    getWidgetConfig(widgetType, widgetData) {
        switch (widgetType) {
            case 'gloria_food':
                return `
                    <div class="form-group">
                        <label>ID Restaurant GloriaFood</label>
                        <input type="text" id="gloria-restaurant-id" value="${widgetData.restaurant_id || ''}" placeholder="Votre ID restaurant">
                    </div>
                    <div class="form-group">
                        <label>Code du widget</label>
                        <textarea id="gloria-widget-code" rows="5" placeholder="Collez ici le code fourni par GloriaFood">${widgetData.widget_code || ''}</textarea>
                    </div>
                `;
            case 'fresha':
                return `
                    <div class="form-group">
                        <label>ID Salon Fresha</label>
                        <input type="text" id="fresha-salon-id" value="${widgetData.salon_id || ''}" placeholder="Votre ID salon">
                    </div>
                    <div class="form-group">
                        <label>Code du widget</label>
                        <textarea id="fresha-widget-code" rows="5" placeholder="Collez ici le code fourni par Fresha">${widgetData.widget_code || ''}</textarea>
                    </div>
                `;
            case 'calendly':
                return `
                    <div class="form-group">
                        <label>URL Calendly</label>
                        <input type="url" id="calendly-url" value="${widgetData.url || ''}" placeholder="https://calendly.com/votre-nom">
                    </div>
                `;
            default:
                return '<p>Configuration non disponible pour ce widget.</p>';
        }
    }

    async saveWidget(widgetType) {
        if (!this.businessDocId) return;

        let widgetData = {
            enabled: document.getElementById(`${widgetType}-enabled`).checked
        };

        if (widgetData.enabled) {
            switch (widgetType) {
                case 'gloria_food':
                    widgetData.restaurant_id = document.getElementById('gloria-restaurant-id').value;
                    widgetData.widget_code = document.getElementById('gloria-widget-code').value;
                    break;
                case 'fresha':
                    widgetData.salon_id = document.getElementById('fresha-salon-id').value;
                    widgetData.widget_code = document.getElementById('fresha-widget-code').value;
                    break;
                case 'calendly':
                    widgetData.url = document.getElementById('calendly-url').value;
                    break;
            }
        }

        try {
            await db.collection('businesses').doc(this.businessDocId).update({
                [`data.widgets.${widgetType}`]: widgetData,
                updated_at: new Date()
            });

            this.unsavedChanges = false;
            this.showMessage('Widget sauvegardé avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            this.showMessage('Erreur lors de la sauvegarde', 'error');
        }
    }

    previewSite() {
        if (!this.businessData) return;
        
        const siteUrl = `/sites/${this.businessData.business_id}/index.html`;
        window.open(siteUrl, '_blank');
    }

    showMessage(message, type) {
        // Supprimer les messages existants
        document.querySelectorAll('.success-message, .error-message').forEach(msg => {
            msg.remove();
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
        messageDiv.textContent = message;

        const main = document.querySelector('.dashboard-main');
        main.insertBefore(messageDiv, main.firstChild);

        // Supprimer le message après 5 secondes
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Instance globale
const dashboard = new DashboardManager();