'use strict';
require('dotenv').config();
const _ = require('lodash');

const rabbitUsername = process.env.RABBIT_USERNAME || 'guest';
const rabbitPassword = process.env.RABBIT_PASSWORD || 'guest';

// Takes AMQP host list from env variables, otherwise use default
const hosts = (process.env.AMQP_HOST) ? process.env.AMQP_HOST.split(',') : [
    // Run on real machine
    // 'amqp://guest:guest@localhost:5672',
    // 'amqp://guest:guest@localhost:5673',
    // 'amqp://guest:guest@localhost:5674'

    // Run in docker, or real machine with alias in hosts
    'rabbit1',
    'rabbit2',
    'rabbit3'
];

function makeRabbitHostName(hostName) {
    return `amqp://${rabbitUsername}:${rabbitPassword}@${hostName}:5672`;
}

function exportConfig(hostToUse) {
    if (!hostToUse) {
        hostToUse = _.map(hosts, makeRabbitHostName);
    } else if (Array.isArray(hostToUse)) {
        hostToUse = _.map(hostToUse, makeRabbitHostName);
    } else {
        hostToUse = makeRabbitHostName(hostToUse);
    }
    return {
        vhosts: {
            '/': {
                connection: hostToUse,
                exchanges: {
                    'mosca': {
                        assert: false,
                        check: false
                    }
                },
                queues: ['collector'],
                bindings: [
                    'mosca[#] -> collector'
                ],
                subscriptions: {
                    's1': {
                        'queue': 'collector'
                    }
                }
            }
        }
    };
}

module.exports.hosts = hosts;

module.exports.withRabbit = (host) => exportConfig(host);

module.exports.default = exportConfig();