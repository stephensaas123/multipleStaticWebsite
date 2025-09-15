#!/usr/bin/env node

/**
 * Script de génération automatique de sites multi-business
 * Usage: node generate-site.js --business-id=UUID --type=restaurant --output=./output
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration des types de business
const BUSINESS_TYPES = {
  restaurant: {
    name: 'Restaurant',
    template: 'restaurant',
    widgets: ['gloriafood'],
    pages: ['index.html', 'menu.html', 'contact.html', 'reservation.html'],
    theme: {
      primary_color: '#d4842c',
      secondary_color: '#2c1810',
      accent_color: '#ff6b35'
    },
    customizations: {
      header_icon: '🍽️',
      sections: ['menu', 'commander', 'info', 'contact']
    }
  },
  coiffeur: {
    name: 'Salon de coiffure',
    template: 'coiffeur',
    widgets: ['fresha'],
    pages: ['index.html', 'services.html', 'contact.html', 'rendez-vous.html'],
    theme: {
      primary_color: '#e91e63',
      secondary_color: '#1a1a1a',
      accent_color: '#ffc107'
    },
    customizations: {
      header_icon: '✂️',
      sections: ['services', 'rendez-vous', 'info', 'contact']
    }
  },
  coach: {
    name: 'Coach/Formateur',
    template: 'coach',
    widgets: ['calendly'],
    pages: ['index.html', 'services.html', 'contact.html', 'reservation.html'],
    theme: {
      primary_color: '#4caf50',
      secondary_color: '#2e7d32',
      accent_color: '#ff9800'
    },
    customizations: {
      header_icon: '🎯',
      sections: ['services', 'reservation', 'apropos', 'contact']
    }
  },
  commerce: {
    name: 'Commerce',
    template: 'commerce',
    widgets: [],
    pages: ['index.html', 'produits.html', 'contact.html'],
    theme: {
      primary_color: '#2196f3',
      secondary_color: '#1976d2',
      accent_color: '#ff5722'
    },
    customizations: {
      header_icon: '🏪',
      sections: ['produits', 'info', 'contact']
    }
  }
};

class SiteGenerator {
  constructor(options) {
    this.businessId = options.businessId;
    this.businessType = options.type;
    this.outputPath = options.output || './generated-sites';
    this.templatePath = './templates';
    this.sharedPath = './shared';
    
    // Validation
    if (!this.businessId) {
      throw new Error('Business ID is required');
    }
    
    if (!BUSINESS_TYPES[this.businessType]) {
      throw new Error(`Unsupported business type: ${this.businessType}`);
    }
    
    this.config = BUSINESS_TYPES[this.businessType];
    this.sitePath = path.join(this.outputPath, `site-${this.businessId}`);
  }

  async generate() {
    console.log(`🚀 Génération du site pour le business ${this.businessId} (${this.config.name})`);
    
    try {
      await this.createDirectoryStructure();
      await this.copyTemplateFiles();
      await this.copySharedFiles();
      await this.customizeFiles();
      await this.generateConfig();
      
      console.log(`✅ Site généré avec succès dans ${this.sitePath}`);
      console.log(`📁 Structure créée :`);
      await this.showStructure();
      
    } catch (error) {
      console.error(`❌ Erreur lors de la génération : ${error.message}`);
      throw error;
    }
  }

  async createDirectoryStructure() {
    console.log('📁 Création de la structure des dossiers...');
    
    const directories = [
      this.sitePath,
      path.join(this.sitePath, 'css'),
      path.join(this.sitePath, 'js'),
      path.join(this.sitePath, 'assets'),
      path.join(this.sitePath, 'assets', 'images'),
      path.join(this.sitePath, 'config')
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async copyTemplateFiles() {
    console.log('📋 Copie des fichiers template...');
    
    const templateDir = path.join(this.templatePath, this.config.template);
    
    try {
      const files = await fs.readdir(templateDir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.html')) {
          const sourcePath = path.join(templateDir, file.name);
          const destPath = path.join(this.sitePath, file.name);
          await fs.copyFile(sourcePath, destPath);
        }
        
        if (file.isDirectory() && file.name === 'assets') {
          await this.copyDirectory(
            path.join(templateDir, 'assets'),
            path.join(this.sitePath, 'assets')
          );
        }
      }
    } catch (error) {
      console.error(`Template directory not found: ${templateDir}`);
      // Create a basic index.html if template doesn't exist
      await this.createBasicTemplate();
    }
  }

  async copySharedFiles() {
    console.log('🔗 Copie des fichiers partagés...');
    
    const sharedJsPath = path.join(this.sharedPath, 'js');
    const sharedCssPath = path.join(this.sharedPath, 'css');
    
    try {
      if (await this.pathExists(sharedJsPath)) {
        await this.copyDirectory(sharedJsPath, path.join(this.sitePath, 'js'));
      }
      
      if (await this.pathExists(sharedCssPath)) {
        await this.copyDirectory(sharedCssPath, path.join(this.sitePath, 'css'));
      }
    } catch (error) {
      console.warn('Shared files not found, creating basic ones...');
      await this.createSharedFiles();
    }
  }

  async customizeFiles() {
    console.log('🎨 Personnalisation des fichiers...');
    
    const htmlFiles = await this.getHtmlFiles();
    
    for (const file of htmlFiles) {
      const filePath = path.join(this.sitePath, file);
      let content = await fs.readFile(filePath, 'utf8');
      
      // Replace placeholders
      content = content.replace(/BUSINESS_ID_TO_REPLACE/g, this.businessId);
      content = content.replace(/YOUR_SUPABASE_URL/g, process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL');
      content = content.replace(/YOUR_SUPABASE_ANON_KEY/g, process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY');
      
      // Apply theme customizations
      content = await this.applyThemeCustomizations(content);
      
      // Apply business type specific customizations
      content = await this.applyBusinessCustomizations(content);
      
      await fs.writeFile(filePath, content, 'utf8');
    }
  }

  async applyThemeCustomizations(content) {
    const theme = this.config.theme;
    
    // Replace CSS variables
    content = content.replace(/--primary-color: #[a-fA-F0-9]{6};/g, `--primary-color: ${theme.primary_color};`);
    content = content.replace(/--secondary-color: #[a-fA-F0-9]{6};/g, `--secondary-color: ${theme.secondary_color};`);
    content = content.replace(/--accent-color: #[a-fA-F0-9]{6};/g, `--accent-color: ${theme.accent_color};`);
    
    return content;
  }

  async applyBusinessCustomizations(content) {
    const customizations = this.config.customizations;
    
    // Replace header icon
    if (customizations.header_icon) {
      content = content.replace(/🍽️/g, customizations.header_icon);
    }
    
    // Customize navigation based on business type
    if (customizations.sections) {
      const navHTML = this.generateNavigation(customizations.sections);
      content = content.replace(
        /<nav class="nav">[\s\S]*?<\/nav>/,
        navHTML
      );
    }
    
    // Add business-specific widgets
    content = await this.addWidgetSupport(content);
    
    return content;
  }

  generateNavigation(sections) {
    const sectionNames = {
      'menu': 'Notre Menu',
      'services': 'Nos Services',
      'produits': 'Nos Produits',
      'commander': 'Commander',
      'rendez-vous': 'Rendez-vous',
      'reservation': 'Réserver',
      'info': 'Informations',
      'apropos': 'À Propos',
      'contact': 'Contact'
    };

    const navItems = sections.map(section => 
      `<li><a href="#${section}">${sectionNames[section] || section}</a></li>`
    ).join('\n            ');

    return `<nav class="nav">
        <ul>
            <li><a href="#accueil" class="active">Accueil</a></li>
            ${navItems}
        </ul>
    </nav>`;
  }

  async addWidgetSupport(content) {
    const widgets = this.config.widgets;
    
    if (widgets.includes('gloriafood')) {
      content = content.replace(
        '<!-- GloriaFood Widget Container -->',
        `<!-- GloriaFood Widget Container -->
        <script src="https://www.gloriafood.com/ordering-widget/js/onlineordering.min.js"></script>`
      );
    }
    
    if (widgets.includes('fresha')) {
      content = content.replace(
        '</body>',
        `    <script src="https://widget.fresha.com/widget.js"></script>
</body>`
      );
    }
    
    if (widgets.includes('calendly')) {
      content = content.replace(
        '</body>',
        `    <script src="https://assets.calendly.com/assets/external/widget.js"></script>
</body>`
      );
    }
    
    return content;
  }

  async generateConfig() {
    console.log('⚙️ Génération des fichiers de configuration...');
    
    const config = {
      businessId: this.businessId,
      businessType: this.businessType,
      theme: this.config.theme,
      widgets: this.config.widgets,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const configPath = path.join(this.sitePath, 'config', 'site-config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    // Generate deployment script
    const deployScript = this.generateDeployScript();
    const deployScriptPath = path.join(this.sitePath, 'deploy.sh');
    await fs.writeFile(deployScriptPath, deployScript, 'utf8');
    
    // Make deploy script executable
    try {
      execSync(`chmod +x ${deployScriptPath}`);
    } catch (error) {
      console.warn('Could not make deploy script executable');
    }
  }

  generateDeployScript() {
    return `#!/bin/bash
# Script de déploiement automatique
# Généré pour le business ${this.businessId}

echo "🚀 Déploiement du site..."

# Configuration
BUSINESS_ID="${this.businessId}"
BUSINESS_TYPE="${this.businessType}"
SITE_PATH="$(pwd)"

echo "📋 Business ID: $BUSINESS_ID"
echo "📋 Business Type: $BUSINESS_TYPE"
echo "📋 Site Path: $SITE_PATH"

# Vérification des fichiers requis
if [ ! -f "index.html" ]; then
    echo "❌ Erreur: index.html non trouvé"
    exit 1
fi

# Build (si nécessaire)
echo "🔨 Build du site..."

# Minification CSS (optionnel)
if command -v cssnano &> /dev/null; then
    echo "🎨 Minification CSS..."
    find css -name "*.css" -exec cssnano {} {}.min \\;
fi

# Optimisation des images (optionnel)
if command -v imagemin &> /dev/null; then
    echo "🖼️ Optimisation des images..."
    imagemin assets/images/* --out-dir=assets/images/optimized
fi

echo "✅ Site prêt pour le déploiement"
echo "📁 Fichiers à déployer dans: $SITE_PATH"

# Instructions de déploiement
echo ""
echo "📤 Instructions de déploiement:"
echo "1. FTP: Uploadez tous les fichiers vers votre serveur web"
echo "2. GitHub Pages: Commitez et poussez vers la branche gh-pages"
echo "3. Netlify: Glissez-déposez le dossier sur netlify.com"
echo "4. Vercel: Exécutez 'vercel deploy' dans ce dossier"
`;
  }

  async createBasicTemplate() {
    const basicHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.name}</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <h1>${this.config.customizations.header_icon} Mon ${this.config.name}</h1>
    </header>
    
    <main>
        <section id="content">
            <h2>Bienvenue</h2>
            <p>Site en construction...</p>
            <div id="data-container"></div>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2024 Mon ${this.config.name}</p>
    </footer>
    
    <script src="js/main.js"></script>
</body>
</html>`;

    await fs.writeFile(path.join(this.sitePath, 'index.html'), basicHtml, 'utf8');
  }

  async createSharedFiles() {
    // Create basic CSS
    const basicCss = `/* Basic styles for ${this.config.name} */
