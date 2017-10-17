#!/usr/bin/env node
'use strict';
require('dotenv').config();
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
const topic = 'thanhphu/topic';

const Consumer = kafka.Consumer;
const client = new kafka.Client(
    kafkaHost
);
const consumer = new Consumer(
    client,
    [
        {
            topic: topic,
            partition: 0
        },
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

consumer.addTopics([topic], function (err, added) {
    if (err) {
        debug('Error adding topic: ', err);
    } else {
        debug('Topic added: ', topic, added);
    }
});

consumer.on('message', function(msg) {
    debug('msg received :', msg.toString());
    let logEntry = new LogEntry({
        _id: '' + Date.now() + Math.ceil(Math.random() * 100),
        topic: 'dummy-topic',
        payload: msg.toString()
    });

    logEntry.save((err, doc) => {
        if (err) {
            debug('Error saving:', err);
        }
        debug('Saved to mongo, doc:', err, doc);
    });
});
