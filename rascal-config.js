'use strict';
const _ = require('lodash');

const hosts = [
    // Run on real machine
    // 'amqp://guest:guest@localhost:5672',
    // 'amqp://guest:guest@localhost:5673',
    // 'amqp://guest:guest@localhost:5674'
    // Run in docker
    // 'amqp://guest:guest@rabbit1:5672',
    // 'amqp://guest:guest@rabbit2:5672',
    // 'amqp://guest:guest@rabbit3:5672'
    'rabbit1',
    'rabbit2',
    'rabbit3'
];

function exportConfig(hostToUse) {
    if (!hostToUse) {
        hostToUse = _.map(hosts, (hostName) => `amqp://guest:guest@${hostName}:5672`);
    } else {
        hostToUse = `amqp://guest:guest@${hostToUse}:5672`;
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