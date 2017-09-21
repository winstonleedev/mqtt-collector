#!/usr/bin/env node
'use strict';
require('dotenv').config();
const amqp = require('amqplib/callback_api');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/collector');

const LogEntry = mongoose.model('Log entry', new mongoose.Schema({
    _id: Number,
    // time: {type: Date, default: Date.now()},
    topic: String,
    payload: String
}, {collection: 'log'}));

const topic = '#';
const exchange = 'mosca';

amqp.connect('amqp://localhost', function(err, conn) {
    conn.createChannel(function(err, ch) {

        // ch.assertExchange(ex, 'topic', {durable: false})
        ch.assertQueue('', {exclusive: false}, function(err, q) {
            console.log('Waiting for messages, to exit press ctrl + C', q.queue);
            ch.bindQueue(q.queue, exchange, topic);
            ch.consume(q.queue, function(msg) {
                console.log('msg received :', msg.content.toString());
                let logEntry = new LogEntry({
                    _id: '' + Date.now() + Math.ceil(Math.random() * 1000),
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