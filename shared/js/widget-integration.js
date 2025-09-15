// shared/js/widget-integration.js
const WIDGET_CONFIGS = {
  gloriafood: {
    script: 'https://www.gloriafood.com/ordering-widget/js/onlineoredring.min.js',
    init: (config) => {
      window.gfWidgetOptions = {
        restaurant: config.restaurant_id,
        primary_color: config.primary_color,
        theme: config.theme || 'light'
      };
    }
  },
  fresha: {
    script: 'https://widget.fresha.com/widget.js',
    init: (config) => {
      window.FreshaWidget = {
        businessId: config.business_id,
        theme: config.theme || 'light',
        language: config.language || 'fr'
      };
    }
  },
  calendly: {
    script: 'https://assets.calendly.com/assets/external/widget.js',
    init: (config) => {
      window.CalendlyConfig = {
        url: config.calendly_url,
        theme: config.theme || 'light',
        prefill: config.prefill || {}
      };
    }
  }
};