import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        // extend: {
        //     fontFamily: {
        //         sans: ['Figtree', ...defaultTheme.fontFamily.sans],
        //     },
        // },
                extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
                //sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                primary: {
                    50:  '#e6ebf5', 100: '#cdd7eb', 200: '#9cb0d8',
                    300: '#6a88c4', 400: '#3961b1', 500: '#1e4896',
                    600: '#0C3173', 700: '#092557', 800: '#06193a',
                    900: '#030c1d',
                },
                sky: {
                    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd',
                    300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9',
                },
                nara: {
                    bg:     '#f0f4ff', card:   '#ffffff', bubble: '#eef2ff',
                    text:   '#1e1b4b', muted:  '#6b7280', border: '#e0e7ff',
                }
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            boxShadow: {
                'soft-sm': '0 2px 8px rgba(99,102,241,0.08)',
                'soft':    '0 4px 24px rgba(99,102,241,0.12)',
                'soft-lg': '0 8px 40px rgba(99,102,241,0.18)',
                'glow':    '0 0 24px rgba(99,102,241,0.35)',
                'glow-lg': '0 0 48px rgba(99,102,241,0.45)',
            },
            animation: {
                'fade-up':   'fadeUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
                'scale-in':  'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
                'bounce-dot':'bounceDot 1.1s infinite',
                'pulse-ring':'pulseRing 2s ease-in-out infinite',
                'ripple':    'ripple 1.6s ease-out infinite',
                'float':     'float 3s ease-in-out infinite',
                'wave-bar':  'waveBar 1s ease-in-out infinite',
                'spin-slow': 'spin 3s linear infinite',
            },
            keyframes: {
                fadeUp: {
                    'from': { opacity: '0', transform: 'translateY(10px) scale(0.96)' },
                    'to':   { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                scaleIn: {
                    'from': { opacity: '0', transform: 'scale(0.93) translateY(16px)' },
                    'to':   { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
                bounceDot: {
                    '0%,60%,100%': { transform: 'translateY(0)', opacity: '0.4' },
                    '30%':          { transform: 'translateY(-6px)', opacity: '1' },
                },
                pulseRing: {
                    '0%,100%': { transform: 'scale(1)', opacity: '0.8' },
                    '50%':     { transform: 'scale(1.06)', opacity: '0.4' },
                },
                ripple: {
                    '0%':   { transform: 'scale(1)', opacity: '0.6' },
                    '100%': { transform: 'scale(1.5)', opacity: '0' },
                },
                float: {
                    '0%,100%': { transform: 'translateY(0px)' },
                    '50%':     { transform: 'translateY(-6px)' },
                },
                waveBar: {
                    '0%,100%': { transform: 'scaleY(0.4)' },
                    '50%':     { transform: 'scaleY(1)' },
                },
            },
        },

    },

    plugins: [forms],
};
