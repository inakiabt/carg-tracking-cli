#!/usr/bin/env node

var trackingId = process.argv[2];

if (!trackingId) {
    console.error('Invalid tracking id');
    return;
}

require('../lib/index.js').track(trackingId);
