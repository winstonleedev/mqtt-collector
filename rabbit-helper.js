// Selects rabbitMQ with least connection
'use strict';
require('dotenv').config();
const _ = require('lodash');
const request = require('request');
const async = require('async');
const storage = require('node-persist');

const rabbitUsername = process.env.RABBIT_USERNAME || 'guest';
const rabbitPassword = process.env.RABBIT_PASSWORD || 'guest';

function extractHostName(longNodeName) {
  return longNodeName.split('@')[1];
}

function selectNode(hosts, queueInfoList, nodeInfoList, connectionInfoList, type, shouldReturnArray) {
  if (_.isEmpty(nodeInfoList)) {
    // Nothing from API, connects to a random node
    return (_.sample(hosts));
  } else if (_.isEmpty(queueInfoList)) {
    let nodeNames = _.uniq(_.map(nodeInfoList, n => extractHostName(n.name)));
    return (_.sample(nodeNames));
  } else {
    // List of all alive nodes
    // nodesCount example: ['rabbit@rabbit1', 'rabbit@rabbit2', 'rabbit@rabbit3']
    let nodeNames = _.uniq(_.map(nodeInfoList, node => node.name));

    // Persist list of nodes for next time
    storage.setItem('hosts', _.map(nodeNames, extractHostName));

    let finalCount;
    if (type === 'publisher') {
      // Mosca makes non-durable queues, keep durable queues
      _.remove(queueInfoList, node => node.durable === true);
      // queueCount example: Object {rabbit@rabbit1: 2, rabbit@rabbit2: 1, rabbit@rabbit3: 3}
      let queueCount = _.countBy(queueInfoList, node => node.node);
      // Add nodes with zero queues
      _.forEach(nodeNames, nodeName => {
        if (!queueCount[nodeName]) {
          queueCount[nodeName] = 0;
        }
      });
      finalCount = queueCount;
    } else {
      // Subscriber logic
      // connectionCount example: Object {rabbit@rabbit1: 2, rabbit@rabbit2: 1, rabbit@rabbit3: 3}
      let connectionCount = _.countBy(connectionInfoList, node => node.node);  
      // Add nodes with zero connections
      _.forEach(nodeNames, nodeName => {
        if (!connectionCount[nodeName]) {
          connectionCount[nodeName] = 0;
        }
      });
      finalCount = connectionCount;
    }

    let finalCountArr = _.map(finalCount, (count, name) => {
      return { name, count };
    });

    let nodesSortedByPrority = _.sortBy(finalCountArr, 'count');
    let result;
    if (shouldReturnArray) {
      result = _.map(nodesSortedByPrority, node => extractHostName(node.name));
    } else {
      let leastConnectedNode = nodesSortedByPrority[0].name;
      result = extractHostName(leastConnectedNode);
    }
    return result;
  }
}

function callApi(url, host, cb) {
  request({
    url: url,
    json: true,
    auth: {
      user: rabbitUsername,
      pass: rabbitPassword,
      sendImmediately: false
    },
    timeout: 3000 // 3 secs
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      cb(null, body);
    } else {
      cb(error, null);
    }
  });
}

function callQueueApi(host, cb) {
  const url = `http://${host}:15672/api/queues`;
  callApi(url, host, cb);
}

function callNodesApi(host, cb) {
  const url = `http://${host}:15672/api/nodes`;
  callApi(url, host, cb);
}

function callConnectionsApi(host, cb) {
  const url = `http://${host}:15672/api/connections`;
  callApi(url, host, cb);
}

function getQueueAndNodeInfo(configHosts, type, onceSuccessCb, failureCb, shouldReturnArray) {
  // console.log('Loading persistence');
  storage.init().then(() => {
    storage.getItem('hosts').then((savedHosts) => {
      // console.log('Persistence loaded, savedHosts:', savedHosts);
      let mergedHosts = _.union(savedHosts, configHosts);
      async.someLimit(mergedHosts, 1, (host, someCallback) => {
        async.waterfall([
          (callback) => {
            // console.log('querying queue, host', host);
            callQueueApi(host, (err, queueInfoList) => callback(err, queueInfoList));
          },
          (queueInfoList, callback) => {
            // console.log('querying nodes');
            callNodesApi(host, (err, nodeInfoList) => callback(err, queueInfoList, nodeInfoList));
          },
          (queueInfoList, nodeInfoList, callback) => {
            // console.log('querying connections');
            callConnectionsApi(host, (err, connectionInfoList) => callback(err, queueInfoList, nodeInfoList, connectionInfoList));
          },
          (queueInfoList, nodeInfoList, connectionInfoList, callback) => {
            let selectedHost = selectNode(configHosts, queueInfoList, nodeInfoList, connectionInfoList, type, shouldReturnArray);
            // console.log('Node selected:', selectedHost);
            onceSuccessCb(selectedHost);
            callback(null);
          }
        ], (err) => {
          someCallback(null, !err);
        });
      }, (err, result) => {
        if ((err || !result) && failureCb) {
          failureCb(err);
        }
      });    
    });
  });
  
}

/**
 * hosts: array of hosts to query from
 * type: type of least connection to select, available types:
 *    'publisher': when called from mosca
 *    'subscriber': when called from collector
 * success: connection callback, takes one parameter - hostname of selected node
 * 
 * Returns the node that currently have the least connection of the specified type
 */
module.exports.selectRabbit = function (hosts, type, successCb, failureCb) {
  let onceSuccessCb = _.once(successCb);
  getQueueAndNodeInfo(hosts, type, onceSuccessCb, failureCb, false);
};

/**
 * Returns a of rabbit nodes sorted by connections from few to many
 */
module.exports.selectRabbits = function (hosts, type, successCb, failureCb) {
  let onceSuccessCb = _.once(successCb);
  getQueueAndNodeInfo(hosts, type, onceSuccessCb, failureCb, true);
};