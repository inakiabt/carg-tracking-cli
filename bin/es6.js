#!/usr/bin/env node

const trackingId = process.argv[2];

if (!trackingId) {
    console.error('Invalid tracking id');
    return;
}

require('../src/index.js').track(trackingId);
