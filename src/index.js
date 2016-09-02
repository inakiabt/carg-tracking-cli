'use strict';

const Promise = require('bluebird');
const request = require('request-promise');
const drawInIterm = require('iterm2-image');
let prompt = require('prompt');
const tabletojson = require('tabletojson');
const Table = require('cli-table');
const _ = require('underscore');

const req = request.defaults({
    jar: true, // save cookies to jar
    rejectUnauthorized: false,
    followAllRedirects: true // allow redirections
});

prompt.message = '';
prompt.delimiter = '';

function getImage() {
    return new Promise((resolve, reject) => {
        req.get({
                url: 'http://www.correoargentino.com.ar/sites/all/modules/custom/ca_forms_core/captcha/securimage/securimage_show.php',
                headers: {
                    'Accept': 'image/webp,image/*,*/*;q=0.8',
                    'Referer': 'http://www.correoargentino.com.ar/formularios/oidn'
                }
            })
            .on('response', res => {
                drawInIterm(res, err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
    });
}

function resolveCaptcha() {
    return new Promise((resolve, reject) => {
        prompt.start();
        prompt.get({
            properties: {
                captcha: {
                    description: 'Captcha (case sensitive):',
                    required: true
                }
            }
        }, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(result.captcha);
        });
    });
}

function getTrackingInfo(trackingId, captcha) {
    return req.post({
        url: 'http://www.correoargentino.com.ar/sites/all/modules/custom/ca_forms/api/wsFacade.php',
        form: {
            id: trackingId,
            ct_captcha: captcha.toLowerCase().trim(),
            action: 'oidn'
        }
    });
}

function showInternationalTrackingInfo(tablesAsJson) {
    return new Promise((resolve) => {
        console.log('International:');
        let keys = Object.keys(tablesAsJson[0]).filter(v => v !== 'Acción');
        let table = new Table({
            head: keys
        });

        tablesAsJson.forEach(val => table.push(_.values(_.omit(val, 'Acción'))));

        console.log(table.toString());

        resolve();
    });
}

function showNationalTrackingInfo(tablesAsJson) {
    return new Promise((resolve) => {
        if (!tablesAsJson) {
            resolve();
            return;
        }

        console.log('National:');
        let keys = Object.keys(tablesAsJson[0]);
        let table = new Table({
            head: keys
        });

        tablesAsJson.forEach(val => table.push(_.values(_.omit(val, 'Acción'))));

        console.log(table.toString());

        resolve();
    });
}

function showTrackingInfo(body) {
    return new Promise((resolve, reject) => {
        if (body === 'captcha_error') {
            reject('Invalid captcha');
            return;
        }

        // Shame on you correargentino.com.ar
        const fixedBody = body.replace(/<tbody><td>/g, '<tr><td>').replace(/<\/td><\/tbody>/g, '<\/td></tr>');
        let tablesAsJson = tabletojson.convert(fixedBody);

        if (tablesAsJson.length === 0) {
            console.log('No results');
            return Promise.resolve();
        }
        console.log('Results:');
        return showInternationalTrackingInfo(tablesAsJson[0])
            .then(() => showNationalTrackingInfo(tablesAsJson[1]));
    });
}

exports.track = function(trackingId) {

    console.log('Getting Tracking for %s', trackingId);
    getImage()
        .then(resolveCaptcha)
        .then(getTrackingInfo.bind(null, trackingId))
        .then(showTrackingInfo)
        .catch(err => console.error(err));
};
