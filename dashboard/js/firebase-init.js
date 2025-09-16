// firebase-init.js - Initialisation Firebase pour le dashboard

// Configuration Firebase - À remplacer par vos vraies valeurs
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:your-app-id-here"
};

// Vérifier si Firebase est déjà initialisé
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // Si déjà initialisé, utiliser l'app par défaut
}

// Initialiser les services Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configuration Firestore pour de meilleures performances
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Activer la persistance hors ligne pour une meilleure UX
db.enablePersistence().catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Firebase persistence failed - multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Firebase persistence not supported by browser');
    }
});

// Configuration de l'authentification
auth.useDeviceLanguage(); // Utiliser la langue du navigateur

// Gestionnaire global d'erreurs Firebase
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.code && event.reason.code.startsWith('auth/')) {
        console.error('Erreur Firebase Auth non gérée:', event.reason);
        // Optionnel : afficher une notification d'erreur globale
    }
});

// Utilitaires pour le dashboard
window.DashboardFirebase = {
    auth,
    db,
    storage,
    
    // Raccourcis pour les collections fréquemment utilisées
    collections: {
        businesses: () => db.collection('businesses'),
        users: () => db.collection('users'),
        messages: () => db.collection('messages')
    },
    
    // Utilitaire pour uploader des images
    async uploadImage(file, path) {
        const storageRef = storage.ref();
        const fileRef = storageRef.child(path);
        const snapshot = await fileRef.put(file);
        return await snapshot.ref.getDownloadURL();
    },
    
    // Utilitaire pour supprimer des images
    async deleteImage(imageUrl) {
        try {
            if (imageUrl.includes('firebasestorage.googleapis.com')) {
                const storageRef = storage.refFromURL(imageUrl);
                await storageRef.delete();
            }
        } catch (error) {
            console.warn('Erreur lors de la suppression de l\'image:', error);
        }
    },
    
    // Utilitaire pour gérer les timestamps
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    
    // Utilitaire pour les requêtes en temps réel
    onSnapshot: (query, callback, errorCallback) => {
        return query.onSnapshot(callback, errorCallback);
    },
    
    // Vérification des permissions
    async checkBusinessOwnership(businessId, userId) {
        try {
            const businessDoc = await db.collection('businesses').doc(businessId).get();
            return businessDoc.exists && businessDoc.data().owner_uid === userId;
        } catch (error) {
            console.error('Erreur lors de la vérification des permissions:', error);
            return false;
        }
    }
};

console.log('Firebase Dashboard initialisé avec succès');

// Export global pour compatibilité
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;