:root {
    --primary-color: ${this.config.theme.primary_color};
    --secondary-color: ${this.config.theme.secondary_color};
    --accent-color: ${this.config.theme.accent_color};
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
}

header {
    background: var(--primary-color);
    color: white;
    text-align: center;
    padding: 2rem 0;
}

main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

footer {
    background: var(--secondary-color);
    color: white;
    text-align: center;
    padding: 1rem 0;
    margin-top: 2rem;
}`;

    await fs.writeFile(path.join(this.sitePath, 'css', 'style.css'), basicCss, 'utf8');

    // Create basic JS
    const basicJs = `// Site functionality for business ${this.businessId}
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const BUSINESS_ID = '${this.businessId}';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    await loadBusinessData();
});

async function loadBusinessData() {
    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', BUSINESS_ID)
            .single();
            
        if (error) throw error;
        
        console.log('Business data loaded:', data);
        // Update page content here
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}`;

    await fs.writeFile(path.join(this.sitePath, 'js', 'main.js'), basicJs, 'utf8');
  }

  // Utility methods
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async getHtmlFiles() {
    const files = await fs.readdir(this.sitePath);
    return files.filter(file => file.endsWith('.html'));
  }

  async showStructure() {
    const showDir = async (dirPath, prefix = '') => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isLast = i === entries.length - 1;
        const currentPrefix = prefix + (isLast ? '└── ' : '├── ');
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        
        console.log(currentPrefix + entry.name);
        
        if (entry.isDirectory()) {
          await showDir(path.join(dirPath, entry.name), nextPrefix);
        }
      }
    };
    
    await showDir(this.sitePath);
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key.replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = value;
    }
  });
  
  return options;
}

function showHelp() {
  console.log(`
🚀 Générateur de Sites Multi-Business

Usage:
  node generate-site.js --business-id=UUID --type=TYPE [options]

Options:
  --business-id=UUID    ID unique du business (requis)
  --type=TYPE          Type de business (requis)
                       Types disponibles: ${Object.keys(BUSINESS_TYPES).join(', ')}
  --output=PATH        Dossier de sortie (défaut: ./generated-sites)

Exemples:
  node generate-site.js --business-id=550e8400-e29b-41d4-a716-446655440000 --type=restaurant
  node generate-site.js --business-id=123-456-789 --type=coiffeur --output=./my-sites

Variables d'environnement:
  SUPABASE_URL         URL de votre projet Supabase
  SUPABASE_ANON_KEY    Clé anonyme de Supabase
`);
}

// Main execution
async function main() {
  const options = parseArgs();
  
  if (options.help || !options.businessId || !options.type) {
    showHelp();
    process.exit(options.help ? 0 : 1);
  }
  
  try {
    const generator = new SiteGenerator(options);
    await generator.generate();
    console.log('\n🎉 Génération terminée avec succès !');
  } catch (error) {
    console.error('\n💥 Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SiteGenerator, BUSINESS_TYPES };