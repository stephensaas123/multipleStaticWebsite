// utils.js - Fonctions utilitaires partagées

// Utilitaires de validation
const ValidationUtils = {
    // Valider un email
    isValidEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Valider un numéro de téléphone français
    isValidPhone: function(phone) {
        const phoneRegex = /^(?:(?:\+33|0)[1-9](?:[0-9]{8}))$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    },

    // Valider une URL
    isValidURL: function(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    // Valider un business ID
    isValidBusinessId: function(businessId) {
        const businessIdRegex = /^[a-z0-9_-]+$/;
        return businessIdRegex.test(businessId) && businessId.length >= 3 && businessId.length <= 50;
    }
};

// Utilitaires de formatage
const FormatUtils = {
    // Formater un prix
    formatPrice: function(price) {
        if (!price) return '';
        const numPrice = parseFloat(price);
        return isNaN(numPrice) ? price : numPrice.toFixed(2) + '€';
    },

    // Formater un numéro de téléphone pour l'affichage
    formatPhone: function(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        
        // Format français : 01 23 45 67 89
        if (cleaned.startsWith('33')) {
            const withoutCountry = cleaned.substring(2);
            return withoutCountry.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '0$1 $2 $3 $4 $5');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
        }
        
        return phone;
    },

    // Formater une adresse pour l'affichage
    formatAddress: function(address) {
        if (!address) return '';
        return address.replace(/\n/g, '<br>');
    },

    // Formater une date
    formatDate: function(date) {
        if (!date) return '';
        
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    // Formater une heure
    formatTime: function(time) {
        if (!time) return '';
        return time.replace(/(\d{2})h(\d{2})/, '$1:$2');
    },

    // Tronquer un texte
    truncateText: function(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
};

// Utilitaires d'image
const ImageUtils = {
    // Redimensionner une image
    resizeImage: function(file, maxWidth, maxHeight, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                // Calculer les nouvelles dimensions
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    },

    // Générer une miniature
    generateThumbnail: function(file, size = 150) {
        return this.resizeImage(file, size, size, 0.7);
    },

    // Valider le type d'image
    isValidImageType: function(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        return validTypes.includes(file.type);
    },

    // Valider la taille du fichier
    isValidFileSize: function(file, maxSizeMB = 5) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxSizeBytes;
    }
};

// Utilitaires DOM
const DOMUtils = {
    // Échapper le HTML
    escapeHTML: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Créer un élément avec attributs
    createElement: function(tag, attributes = {}, textContent = '') {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'class') {
                element.className = attributes[key];
            } else if (key === 'data') {
                Object.keys(attributes[key]).forEach(dataKey => {
                    element.dataset[dataKey] = attributes[key][dataKey];
                });
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    },

    // Afficher un modal simple
    showModal: function(title, content, onConfirm = null) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.escapeHTML(title)}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${onConfirm ? '<button class="btn-primary modal-confirm">Confirmer</button>' : ''}
                    <button class="btn-secondary modal-cancel">Fermer</button>
                </div>
            </div>
        `;

        // Styles du modal
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.querySelector('.modal-content').style.cssText = `
            background: white;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        modal.querySelector('.modal-header').style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #eee;
        `;

        modal.querySelector('.modal-body').style.cssText = `
            padding: 1rem;
        `;

        modal.querySelector('.modal-footer').style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            padding: 1rem;
            border-top: 1px solid #eee;
        `;

        // Event listeners
        const closeModal = () => document.body.removeChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
        
        if (onConfirm) {
            modal.querySelector('.modal-confirm').addEventListener('click', () => {
                onConfirm();
                closeModal();
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        document.body.appendChild(modal);
        return modal;
    },

    // Afficher une notification toast
    showToast: function(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', color: '#155724' },
            error: { bg: '#f8d7da', border: '#f5c6cb', color: '#721c24' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', color: '#856404' },
            info: { bg: '#d1ecf1', border: '#bee5eb', color: '#0c5460' }
        };

        const style = colors[type] || colors.info;

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 5px;
            border: 1px solid ${style.border};
            background: ${style.bg};
            color: ${style.color};
            z-index: 10001;
            max-width: 400px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        `;

        // Animation CSS
        if (!document.getElementById('toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'toast-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);

        return toast;
    }
};

// Utilitaires de localStorage avec fallback
const StorageUtils = {
    // Sauvegarder des données
    setItem: function(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.warn('localStorage non disponible:', error);
            return false;
        }
    },

    // Récupérer des données
    getItem: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Erreur lors de la lecture du localStorage:', error);
            return defaultValue;
        }
    },

    // Supprimer un élément
    removeItem: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Erreur lors de la suppression du localStorage:', error);
            return false;
        }
    },

    // Vider le localStorage
    clear: function() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.warn('Erreur lors du nettoyage du localStorage:', error);
            return false;
        }
    }
};

// Utilitaires de performance
const PerformanceUtils = {
    // Debounce une fonction
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle une fonction
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Lazy loading pour les images
    lazyLoadImages: function(selector = 'img[data-src]') {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll(selector).forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback pour les anciens navigateurs
            document.querySelectorAll(selector).forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }
};

// Export global pour le navigateur
if (typeof window !== 'undefined') {
    window.ValidationUtils = ValidationUtils;
    window.FormatUtils = FormatUtils;
    window.ImageUtils = ImageUtils;
    window.DOMUtils = DOMUtils;
    window.StorageUtils = StorageUtils;
    window.PerformanceUtils = PerformanceUtils;
}

// Export pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ValidationUtils,
        FormatUtils,
        ImageUtils,
        DOMUtils,
        StorageUtils,
        PerformanceUtils
    };
}