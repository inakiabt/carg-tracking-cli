'use strict';

let fs = require('fs');
let Promise = require('bluebird');
let request = require('request-promise');
let drawInIterm = require('iterm2-image');
let prompt = require('prompt');
let tabletojson = require('tabletojson');
let Table = require('cli-table');
let _ = require('underscore');

let req = request.defaults({
    jar: true, // save cookies to jar
    rejectUnauthorized: false,
    followAllRedirects: true // allow redirections
});

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
        prompt.get(['captcha'], (err, result) => {
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

function showTrackingInfo(body) {
    return new Promise((resolve, reject) => {
        if (body === 'captcha_error') {
            reject('Invalid captcha');
            return;
        }

        let tablesAsJson = tabletojson.convert(body)[0];
        let keys = Object.keys(tablesAsJson[0]).filter(v => v !== 'Acción');
        let table = new Table({ head: keys });

        tablesAsJson.forEach(val => table.push(_.values(_.omit(val, 'Acción'))));

        console.log('Results:');
        console.log(table.toString());
    });
}

exports.track = function(trackingId) {

    console.log('Getting Tracking for %s', trackingId);
    getImage()
        .then(resolveCaptcha)
        .then(getTrackingInfo.bind(null, trackingId))
        .then(showTrackingInfo)
        .catch(err => console.error(err))
};
