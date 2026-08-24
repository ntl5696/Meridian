window.FS.utils = {
    computeTextStats: function(text) {
        // Strip HTML tags
        const cleanText = text.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ');
        const trimmed = cleanText.trim();
        if (!trimmed) {
            return { words: 0, characters: 0 };
        }
        
        const words = trimmed.split(/\s+/).length;
        const characters = cleanText.length;
        return { words, characters };
    },

    escapeHtml: function(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    rgbToHex: function(rgb) {
        if (!rgb) return null;
        const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
        if (!match) {
            if (rgb.startsWith('#')) return rgb;
            return null;
        }
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
};
