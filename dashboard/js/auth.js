// auth.js - Gestion de l'authentification Firebase

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initializeAuth();
    }

    initializeAuth() {
        // Observer des changements d'état d'authentification
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.showDashboard();
            } else {
                this.currentUser = null;
                this.showAuthForm();
            }
        });

        // Event listeners pour les formulaires
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleRegistrationForm();
        });

        document.getElementById('logout').addEventListener('click', () => {
            this.logout();
        });
    }

    showAuthForm() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('dashboard-container').style.display = 'none';
    }

    async showDashboard() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'block';
        
        // Charger les données de l'utilisateur dans le dashboard
        await dashboard.loadUserData(this.currentUser);
    }

    toggleRegistrationForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const showRegisterLink = document.getElementById('show-register');

        if (registerForm.style.display === 'none' || !registerForm.style.display) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            showRegisterLink.textContent = 'Se connecter';
        } else {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            showRegisterLink.textContent = 'Créer un compte';
        }
    }

    async login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('Connexion réussie:', userCredential.user);
        } catch (error) {
            console.error('Erreur de connexion:', error);
            this.showAuthError('Erreur de connexion: ' + error.message);
        }
    }

    async register() {
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const businessType = document.getElementById('business-type').value;
        const businessId = document.getElementById('business-id').value;

        // Validation
        if (!businessType || !businessId) {
            this.showAuthError('Veuillez remplir tous les champs');
            return;
        }

        // Valider le format de l'ID business
        if (!/^[a-z0-9_-]+$/.test(businessId)) {
            this.showAuthError('L\'identifiant doit contenir uniquement des lettres minuscules, chiffres, tirets et underscores');
            return;
        }

        try {
            // Vérifier si l'ID business est déjà pris
            const existingBusiness = await db.collection('businesses').doc(businessId).get();
            if (existingBusiness.exists) {
                this.showAuthError('Cet identifiant business est déjà utilisé');
                return;
            }

            // Créer le compte utilisateur
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Créer le document business
            await this.createBusinessDocument(user.uid, businessType, businessId);

            console.log('Inscription réussie:', user);
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            this.showAuthError('Erreur d\'inscription: ' + error.message);
        }
    }

    async createBusinessDocument(userUid, businessType, businessId) {
        const businessData = {
            business_id: businessId,
            business_type: businessType,
            owner_uid: userUid,
            created_at: new Date(),
            updated_at: new Date(),
            data: this.getDefaultBusinessData(businessType)
        };

        await db.collection('businesses').doc(businessId).set(businessData);
        
        // Créer aussi un document utilisateur
        await db.collection('users').doc(userUid).set({
            email: auth.currentUser.email,
            business_id: businessId,
            business_type: businessType,
            created_at: new Date()
        });
    }

    getDefaultBusinessData(businessType) {
        const baseData = {
            basic_info: {
                name: '',
                description: '',
                address: '',
                phone: '',
                email: '',
                hours: {
                    monday: '',
                    tuesday: '',
                    wednesday: '',
                    thursday: '',
                    friday: '',
                    saturday: '',
                    sunday: ''
                }
            },
            hero: {
                title: '',
                subtitle: '',
                cta_text: 'En savoir plus',
                image_url: ''
            },
            gallery: []
        };

        // Ajouter des sections spécifiques selon le type de business
        switch (businessType) {
            case 'restaurant':
                baseData.menu_du_jour = {
                    enabled: false,
                    items: []
                };
                baseData.carte_principale = {
                    enabled: false,
                    categories: []
                };
                baseData.menu_boissons = {
                    enabled: false,
                    categories: []
                };
                baseData.widgets = {
                    gloria_food: {
                        enabled: false,
                        restaurant_id: '',
                        widget_code: ''
                    }
                };
                break;

            case 'coiffeur':
                baseData.services = {
                    enabled: false,
                    categories: []
                };
                baseData.team = {
                    enabled: false,
                    members: []
                };
                baseData.widgets = {
                    fresha: {
                        enabled: false,
                        salon_id: '',
                        widget_code: ''
                    }
                };
                break;

            case 'independant':
                baseData.services = {
                    enabled: false,
                    categories: []
                };
                baseData.testimonials = {
                    enabled: false,
                    items: []
                };
                baseData.about = {
                    enabled: false,
                    content: ''
                };
                baseData.widgets = {
                    calendly: {
                        enabled: false,
                        url: ''
                    }
                };
                break;

            case 'commerce':
                baseData.products = {
                    enabled: false,
                    categories: []
                };
                baseData.widgets = {};
                break;
        }

        return baseData;
    }

    async logout() {
        try {
            await auth.signOut();
            console.log('Déconnexion réussie');
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
        }
    }

    showAuthError(message) {
        // Supprimer les messages d'erreur existants
        const existingErrors = document.querySelectorAll('.auth-error');
        existingErrors.forEach(error => error.remove());

        // Créer le nouveau message d'erreur
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.style.cssText = `
            background: #fff5f5;
            border: 1px solid #fc8181;
            color: #742a2a;
            padding: 1rem;
            border-radius: 5px;
            margin-bottom: 1rem;
        `;
        errorDiv.textContent = message;

        // Insérer le message dans la boîte d'authentification
        const authBox = document.querySelector('.auth-box');
        authBox.insertBefore(errorDiv, authBox.firstChild);

        // Supprimer le message après 5 secondes
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// firebase-init.js - Configuration Firebase
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Initialiser les services Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Créer l'instance du gestionnaire d'authentification
const authManager = new AuthManager();