// shared/js/supabase-client.js
// Client Supabase partagé avec méthodes communes

class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isInitialized = false;
    }

    // Initialiser le client Supabase
    init(url, anonKey) {
        if (typeof window !== 'undefined' && window.supabase) {
            this.supabase = window.supabase.createClient(url, anonKey);
            this.isInitialized = true;
            this.setupAuthListener();
            return this.supabase;
        }
        throw new Error('Supabase library not loaded');
    }

    // Vérifier si le client est initialisé
    checkInitialized() {
        if (!this.isInitialized) {
            throw new Error('Supabase client not initialized. Call init() first.');
        }
    }

    // Configuration de l'écoute des changements d'authentification
    setupAuthListener() {
        this.supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            
            // Dispatch custom event for auth state changes
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('authStateChange', {
                    detail: { event, session, user: this.currentUser }
                }));
            }
        });
    }

    // Méthodes d'authentification
    async signIn(email, password) {
        this.checkInitialized();
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    }

    async signUp(email, password, metadata = {}) {
        this.checkInitialized();
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });
        return { data, error };
    }

    async signOut() {
        this.checkInitialized();
        const { error } = await this.supabase.auth.signOut();
        this.currentUser = null;
        return { error };
    }

    async getCurrentUser() {
        this.checkInitialized();
        const { data: { user }, error } = await this.supabase.auth.getUser();
        this.currentUser = user;
        return { user, error };
    }

    // Méthodes CRUD pour businesses
    async getBusiness(businessId) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();
        
        return { data, error };
    }

    async getUserBusiness(userId) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('businesses')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        return { data, error };
    }

    async createBusiness(businessData) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('businesses')
            .insert([businessData])
            .select()
            .single();
        
        return { data, error };
    }

    async updateBusiness(businessId, updateData) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('businesses')
            .update(updateData)
            .eq('id', businessId)
            .select()
            .single();
        
        return { data, error };
    }

    // Méthodes CRUD pour produits/services
    async getProductsServices(businessId) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('products_services')
            .select('*')
            .eq('business_id', businessId)
            .eq('is_available', true)
            .order('sort_order', { ascending: true });
        
        return { data, error };
    }

    async getProductsByCategory(businessId, category) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('products_services')
            .select('*')
            .eq('business_id', businessId)
            .eq('category', category)
            .eq('is_available', true)
            .order('sort_order', { ascending: true });
        
        return { data, error };
    }

    async createProductService(productData) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('products_services')
            .insert([productData])
            .select()
            .single();
        
        return { data, error };
    }

    async updateProductService(productId, updateData) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('products_services')
            .update(updateData)
            .eq('id', productId)
            .select()
            .single();
        
        return { data, error };
    }

    async deleteProductService(productId) {
        this.checkInitialized();
        const { error } = await this.supabase
            .from('products_services')
            .delete()
            .eq('id', productId);
        
        return { error };
    }

    // Méthodes pour les catégories
    async getCategories(businessId) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('categories')
            .select('*')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        
        return { data, error };
    }

    async createCategory(categoryData) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('categories')
            .insert([categoryData])
            .select()
            .single();
        
        return { data, error };
    }

    // Méthodes pour les images
    async getBusinessImages(businessId, category = null) {
        this.checkInitialized();
        let query = this.supabase
            .from('business_images')
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });
        
        if (category) {
            query = query.eq('category', category);
        }
        
        const { data, error } = await query;
        return { data, error };
    }

    async uploadImage(bucketName, filePath, file) {
        this.checkInitialized();
        const { data, error } = await this.supabase.storage
            .from(bucketName)
            .upload(filePath, file);
        
        return { data, error };
    }

    async deleteImage(bucketName, filePath) {
        this.checkInitialized();
        const { data, error } = await this.supabase.storage
            .from(bucketName)
            .remove([filePath]);
        
        return { data, error };
    }

    async getPublicUrl(bucketName, filePath) {
        this.checkInitialized();
        const { data } = this.supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
        
        return data.publicUrl;
    }

    async saveBusinessImage(imageData) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('business_images')
            .insert([imageData])
            .select()
            .single();
        
        return { data, error };
    }

    // Méthodes utilitaires
    async executeRPC(functionName, params = {}) {
        this.checkInitialized();
        const { data, error } = await this.supabase.rpc(functionName, params);
        return { data, error };
    }

    // Méthode pour récupérer les données publiques d'un business (sans authentification)
    async getPublicBusinessData(businessId) {
        this.checkInitialized();
        
        const [businessResult, productsResult, imagesResult] = await Promise.all([
            this.getBusiness(businessId),
            this.getProductsServices(businessId),
            this.getBusinessImages(businessId)
        ]);

        return {
            business: businessResult.data,
            products: productsResult.data || [],
            images: imagesResult.data || [],
            errors: {
                business: businessResult.error,
                products: productsResult.error,
                images: imagesResult.error
            }
        };
    }

    // Méthode pour la recherche
    async searchProductsServices(businessId, searchTerm) {
        this.checkInitialized();
        const { data, error } = await this.supabase
            .from('products_services')
            .select('*')
            .eq('business_id', businessId)
            .eq('is_available', true)
            .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
            .order('name', { ascending: true });
        
        return { data, error };
    }

    // Gestion des erreurs
    handleError(error) {
        console.error('Supabase Error:', error);
        
        // Messages d'erreur personnalisés
        const errorMessages = {
            'Invalid login credentials': 'Email ou mot de passe incorrect',
            'User not found': 'Utilisateur non trouvé',
            'Email already registered': 'Cet email est déjà utilisé',
            'Invalid email': 'Format d\'email invalide',
            'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères'
        };

        return errorMessages[error.message] || error.message || 'Une erreur est survenue';
    }
}

// Export pour compatibilité Node.js et navigateur
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseClient;
} else {
    window.SupabaseClient = SupabaseClient;
}