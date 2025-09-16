// firebase-client.js - Client Firebase pour les sites générés

// Configuration Firebase (sera injectée lors de la génération)
const firebaseConfig = {
    apiKey: "{{FIREBASE_API_KEY}}",
    authDomain: "{{FIREBASE_AUTH_DOMAIN}}",
    projectId: "{{FIREBASE_PROJECT_ID}}",
    storageBucket: "{{FIREBASE_STORAGE_BUCKET}}",
    messagingSenderId: "{{FIREBASE_MESSAGING_SENDER_ID}}",
    appId: "{{FIREBASE_APP_ID}}"
};

class FirebaseClient {
    constructor() {
        this.app = null;
        this.db = null;
        this.storage = null;
        this.initialized = false;
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Initialiser Firebase
            this.app = firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore();
            this.storage = firebase.storage();
            
            // Configuration Firestore
            this.db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });

            // Activer la persistance hors ligne si possible
            try {
                await this.db.enablePersistence();
            } catch (err) {
                console.warn('Persistance Firestore non disponible:', err.code);
            }

            this.initialized = true;
            console.log('Firebase Client initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de Firebase:', error);
            throw error;
        }
    }

    // Gestion du cache
    getCacheKey(collection, docId, params = {}) {
        const paramString = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
        return `${collection}/${docId}${paramString}`;
    }

    isValidCache(key) {
        const expiry = this.cacheExpiry.get(key);
        return expiry && Date.now() < expiry;
    }

    setCache(key, data) {
        this.cache.set(key, data);
        this.cacheExpiry.set(key, Date.now() + this.cacheDuration);
    }

    clearCache() {
        this.cache.clear();
        this.cacheExpiry.clear();
    }

    // Récupérer les données d'un business
    async fetchBusinessData(businessId) {
        if (!this.initialized) await this.initialize();

        const cacheKey = this.getCacheKey('businesses', businessId);
        
        // Vérifier le cache d'abord
        if (this.isValidCache(cacheKey)) {
            console.log('Données récupérées du cache pour:', businessId);
            return this.cache.get(cacheKey);
        }

        try {
            const doc = await this.db.collection('businesses').doc(businessId).get();
            
            if (!doc.exists) {
                throw new Error(`Business ${businessId} non trouvé`);
            }

            const data = doc.data();
            
            // Traiter les URLs des images
            const processedData = await this.processImageUrls(data);
            
            // Mettre en cache
            this.setCache(cacheKey, processedData);
            
            console.log('Données business récupérées:', businessId);
            return processedData;
            
        } catch (error) {
            console.error('Erreur lors de la récupération des données business:', error);
            throw error;
        }
    }

    // Traitement des URLs d'images Firebase Storage
    async processImageUrls(data) {
        const processedData = JSON.parse(JSON.stringify(data)); // Deep clone
        
        try {
            // Fonction récursive pour traiter toutes les URLs d'images
            const processUrls = async (obj) => {
                for (const key in obj) {
                    if (obj[key] && typeof obj[key] === 'object') {
                        await processUrls(obj[key]);
                    } else if (typeof obj[key] === 'string' && obj[key].startsWith('gs://')) {
                        try {
                            const storageRef = this.storage.refFromURL(obj[key]);
                            obj[key] = await storageRef.getDownloadURL();
                        } catch (error) {
                            console.warn('Impossible de récupérer l\'URL pour:', obj[key]);
                            obj[key] = '/images/placeholder.jpg'; // Image par défaut
                        }
                    }
                }
            };

            await processUrls(processedData);
            return processedData;
            
        } catch (error) {
            console.error('Erreur lors du traitement des URLs d\'images:', error);
            return data; // Retourner les données originales en cas d'erreur
        }
    }

    // Envoyer une demande de réservation
    async sendBookingRequest(bookingData) {
        if (!this.initialized) await this.initialize();

        try {
            const docRef = await this.db.collection('booking_requests').add({
                ...bookingData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'nouveau',
                source: 'website'
            });

            console.log('Demande de réservation envoyée:', docRef.id);
            return docRef.id;
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la demande de réservation:', error);
            throw error;
        }
    }

    // Envoyer un message de contact
    async sendContactMessage(contactData) {
        if (!this.initialized) await this.initialize();

        try {
            const docRef = await this.db.collection('contact_messages').add({
                ...contactData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'nouveau',
                source: 'website'
            });

            console.log('Message de contact envoyé:', docRef.id);
            return docRef.id;
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message de contact:', error);
            throw error;
        }
    }

    // Récupérer les témoignages publics
    async fetchTestimonials(businessId, limit = 10) {
        if (!this.initialized) await this.initialize();

        const cacheKey = this.getCacheKey('testimonials', businessId, { limit });
        
        if (this.isValidCache(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const query = this.db.collection('testimonials')
                .where('business_id', '==', businessId)
                .where('published', '==', true)
                .orderBy('created_at', 'desc')
                .limit(limit);

            const snapshot = await query.get();
            const testimonials = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.setCache(cacheKey, testimonials);
            return testimonials;
            
        } catch (error) {
            console.error('Erreur lors de la récupération des témoignages:', error);
            return [];
        }
    }

    // Récupérer les actualités/promotions
    async fetchNews(businessId, limit = 5) {
        if (!this.initialized) await this.initialize();

        const cacheKey = this.getCacheKey('news', businessId, { limit });
        
        if (this.isValidCache(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const query = this.db.collection('news')
                .where('business_id', '==', businessId)
                .where('published', '==', true)
                .where('expiry_date', '>', firebase.firestore.Timestamp.now())
                .orderBy('expiry_date', 'desc')
                .orderBy('created_at', 'desc')
                .limit(limit);

            const snapshot = await query.get();
            const news = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.setCache(cacheKey, news);
            return news;
            
        } catch (error) {
            console.error('Erreur lors de la récupération des actualités:', error);
            return [];
        }
    }

    // Enregistrer une vue de page (analytics simple)
    async trackPageView(businessId, page, userAgent = null) {
        if (!this.initialized) await this.initialize();

        try {
            // Utiliser un throttle pour éviter trop de requêtes
            const throttleKey = `pageview_${businessId}_${page}`;
            const lastTracked = sessionStorage.getItem(throttleKey);
            const now = Date.now();
            
            if (lastTracked && (now - parseInt(lastTracked)) < 60000) {
                return; // Pas plus d'une fois par minute
            }

            await this.db.collection('page_views').add({
                business_id: businessId,
                page: page,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                user_agent: userAgent || navigator.userAgent,
                referrer: document.referrer,
                url: window.location.href
            });

            sessionStorage.setItem(throttleKey, now.toString());
            
        } catch (error) {
            // Ne pas faire échouer la page pour les analytics
            console.warn('Erreur lors du tracking de la page:', error);
        }
    }

    // Vérifier la disponibilité du service (pour la maintenance)
    async checkServiceStatus() {
        if (!this.initialized) await this.initialize();

        try {
            const doc = await this.db.collection('system').doc('status').get();
            
            if (doc.exists) {
                return doc.data();
            }
            
            return { available: true };
            
        } catch (error) {
            console.warn('Impossible de vérifier le statut du service:', error);
            return { available: true }; // Par défaut, considérer comme disponible
        }
    }

    // Méthodes utilitaires pour les requêtes en temps réel
    subscribeToBusinessData(businessId, callback) {
        if (!this.initialized) {
            console.error('Firebase non initialisé');
            return null;
        }

        return this.db.collection('businesses').doc(businessId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    this.processImageUrls(doc.data()).then(processedData => {
                        callback(processedData);
                        // Mettre à jour le cache
                        const cacheKey = this.getCacheKey('businesses', businessId);
                        this.setCache(cacheKey, processedData);
                    });
                } else {
                    callback(null);
                }
            }, error => {
                console.error('Erreur lors de l\'écoute des données business:', error);
                callback(null);
            });
    }

    // Récupérer les horaires d'ouverture formatés
    getFormattedHours(hours) {
        if (!hours) return null;

        const dayNames = {
            monday: 'Lundi',
            tuesday: 'Mardi', 
            wednesday: 'Mercredi',
            thursday: 'Jeudi',
            friday: 'Vendredi',
            saturday: 'Samedi',
            sunday: 'Dimanche'
        };

        const formatted = {};
        Object.entries(dayNames).forEach(([key, name]) => {
            if (hours[key]) {
                formatted[name] = hours[key];
            }
        });

        return formatted;
    }

    // Vérifier si le commerce est actuellement ouvert
    isCurrentlyOpen(hours) {
        if (!hours) return null;

        const now = new Date();
        const currentDay = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
        const currentTime = now.getHours() * 100 + now.getMinutes();

        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayKey = dayKeys[currentDay];
        const todayHours = hours[todayKey];

        if (!todayHours || todayHours.toLowerCase() === 'fermé') {
            return false;
        }

        try {
            // Parser les heures (format : "09h00-18h00" ou "09h00-12h00, 14h00-18h00")
            const timeRanges = todayHours.split(',').map(range => range.trim());
            
            for (const range of timeRanges) {
                const [start, end] = range.split('-').map(time => {
                    const cleaned = time.trim().replace('h', '');
                    const [hours, minutes = '00'] = cleaned.split(':');
                    return parseInt(hours) * 100 + parseInt(minutes);
                });

                if (currentTime >= start && currentTime <= end) {
                    return true;
                }
            }

            return false;
            
        } catch (error) {
            console.warn('Erreur lors du parsing des horaires:', error);
            return null;
        }
    }

    // Nettoyer les ressources
    cleanup() {
        this.clearCache();
        if (this.app) {
            // Firebase ne fournit pas de méthode cleanup explicite
            // mais on peut nettoyer nos ressources
            this.app = null;
            this.db = null;
            this.storage = null;
            this.initialized = false;
        }
    }
}

// Instance globale
window.FirebaseClient = new FirebaseClient();

// Auto-initialisation si on est dans un navigateur
if (typeof window !== 'undefined') {
    // Initialiser automatiquement au chargement de la page
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.FirebaseClient.initialize();
        } catch (error) {
            console.error('Échec de l\'initialisation automatique de Firebase:', error);
        }
    });

    // Nettoyer avant de quitter la page
    window.addEventListener('beforeunload', () => {
        window.FirebaseClient.cleanup();
    });

    // Gestion des erreurs globales
    window.addEventListener('unhandledrejection', event => {
        if (event.reason && event.reason.code && event.reason.code.startsWith('firestore/')) {
            console.error('Erreur Firestore non gérée:', event.reason);
            // Optionnellement, afficher un message à l'utilisateur
        }
    });
}

// Export pour les modules (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseClient;
}