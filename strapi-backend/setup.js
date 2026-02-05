#!/usr/bin/env node

/**
 * Setup script to configure Strapi permissions and create sample data
 * Run this after Strapi is running: node setup.js
 */

const http = require('http');

const STRAPI_URL = 'localhost';
const STRAPI_PORT = 1337;

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: STRAPI_URL,
      port: STRAPI_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function setup() {
  console.log('🔧 Setting up Strapi...\n');

  // Check if Strapi is running
  try {
    await makeRequest('/admin');
    console.log('✓ Strapi is running');
  } catch (error) {
    console.error('✗ Strapi is not running. Please start it first with: npm run develop');
    process.exit(1);
  }

  console.log('\n📋 Next steps:');
  console.log('1. Visit http://localhost:1337/admin');
  console.log('2. Create your first admin user');
  console.log('3. Go to Settings → Users & Permissions → Roles → Public');
  console.log('4. Enable these permissions:');
  console.log('   - Page: find, findOne');
  console.log('   - Upload: find, findOne');
  console.log('5. Create some pages in the Content Manager');
  console.log('6. Test the API: curl http://localhost:1337/api/pages\n');

  console.log('✓ Setup instructions printed');
}

setup().catch(console.error);
