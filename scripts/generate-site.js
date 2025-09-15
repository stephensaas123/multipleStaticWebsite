// generate-site.js - Script de génération automatique de sites

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SiteGenerator {
    constructor() {
        this.businessTypes = null;
        this.templates = {};
    }

    async initialize() {
        // Charger la configuration des types de business
        const configPath = path.join(__dirname, '..', 'config', 'business-types.json');
        const configContent = await fs.readFile(configPath, 'utf8');
        this.businessTypes = JSON.parse(configContent);
        
        console.log('✅ Configuration des types de business chargée');
    }

    async generateSite(businessId, businessType, outputPath) {
        try {
            console.log(`🚀 Génération du site pour ${businessId} (type: ${businessType})`);

            // Vérifier que le type de business existe
            if (!this.businessTypes[businessType]) {
                throw new Error(`Type de business non supporté: ${businessType}`);
            }

            const businessConfig = this.businessTypes[businessType];

            // Créer le dossier de sortie
            await this.ensureDirectory(outputPath);

            // Copier les fichiers de base
            await this.copyBaseFiles(outputPath);

            // Générer les pages selon le template
            await this.generatePages(businessType, businessId, outputPath, businessConfig);

            // Générer le fichier de configuration du site
            await this.generateSiteConfig(businessId, businessType, outputPath);

            console.log(`✅ Site généré avec succès dans: ${outputPath}`);
            console.log(`📝 URL de prévisualisation: /sites/${businessId}/index.html`);

        } catch (error) {
            console.error('❌ Erreur lors de la génération:', error.message);
            throw error;
        }
    }

    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    async copyBaseFiles(outputPath) {
        console.log('📁 Copie des fichiers de base...');

        const sharedPath = path.join(__dirname, '..', 'shared');
        
        // Créer les dossiers nécessaires
        await this.ensureDirectory(path.join(outputPath, 'js'));
        await this.ensureDirectory(path.join(outputPath, 'css'));

        // Copier les fichiers JavaScript partagés
        const jsFiles = ['firebase-client.js', 'data-loader.js', 'utils.js'];
        for (const file of jsFiles) {
            const srcPath = path.join(sharedPath, 'js', file);
            const destPath = path.join(outputPath, 'js', file);
            await fs.copyFile(srcPath, destPath);
        }

        // Copier le CSS de base
        const baseCssPath = path.join(sharedPath, 'css', 'base.css');
        const destBaseCssPath = path.join(outputPath, 'css', 'base.css');
        await fs.copyFile(baseCssPath, destBaseCssPath);

        console.log('✅ Fichiers de base copiés');
    }

    async generatePages(businessType, businessId, outputPath, businessConfig) {
        console.log('📄 Génération des pages...');

        const templatePath = path.join(__dirname, '..', 'templates', businessType);

        // Copier et personnaliser chaque page
        for (const pageName of businessConfig.pages) {
            await this.generatePage(templatePath, outputPath, pageName, businessId, businessType, businessConfig);
        }

        // Copier le CSS spécifique au business
        const cssFileName = `${businessType}-style.css`;
        const srcCssPath = path.join(templatePath, 'css', cssFileName);
        const destCssPath = path.join(outputPath, 'css', 'style.css');
        
        try {
            let cssContent = await fs.readFile(srcCssPath, 'utf8');
            // Personnaliser les couleurs
            cssContent = this.customizeCSS(cssContent, businessConfig.colors);
            await fs.writeFile(destCssPath, cssContent);
        } catch (error) {
            console.warn(`⚠️  CSS non trouvé pour ${businessType}, utilisation du CSS de base`);
        }

        console.log('✅ Pages générées');
    }

    async generatePage(templatePath, outputPath, pageName, businessId, businessType, businessConfig) {
        const pageFileName = this.getPageFileName(pageName);
        const srcPath = path.join(templatePath, pageFileName);
        const destPath = path.join(outputPath, pageFileName);

        try {
            let pageContent = await fs.readFile(srcPath, 'utf8');
            
            // Remplacements de base
            pageContent = pageContent
                .replace(/\{\{BUSINESS_ID\}\}/g, businessId)
                .replace(/\{\{BUSINESS_TYPE\}\}/g, businessType)
                .replace(/\{\{PAGE_TITLE\}\}/g, this.getPageTitle(pageName, businessConfig))
                .replace(/\{\{PRIMARY_COLOR\}\}/g, businessConfig.colors.primary)
                .replace(/\{\{SECONDARY_COLOR\}\}/g, businessConfig.colors.secondary)
                .replace(/\{\{ACCENT_COLOR\}\}/g, businessConfig.colors.accent);

            // Injecter les widgets spécifiques
            pageContent = this.injectWidgets(pageContent, pageName, businessConfig.widgets);

            await fs.writeFile(destPath, pageContent);
        } catch (error) {
            console.warn(`⚠️  Template non trouvé pour la page ${pageName}, création d'une page de base`);
            await this.generateBasePage(destPath, pageName, businessId, businessType);
        }
    }

    getPageFileName(pageName) {
        const pageMap = {
            'accueil': 'index.html',
            'menu': 'menu.html',
            'services': 'services.html',
            'produits': 'produits.html',
            'contact': 'contact.html',
            'reservation': 'reservation.html',
            'rdv': 'rdv.html'
        };
        return pageMap[pageName] || `${pageName}.html`;
    }

    getPageTitle(pageName, businessConfig) {
        const titles = {
            'accueil': `Accueil - ${businessConfig.name}`,
            'menu': 'Notre Menu',
            'services': 'Nos Services',
            'produits': 'Nos Produits',
            'contact': 'Contact',
            'reservation': 'Réservation',
            'rdv': 'Prendre rendez-vous'
        };
        return titles[pageName] || pageName;
    }

    customizeCSS(cssContent, colors) {
        return cssContent
            .replace(/--primary-color:\s*[^;]+;/g, `--primary-color: ${colors.primary};`)
            .replace(/--secondary-color:\s*[^;]+;/g, `--secondary-color: ${colors.secondary};`)
            .replace(/--accent-color:\s*[^;]+;/g, `--accent-color: ${colors.accent};`);
    }

    injectWidgets(pageContent, pageName, widgets) {
        let modifiedContent = pageContent;

        // Injecter les widgets selon la page
        if (pageName === 'reservation' || pageName === 'rdv') {
            widgets.forEach(widgetType => {
                const widgetPlaceholder = `{{WIDGET_${widgetType.toUpperCase()}}}`;
                const widgetCode = this.getWidgetCode(widgetType);
                modifiedContent = modifiedContent.replace(widgetPlaceholder, widgetCode);
            });
        }

        return modifiedContent;
    }

    getWidgetCode(widgetType) {
        const widgets = {
            'gloria_food': `
                <div id="gloria-food-widget" class="widget-container">
                    <div class="widget-loading">Chargement du widget GloriaFood...</div>
                    <div id="gloria-food-content" style="display: none;"></div>
                </div>
                <script>
                    // Le widget sera chargé dynamiquement via data-loader.js
                    window.addEventListener('DOMContentLoaded', function() {
                        loadGloriaFoodWidget();
                    });
                </script>
            `,
            'fresha': `
                <div id="fresha-widget" class="widget-container">
                    <div class="widget-loading">Chargement du widget Fresha...</div>
                    <div id="fresha-content" style="display: none;"></div>
                </div>
                <script>
                    window.addEventListener('DOMContentLoaded', function() {
                        loadFreshaWidget();
                    });
                </script>
            `,
            'calendly': `
                <div id="calendly-widget" class="widget-container">
                    <div class="widget-loading">Chargement du widget Calendly...</div>
                    <div id="calendly-content" style="display: none;"></div>
                </div>
                <script>
                    window.addEventListener('DOMContentLoaded', function() {
                        loadCalendlyWidget();
                    });
                </script>
            `
        };
        return widgets[widgetType] || '';
    }

    async generateBasePage(destPath, pageName, businessId, businessType) {
        const baseTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{PAGE_TITLE}}</title>
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="site-header">
        <nav class="navbar">
            <div class="nav-brand">
                <h1 id="business-name">Chargement...</h1>
            </div>
            <ul class="nav-menu" id="nav-menu">
                <!-- Navigation générée dynamiquement -->
            </ul>
        </nav>
    </header>

    <main class="main-content">
        <section class="page-content" id="page-content">
            <h2>${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</h2>
            <div class="loading">Chargement du contenu...</div>
        </section>
    </main>

    <footer class="site-footer">
        <div class="footer-content" id="footer-content">
            <!-- Contenu du footer généré dynamiquement -->
        </div>
    </footer>

    <script src="js/firebase-client.js"></script>
    <script src="js/data-loader.js"></script>
    <script src="js/utils.js"></script>
    <script>
        const BUSINESS_ID = '${businessId}';
        const BUSINESS_TYPE = '${businessType}';
        const CURRENT_PAGE = '${pageName}';
        
        window.addEventListener('DOMContentLoaded', function() {
            initializePage();
        });
    </script>
</body>
</html>
        `;

        await fs.writeFile(destPath, baseTemplate);
    }

    async generateSiteConfig(businessId, businessType, outputPath) {
        const config = {
            business_id: businessId,
            business_type: businessType,
            generated_at: new Date().toISOString(),
            firebase_config: {
                // Configuration Firebase (à personnaliser)
                projectId: "your-project-id",
                // ... autres paramètres
            }
        };

        const configPath = path.join(outputPath, 'site-config.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        console.log('✅ Configuration du site générée');
    }
}

// Script principal
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // Parser les arguments
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];
        options[key] = value;
    }

    // Vérifier les arguments requis
    if (!options['business-id'] || !options.type) {
        console.error(`
Usage: node generate-site.js --business-id=<id> --type=<type> [--output=<path>]

Options:
  --business-id    ID unique du business (ex: restaurant-dubois)
  --type          Type de business (restaurant|coiffeur|independant|commerce)
  --output        Chemin de sortie (optionnel, défaut: ./sites/<business-id>)

Exemples:
  node generate-site.js --business-id=restaurant-lepetitbistro --type=restaurant
  node generate-site.js --business-id=salon-elegance --type=coiffeur --output=./custom/path
        `);
        process.exit(1);
    }

    const businessId = options['business-id'];
    const businessType = options.type;
    const outputPath = options.output || path.join(__dirname, '..', 'sites', businessId);

    try {
        const generator = new SiteGenerator();
        await generator.initialize();
        await generator.generateSite(businessId, businessType, outputPath);
        
        console.log('\n🎉 Site généré avec succès!');
        console.log(`📁 Emplacement: ${outputPath}`);
        console.log(`🌐 Pour tester localement, servez le dossier avec un serveur HTTP`);
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la génération:', error.message);
        process.exit(1);
    }
}

// Exporter pour utilisation en tant que module
module.exports = SiteGenerator;

// Exécuter si appelé directement
if (require.main === module) {
    main();
}