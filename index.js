#!/usr/bin/env node
'use strict';
require('dotenv').config();
const amqp = require('amqplib/callback_api');
const mongoose = require('mongoose');
const containerized = require('containerized');

var host = 'localhost';

if (containerized()) {
  host = '172.17.0.1';
}

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://' + host + '/collector');

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


amqp.connect('amqp://' + host, function(err, conn) {
    conn.createChannel(function(err, ch) {

        // ch.assertExchange(ex, 'topic', {durable: false})
        ch.assertQueue('', {exclusive: false}, function(err, queueInfo) {
            console.log('Waiting for messages, to exit press ctrl + C', queueInfo.queue);
            ch.bindQueue(queueInfo.queue, exchange, topic);
            ch.consume(queueInfo.queue, function(msg) {
                console.log('msg received :', msg.content.toString());
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
                    console.log('Saved to mongo, err + doc:', err, doc);
                    ch.ack(msg);
                });
            }, {noAck: false});
        });
    });
});