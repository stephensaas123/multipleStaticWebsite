// firebase-config.js - Configuration Firebase centralisée

const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:your-app-id-here",
    measurementId: "G-YOUR-MEASUREMENT-ID" // Optionnel pour Analytics
};

// Configuration des règles de sécurité Firestore (pour référence)
const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les businesses
    match /businesses/{businessId} {
      // Lecture publique pour les sites web
      allow read: if true;
      
      // Écriture seulement pour le propriétaire
      allow write: if request.auth != null && 
                   request.auth.uid == resource.data.owner_uid;
      
      // Création seulement si l'utilisateur authentifié devient propriétaire
      allow create: if request.auth != null && 
                    request.auth.uid == request.resource.data.owner_uid;
    }
    
    // Règles pour les profils utilisateurs
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                         request.auth.uid == userId;
    }
    
    // Collection pour les messages de contact (optionnel)
    match /messages/{messageId} {
      allow create: if true; // Permettre aux visiteurs d'envoyer des messages
      allow read, write: if request.auth != null;
    }
  }
}
`;

// Configuration des règles de stockage Firebase Storage
const storageRules = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Images des businesses
    match /businesses/{businessId}/{allPaths=**} {
      // Lecture publique
      allow read: if true;
      
      // Écriture seulement pour les utilisateurs authentifiés
      // (vérification du propriétaire faite côté client)
      allow write: if request.auth != null;
    }
    
    // Dossier temporaire pour les uploads
    match /temp/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
`;

// Types MIME autorisés pour les uploads
const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
];

// Taille maximale des fichiers (en bytes)
const maxFileSize = 5 * 1024 * 1024; // 5MB

// Configuration des collections Firestore
const collections = {
    businesses: 'businesses',
    users: 'users',
    messages: 'messages'
};

// Validation des données business
const businessValidation = {
    required: ['business_id', 'business_type', 'owner_uid'],
    businessTypes: ['restaurant', 'coiffeur', 'independant', 'commerce'],
    maxNameLength: 100,
    maxDescriptionLength: 500,
    maxAddressLength: 300
};

// Export de la configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        firebaseConfig,
        firestoreRules,
        storageRules,
        allowedImageTypes,
        maxFileSize,
        collections,
        businessValidation
    };
} else {
    // Configuration globale pour le navigateur
    window.FIREBASE_CONFIG = firebaseConfig;
    window.FIREBASE_SETTINGS = {
        allowedImageTypes,
        maxFileSize,
        collections,
        businessValidation
    };
}