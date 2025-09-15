// config/supabase-config.js
// Configuration centralisée pour Supabase

class SupabaseConfig {
    constructor() {
        this.url = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
        this.anonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
        this.client = null;
    }

    // Initialize Supabase client
    init() {
        if (typeof window !== 'undefined' && window.supabase) {
            this.client = window.supabase.createClient(this.url, this.anonKey);
        }
        return this.client;
    }

    // Get client instance
    getClient() {
        if (!this.client) {
            this.init();
        }
        return this.client;
    }

    // Database table configurations
    getTables() {
        return {
            businesses: 'businesses',
            products_services: 'products_services',
            categories: 'categories',
            business_images: 'business_images'
        };
    }

    // Storage bucket configurations
    getBuckets() {
        return {
            businessImages: 'business-images',
            productImages: 'product-images',
            documents: 'business-documents'
        };
    }

    // RLS (Row Level Security) policies helper
    getRLSPolicies() {
        return {
            userCanAccessOwnBusiness: `
                CREATE POLICY "Users can access their own business data" 
                ON {table_name}
                FOR ALL USING (
                    business_id IN (
                        SELECT id FROM businesses WHERE user_id = auth.uid()
                    )
                );
            `,
            userCanManageOwnBusiness: `
                CREATE POLICY "Users can manage their own business" 
                ON businesses
                FOR ALL USING (auth.uid() = user_id);
            `
        };
    }
}

// Export for Node.js and browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseConfig;
} else {
    window.SupabaseConfig = SupabaseConfig;
}