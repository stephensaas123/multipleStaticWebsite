// shared/js/data-fetcher.js
// Module pour récupérer les données depuis Supabase pour les sites statiques

class DataFetcher {
    constructor(supabaseUrl, supabaseKey, businessId) {
        this.businessId = businessId;
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.client = null;
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        
        this.init();
    }

    init() {
        if (typeof window !== 'undefined' && window.supabase) {
            this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            throw new Error('Supabase library not available');
        }
    }

    // Système de cache simple
    getCacheKey(table, filters = {}) {
        return `${table}-${JSON.stringify(filters)}`;
    }

    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
            return cached.data;
        }
        return null;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // Récupération des données business
    async getBusinessInfo() {
        const cacheKey = this.getCacheKey('business', { id: this.businessId });
        const cached = this.getCachedData(cacheKey);
        
        if (cached) return cached;

        try {
            const { data, error } = await this.client
                .from('businesses')
                .select('*')
                .eq('id', this.businessId)
                .eq('is_active', true)
                .single();

            if (error) throw error;
            
            this.setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching business info:', error);
            return null;
        }
    }

    // Récupération des produits/services
    async getProductsServices(category = null) {
        const filters = { business_id: this.businessId };
        if (category) filters.category = category;
        
        const cacheKey = this.getCacheKey('products_services', filters);
        const cached = this.getCachedData(cacheKey);
        
        if (cached) return cached;

        try {
            let query = this.client
                .from('products_services')
                .select('*')
                .eq('business_id', this.businessId)
                .eq('is_available', true)
                .order('sort_order', { ascending: true });

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            
            this.setCachedData(cacheKey, data || []);
            return data || [];
        } catch (error) {
            console.error('Error fetching products/services:', error);
            return [];
        }
    }

    // Récupération des catégories
    async getCategories() {
        const cacheKey = this.getCacheKey('categories', { business_id: this.businessId });
        const cached = this.getCachedData(cacheKey);
        
        if (cached) return cached;

        try {
            const { data, error } = await this.client
                .from('categories')
                .select('*')
                .eq('business_id', this.businessId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            
            this.setCachedData(cacheKey, data || []);
            return data || [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    // Récupération des images
    async getImages(category = null) {
        const filters = { business_id: this.businessId };
        if (category) filters.category = category;
        
        const cacheKey = this.getCacheKey('business_images', filters);
        const cached = this.getCachedData(cacheKey);
        
        if (cached) return cached;

        try {
            let query = this.client
                .from('business_images')
                .select('*')
                .eq('business_id', this.businessId)
                .order('sort_order', { ascending: true });

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            
            this.setCachedData(cacheKey, data || []);
            return data || [];
        } catch (error) {
            console.error('Error fetching images:', error);
            return [];
        }
    }

    // Récupération complète des données du site
    async getAllSiteData() {
        const cacheKey = this.getCacheKey('all_site_data', { business_id: this.businessId });
        const cached = this.getCachedData(cacheKey);
        
        if (cached) return cached;

        try {
            const [business, products, categories, images] = await Promise.all([
                this.getBusinessInfo(),
                this.getProductsServices(),
                this.getCategories(),
                this.getImages()
            ]);

            const siteData = {
                business,
                products,
                categories,
                images,
                lastUpdated: new Date().toISOString()
            };

            this.setCachedData(cacheKey, siteData);
            return siteData;
        } catch (error) {
            console.error('Error fetching all site data:', error);
            return {
                business: null,
                products: [],
                categories: [],
                images: [],
                lastUpdated: new Date().toISOString(),
                error: error.message
            };
        }
    }

    // Recherche dans les produits/services
    async searchProducts(searchTerm) {
        if (!searchTerm || searchTerm.trim().length < 2) {
            return [];
        }

        const cacheKey = this.getCacheKey('search', { term: searchTerm.trim() });
        const cached = this.getCachedData(cacheKey);
        
        if (cached) return cached;

        try {
            const { data, error } = await this.client
                .from('products_services')
                .select('*')
                .eq('business_id', this.businessId)
                .eq('is_available', true)
                .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
                .order('name', { ascending: true });

            if (error) throw error;
            
            this.setCachedData(cacheKey, data || []);
            return data || [];
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    }

    // Méthodes pour les différents types de business
    async getMenuItems() {
        // Pour les restaurants - récupère les éléments du menu par catégorie
        const categories = await this.getCategories();
        const menuData = {};

        for (const category of categories) {
            const items = await this.getProductsServices(category.name);
            menuData[category.name] = {
                category: category,
                items: items
            };
        }

        return menuData;
    }

    async getServices() {
        // Pour coiffeurs et coaches - récupère les services disponibles
        return await this.getProductsServices();
    }

    async getProducts() {
        // Pour commerces - récupère les produits par catégorie
        const categories = await this.getCategories();
        const productsData = {};

        for (const category of categories) {
            const items = await this.getProductsServices(category.name);
            productsData[category.name] = {
                category: category,
                items: items
            };
        }

        return productsData;
    }

    // Méthodes utilitaires pour l'affichage
    formatPrice(price) {
        if (!price) return 'Prix sur demande';
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(price);
    }

    formatDuration(minutes) {
        if (!minutes) return '';
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) return `${hours}h`;
        return `${hours}h${mins}`;
    }

    // Gestion des erreurs et états de chargement
    createLoadingElement(text = 'Chargement...') {
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.innerHTML = `
            <div class="spinner"></div>
            <p>${text}</p>
        `;
        return loading;
    }

    createErrorElement(message = 'Une erreur est survenue') {
        const error = document.createElement('div');
        error.className = 'alert alert-error';
        error.textContent = message;
        return error;
    }

    // Méthode pour vider le cache
    clearCache() {
        this.cache.clear();
    }

    // Méthode pour recharger les données
    async refreshData() {
        this.clearCache();
        return await this.getAllSiteData();
    }

    // Écouter les changements en temps réel (optionnel)
    subscribeToChanges(callback) {
        if (!this.client) return null;

        const subscription = this.client
            .channel('business_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'businesses',
                filter: `id=eq.${this.businessId}`
            }, (payload) => {
                this.clearCache();
                callback('business', payload);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'products_services',
                filter: `business_id=eq.${this.businessId}`
            }, (payload) => {
                this.clearCache();
                callback('products', payload);
            })
            .subscribe();

        return subscription;
    }

    // Helper pour générer des URLs d'images optimisées
    getOptimizedImageUrl(imageUrl, width = null, height = null, quality = 80) {
        if (!imageUrl) return '';
        
        // Si l'image vient de Supabase Storage
        if (imageUrl.includes('supabase')) {
            const url = new URL(imageUrl);
            const params = new URLSearchParams();
            
            if (width) params.set('width', width);
            if (height) params.set('height', height);
            params.set('quality', quality);
            
            if (params.toString()) {
                url.search = params.toString();
            }
            
            return url.toString();
        }
        
        return imageUrl;
    }
}

// Fonction utilitaire pour initialiser rapidement le DataFetcher
function createDataFetcher(businessId, supabaseUrl = null, supabaseKey = null) {
    // Utiliser les variables d'environnement ou les valeurs par défaut
    const url = supabaseUrl || window.SUPABASE_URL || 'YOUR_SUPABASE_URL';
    const key = supabaseKey || window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
    
    return new DataFetcher(url, key, businessId);
}

// Export pour compatibilité
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataFetcher, createDataFetcher };
} else {
    window.DataFetcher = DataFetcher;
    window.createDataFetcher = createDataFetcher;
}