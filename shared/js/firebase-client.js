// firebase-client.js - Client Firebase pour les sites statiques

// Configuration Firebase (sera injectée par le script de génération)
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com", 
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:your-app-id-here"
};

// Initialiser Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    
    // Initialiser les services
    const db = firebase.firestore();
    const storage = firebase.storage();
    const auth = firebase.auth();
    
    console.log('Firebase initialisé pour le site client');
} else {
    console.error('Firebase SDK non chargé');
}

// Service de données pour les sites clients
class FirebaseClientService {
    constructor() {
        this.db = db;
        this.storage = storage;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Récupérer les données d'un business avec cache
    async getBusinessData(businessId) {
        const cacheKey = `business_${businessId}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
            return cached.data;
        }

        try {
            const doc = await this.db.collection('businesses').doc(businessId).get();
            
            if (doc.exists) {
                const data = doc.data();
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                return data;
            } else {
                throw new Error(`Business ${businessId} non trouvé`);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données:', error);
            throw error;
        }
    }

    // Convertir une URL de storage en URL de téléchargement
    async getDownloadURL(gsUrl) {
        if (!gsUrl) return null;
        
        const cacheKey = `url_${gsUrl}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
            return cached.data;
        }

        try {
            let downloadURL;
            
            if (gsUrl.startsWith('gs://')) {
                const ref = this.storage.refFromURL(gsUrl);
                downloadURL = await ref.getDownloadURL();
            } else if (gsUrl.startsWith('http')) {
                downloadURL = gsUrl;
            } else {
                return null;
            }

            this.cache.set(cacheKey, {
                data: downloadURL,
                timestamp: Date.now()
            });

            return downloadURL;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'URL:', error);
            return null;
        }
    }

    // Envoyer un message de contact (optionnel)
    async sendContactMessage(businessId, messageData) {
        try {
            const message = {
                business_id: businessId,
                name: messageData.name,
                email: messageData.email,
                subject: messageData.subject || '',
                message: messageData.message,
                timestamp: new Date(),
                ip: null, // Sera ajouté côté serveur si nécessaire
                user_agent: navigator.userAgent
            };

            await this.db.collection('messages').add(message);
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);
            throw error;
        }
    }

    // Nettoyer le cache
    clearCache() {
        this.cache.clear();
    }

    // Écouter les changements en temps réel (optionnel)
    watchBusinessData(businessId, callback) {
        return this.db.collection('businesses').doc(businessId)
            .onSnapshot(
                (doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        // Mettre à jour le cache
                        this.cache.set(`business_${businessId}`, {
                            data: data,
                            timestamp: Date.now()
                        });
                        callback(data);
                    }
                },
                (error) => {
                    console.error('Erreur lors de l\'écoute des changements:', error);
                }
            );
    }
}

// Instance globale du service
let firebaseClientService;

if (typeof db !== 'undefined') {
    firebaseClientService = new FirebaseClientService();
    
    // Export pour utilisation globale
    window.firebaseClientService = firebaseClientService;
}

// Fonctions utilitaires globales
window.loadGloriaFoodWidget = function() {
    if (typeof firebaseClientService === 'undefined') {
        console.error('Service Firebase non initialisé');
        return;
    }
    
    const widget = document.getElementById('gloria-food-widget');
    if (!widget) return;
    
    // La logique de chargement sera gérée par le DataLoader
    console.log('Chargement du widget GloriaFood...');
};

window.loadFreshaWidget = function() {
    if (typeof firebaseClientService === 'undefined') {
        console.error('Service Firebase non initialisé');
        return;
    }
    
    const widget = document.getElementById('fresha-widget');
    if (!widget) return;
    
    console.log('Chargement du widget Fresha...');
};

window.loadCalendlyWidget = function() {
    if (typeof firebaseClientService === 'undefined') {
        console.error('Service Firebase non initialisé');
        return;
    }
    
    const widget = document.getElementById('calendly-widget');
    if (!widget) return;
    
    console.log('Chargement du widget Calendly...');
};

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseClientService };
}