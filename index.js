#!/usr/bin/env node
'use strict';
require('dotenv').config();
const _ = require('lodash');
const mongoose = require('mongoose');
const containerized = require('containerized');
const debug = require('debug')('collector');
const kafka = require('kafka-node');

// Configure host name for mongo and Kafka
var defaultHost = 'localhost';
if (containerized()) {
    defaultHost = '172.17.0.1';
}

const mongodbHost = process.env.MONGODB_HOST || defaultHost;
const kafkaHost = process.env.KAFKA_HOST || (defaultHost + ':2181');

console.log('MongoDB host: ', mongodbHost);
console.log('Kafka host: ', kafkaHost);

// Kafka consumer init
const topic = 'thanhphu_topic';

const client = new kafka.Client(
    kafkaHost
);
const Consumer = kafka.Consumer;
const consumer = new Consumer(
    client,
    [
    ],
    {
        autoCommit: false
    }
);

// Mongoose init
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://' + mongodbHost + '/collector', {
    useMongoClient: true
});

const LogEntry = mongoose.model('Log entry', new mongoose.Schema({
    _id: Number,
    // time: {type: Date, default: Date.now()},
    topic: String,
    payload: String
}, {
    collection: 'log'
}));

// List topics
client.once('connect', function () {
	client.loadMetadataForTopics([], function (error, results) {
	  if (error) {
	  	return console.error(error);
	  }
	  console.log('%j', _.get(results, '1.metadata'));
	});
});

// Add topics to consumer
consumer.addTopics([topic], function (err, added) {
    if (err) {
        debug('Error subscribing to topic: ', err);
        process.exit(1);
    } else {
        debug('Topic added: ', topic, added);
        consumer.on('message', function(msg) {
            debug('msg received :', msg);
            let logEntry = new LogEntry({
                _id: '' + Date.now() + Math.ceil(Math.random() * 100),
                topic: msg.topic,
                payload: msg.value.toString()
            });
        
            logEntry.save((err, doc) => {
                if (err) {
                    debug('Error saving:', err);
                }
                debug('Saved to mongo, doc:', err, doc);
            });
        });        
    }
});

