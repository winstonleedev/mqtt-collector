// Selects rabbitMQ with least connection
'use strict';
require('dotenv').config();
const _ = require('lodash');
const request = require('request');
const async = require('async');

const rabbitUsername = process.env.RABBIT_USERNAME || 'guest';
const rabbitPassword = process.env.RABBIT_PASSWORD || 'guest';

/**
 * hosts: array of hosts to query from
 * type: type of least connection to select, available types:
 *    'publisher': when called from mosca
 *    'subscriber': when called from collector
 * success: connection callback, takes one parameter - hostname of selected node
 */
module.exports.selectRabbit = function (hosts, type, success, failure) {
    var onceSuccess = _.once(success);
    
    function _selectLeastConnectedNode(allCount, typeCount) {
        // Add back nodes with zero connections
        var leastConnectedCount, leastConnectedNode;
        _.forEach(allCount, (value, key) => {

            if (!typeCount[key]) {
                typeCount[key] = 0;
            }

            // Select node with least connections
            if (leastConnectedCount === undefined) {
                leastConnectedCount = value;
            }

            if (leastConnectedCount >= typeCount[key]) {
                leastConnectedCount = typeCount[key];
                leastConnectedNode = key;
            }
        });
        return leastConnectedNode;
    }

    function _extractHostName(longNodeName) {
        return longNodeName.split('@')[1];
    }

    function _selectNode(queuesInfo, nodesInfo, type, cb) {
        if (queuesInfo && queuesInfo.length) {
            // Count of all types of conection to all nodes
            // Example: Object {rabbit@rabbit1: 2, rabbit@rabbit2: 1, rabbit@rabbit3: 1}
            var allCount = _.countBy(nodesInfo, (node) => node.name);
            if (type === 'publisher') {
                // Mosca makes non-durable queues, keep durable queues
                _.remove(queuesInfo, (node) => node.durable === true);
            } else {
                // We use durable queues in consumers
                _.remove(queuesInfo, (node) => node.durable === false);
            }
            // Count of only the connection type we want
            var typeCount = _.countBy(queuesInfo, (node) => node.node);

            var leastConnectedNode = _selectLeastConnectedNode(allCount, typeCount);
            var leastConnectedNodeName = _extractHostName(leastConnectedNode);
            cb(leastConnectedNodeName);
        } else {
            // Nothing from API, connects to a random node
            cb(hosts[_.random(0, hosts.length - 1)]);
        }
    }

    function _callApi(url, host, cb) {
        request({
            url: url,
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                cb(body);
            } else {
                cb(error);
            }
        });
    }

    function _callQueueApi(host, cb) {
        const url = `http://${rabbitUsername}:${rabbitPassword}@${host}:15672/api/queues`;
        _callApi(url, host, cb);
    }

    function _callNodesApi(host, cb) {
        const url = `http://${rabbitUsername}:${rabbitPassword}@${host}:15672/api/nodes`;
        _callApi(url, host, cb);
    }

    function _getNodesInfo(hosts, type) {
        async.some(hosts, (host, someCallback) => {
            async.waterfall([
                (callback) => {
                    _callQueueApi(host, (queuesInfo) => callback(null, queuesInfo));
                },
                (queuesInfo, callback) => {
                    _callNodesApi(host, (nodesInfo) => callback(null, queuesInfo, nodesInfo));
                },
                (queuesInfo, nodesInfo, callback) => {
                    _selectNode(queuesInfo, nodesInfo, type, (selectedHost) => onceSuccess(selectedHost));
                    someCallback(null, true);
                    callback(null);
                }
            ]);
        }, (err, result) => {
            if ((err || !result) && failure) {
                failure(err);
            }
        });
    }

    _getNodesInfo(hosts, type);
};