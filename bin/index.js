#!/usr/bin/env node

var trackingId = process.argv[2];

if (!trackingId) {
    console.error('Invalid tracking id');
    return;
}

var lib = require('../lib/index.js');
lib.track(trackingId);
