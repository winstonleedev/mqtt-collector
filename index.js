#!/usr/bin/env node
'use strict';
require('dotenv').config();
const amqp = require('amqplib/callback_api');
const mongoose = require('mongoose');
const containerized = require('containerized');
const debug = require('debug')('collector');

// Configure host name for mongo and AMQP
var defaultHost = 'localhost';
if (containerized()) {
  defaultHost = '172.17.0.1';
}

const mongodbHost = process.env.MONGODB_HOST || defaultHost;
const amqpHost = process.env.AMQP_HOST || defaultHost;

console.log('MongoDB host: ', mongodbHost);
console.log('AMQP host: ', amqpHost);

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

const topic = '#';
const exchange = 'mosca';

amqp.connect('amqp://' + amqpHost, function(err, conn) {
    if (err || !conn) {
        return;
    }

    conn.createChannel(function(err, ch) {

        // ch.assertExchange(ex, 'topic', {durable: false})
        ch.assertQueue('collector-1', {exclusive: false, durable: true}, function(err, queueInfo) {
            debug('Waiting for messages, to exit press ctrl + C', queueInfo.queue);
            ch.bindQueue(queueInfo.queue, exchange, topic);
            ch.consume(queueInfo.queue, function(msg) {
                debug('msg received :', msg.content.toString());
                let logEntry = new LogEntry({
                    _id: '' + Date.now() + Math.ceil(Math.random() * 100),
                    topic: msg.fields.routingKey,
                    payload: msg.content.toString()
                });

                // Skip system messages
                if (msg.fields.routingKey.indexOf('$') >= 0) {
                    ch.ack(msg);
                    return;
                }

                logEntry.save((err, doc) => {
                    if (err) {
                        debug('Error saving:', err);
                    }
                    debug('Saved to mongo, doc:', err, doc);
                    ch.ack(msg);
                });
            }, {noAck: false});
        });
    });
});
