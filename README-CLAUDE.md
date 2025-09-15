# Architecture Multi-Business Template

## Structure globale du projet

```
multi-business-template/
├── config/
│   ├── firebase-config.js
│   └── business-types.json
├── dashboard/
│   ├── index.html
│   ├── auth.html
│   ├── css/
│   │   └── dashboard.css
│   └── js/
│       ├── auth.js
│       ├── dashboard.js
│       └── firebase-init.js
├── templates/
│   ├── restaurant/
│   │   ├── index.html
│   │   ├── menu.html
│   │   ├── contact.html
│   │   ├── reservation.html
│   │   └── css/
│   │       └── restaurant-style.css
│   ├── coiffeur/
│   │   ├── index.html
│   │   ├── services.html
│   │   ├── contact.html
│   │   ├── rdv.html
│   │   └── css/
│   │       └── coiffeur-style.css
│   ├── independant/
│   │   ├── index.html
│   │   ├── services.html
│   │   ├── contact.html
│   │   ├── rdv.html
│   │   └── css/
│   │       └── independant-style.css
│   └── commerce/
│       ├── index.html
│       ├── produits.html
│       ├── contact.html
│       └── css/
│           └── commerce-style.css
├── shared/
│   ├── js/
│   │   ├── firebase-client.js
│   │   ├── data-loader.js
│   │   └── utils.js
│   └── css/
│       └── base.css
├── scripts/
│   ├── generate-site.js
│   ├── setup-business.js
│   └── package.json
└── sites/
    └── [generated sites will be placed here]
```

## Structure Firestore

### Document par business (collection: `businesses`)
```json
{
  "business_id": "restaurant_lepetitbistro",
  "business_type": "restaurant",
  "owner_uid": "firebase_user_uid",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "data": {
    "basic_info": {
      "name": "Le Petit Bistro",
      "description": "Restaurant traditionnel français",
      "address": "123 Rue de la Paix, 75001 Paris",
      "phone": "01 23 45 67 89",
      "email": "contact@lepetitbistro.fr",
      "hours": {
        "monday": "12h-14h, 19h-22h",
        "tuesday": "12h-14h, 19h-22h",
        "wednesday": "Fermé",
        "thursday": "12h-14h, 19h-22h",
        "friday": "12h-14h, 19h-23h",
        "saturday": "12h-14h, 19h-23h",
        "sunday": "12h-15h"
      }
    },
    "hero": {
      "title": "Bienvenue au Petit Bistro",
      "subtitle": "Cuisine traditionnelle française",
      "image_url": "gs://bucket/hero-image.jpg",
      "cta_text": "Réserver une table"
    },
    "gallery": [
      {
        "url": "gs://bucket/gallery1.jpg",
        "alt": "Salle du restaurant",
        "caption": "Notre salle principale"
      }
    ],
    // Spécifique restaurant
    "menu_du_jour": {
      "enabled": true,
      "items": [
        {
          "name": "Soupe à l'oignon",
          "description": "Soupe traditionnelle gratinée",
          "price": "8.50",
          "image_url": "gs://bucket/soupe.jpg"
        }
      ]
    },
    "carte_principale": {
      "enabled": true,
      "categories": [
        {
          "name": "Entrées",
          "items": [
            {
              "name": "Foie gras",
              "description": "Foie gras maison sur toast",
              "price": "18.00",
              "image_url": "gs://bucket/foiegras.jpg"
            }
          ]
        }
      ]
    },
    "menu_boissons": {
      "enabled": false,
      "categories": []
    },
    "widgets": {
      "gloria_food": {
        "enabled": true,
        "restaurant_id": "gloria_restaurant_id",
        "widget_code": "<script>...</script>"
      }
    }
  }
}
```

### Document coiffeur (exemple)
```json
{
  "business_id": "salon_elegance",
  "business_type": "coiffeur",
  "data": {
    "basic_info": { /* même structure */ },
    "services": {
      "enabled": true,
      "categories": [
        {
          "name": "Coupes",
          "items": [
            {
              "name": "Coupe homme",
              "description": "Coupe et coiffage",
              "price": "35.00",
              "duration": "30 min",
              "image_url": "gs://bucket/coupe-homme.jpg"
            }
          ]
        }
      ]
    },
    "team": {
      "enabled": true,
      "members": [
        {
          "name": "Marie Dupont",
          "speciality": "Coloriste",
          "image_url": "gs://bucket/marie.jpg",
          "bio": "15 ans d'expérience"
        }
      ]
    },
    "widgets": {
      "fresha": {
        "enabled": true,
        "salon_id": "fresha_salon_id",
        "widget_code": "<script>...</script>"
      }
    }
  }
}
```

## Configuration Firebase

### Rules Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /businesses/{businessId} {
      allow read: if true; // Les sites sont publics
      allow write: if request.auth != null && 
                   resource.data.owner_uid == request.auth.uid;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                         request.auth.uid == userId;
    }
  }
}
```

### Rules Storage
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /businesses/{businessId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Types de business configurables

Chaque type de business est défini dans `business-types.json` :

```json
{
  "restaurant": {
    "name": "Restaurant",
    "pages": ["accueil", "menu", "contact", "reservation"],
    "sections": {
      "menu_du_jour": { "optional": true },
      "carte_principale": { "optional": true },
      "menu_boissons": { "optional": true },
      "gallery": { "optional": true }
    },
    "widgets": ["gloria_food"],
    "theme": "warm",
    "colors": {
      "primary": "#d4793c",
      "secondary": "#8b4513",
      "accent": "#f4a460"
    }
  },
  "coiffeur": {
    "name": "Salon de coiffure",
    "pages": ["accueil", "services", "contact", "rdv"],
    "sections": {
      "services": { "optional": false },
      "team": { "optional": true },
      "gallery": { "optional": true }
    },
    "widgets": ["fresha"],
    "theme": "elegant",
    "colors": {
      "primary": "#e91e63",
      "secondary": "#9c27b0",
      "accent": "#ff4081"
    }
  },
  "independant": {
    "name": "Professionnel indépendant",
    "pages": ["accueil", "services", "contact", "rdv"],
    "sections": {
      "services": { "optional": false },
      "testimonials": { "optional": true },
      "about": { "optional": true }
    },
    "widgets": ["calendly"],
    "theme": "professional",
    "colors": {
      "primary": "#2196f3",
      "secondary": "#1976d2",
      "accent": "#03a9f4"
    }
  },
  "commerce": {
    "name": "Commerce",
    "pages": ["accueil", "produits", "contact"],
    "sections": {
      "products": { "optional": false },
      "categories": { "optional": true },
      "gallery": { "optional": true }
    },
    "widgets": [],
    "theme": "modern",
    "colors": {
      "primary": "#4caf50",
      "secondary": "#388e3c",
      "accent": "#8bc34a"
    }
  }
}
```

## Scripts d'automatisation

Le script principal `generate-site.js` permettra de créer un nouveau site :

```bash
node scripts/generate-site.js --business-id="restaurant_lepetitbistro" --type="restaurant" --output="./sites/restaurant_lepetitbistro"
```

## Ajout de nouveaux types de business

Pour ajouter un nouveau type :

1. **Créer le template** dans `/templates/nouveau_type/`
2. **Ajouter la configuration** dans `business-types.json`
3. **Créer les styles CSS** spécifiques
4. **Définir la structure de données** Firestore
5. **Ajouter les widgets** si nécessaire

La structure modulaire permet d'ajouter facilement de nouveaux types sans impacter les existants.