#!/usr/bin/env node

/**
 * Script to inject Firebase configuration into the service worker
 * Reads from environment variables and updates the service worker file
 * 
 * Usage:
 *   node scripts/inject-firebase-config.js
 * 
 * Environment variables required:
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceWorkerPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');

// Check if file exists
if (!fs.existsSync(serviceWorkerPath)) {
  console.error('❌ Service worker file not found:', serviceWorkerPath);
  process.exit(1);
}

// Read the service worker file
let content = fs.readFileSync(serviceWorkerPath, 'utf8');

// Get project ID first
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;
const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

// Define replacements
const replacements = {
  'YOUR_API_KEY': process.env.VITE_FIREBASE_API_KEY,
  'YOUR_SENDER_ID': process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  'YOUR_APP_ID': process.env.VITE_FIREBASE_APP_ID,
};

// Replace standalone YOUR_PROJECT_ID first
if (projectId) {
  content = content.replace(/projectId:\s*"YOUR_PROJECT_ID"/g, `projectId: "${projectId}"`);
}

// Replace compound strings with correct values
if (authDomain) {
  content = content.replace(/authDomain:\s*"YOUR_PROJECT_ID\.firebaseapp\.com"/g, `authDomain: "${authDomain}"`);
}

if (storageBucket) {
  content = content.replace(/storageBucket:\s*"YOUR_PROJECT_ID\.appspot\.com"/g, `storageBucket: "${storageBucket}"`);
}

// Replace other placeholders
for (const [key, value] of Object.entries(replacements)) {
  if (value) {
    content = content.replace(new RegExp(`"${key}"`, 'g'), `"${value}"`);
  } else {
    console.warn(`⚠️  Missing environment variable for: ${key}`);
  }
}

// Check if any placeholders remain
const hasPlaceholders = content.includes('YOUR_API_KEY') || 
                        content.includes('YOUR_PROJECT_ID') ||
                        content.includes('YOUR_SENDER_ID') ||
                        content.includes('YOUR_APP_ID');

if (hasPlaceholders) {
  console.warn('⚠️  Warning: Some placeholders were not replaced. Make sure all environment variables are set.');
  console.warn('   Required variables:');
  console.warn('   - VITE_FIREBASE_API_KEY');
  console.warn('   - VITE_FIREBASE_AUTH_DOMAIN');
  console.warn('   - VITE_FIREBASE_PROJECT_ID');
  console.warn('   - VITE_FIREBASE_STORAGE_BUCKET');
  console.warn('   - VITE_FIREBASE_MESSAGING_SENDER_ID');
  console.warn('   - VITE_FIREBASE_APP_ID');
  process.exit(1);
}

// Write the updated content back
fs.writeFileSync(serviceWorkerPath, content);
console.log('✅ Firebase service worker configured successfully!');
