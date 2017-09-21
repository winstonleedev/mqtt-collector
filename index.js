#!/usr/bin/env node
'use strict';
// Receive message with 'thanhphu.topic' from 'mosca' queue
var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function(err, conn) {
    conn.createChannel(function(err, ch) {
        let ex = 'mosca';

        // ch.assertExchange(ex, 'topic', {durable: false})
        ch.assertQueue('', {exclusive: false}, function(err, q) {
            console.log(' Waiting for messages, to exit press ctrl + C', q.queue);
            ch.bindQueue(q.queue, ex, 'thanhphu.topic');
            console.log('in assertQueue.');
            ch.consume(q.queue, function(msg) {
                console.log('msg:%s', msg.content.toString());
                setTimeout(function() {
                    console.log('finish consume.');
                    ch.ack(msg);    
                }, 2000);
            }, {noAck: false});
        });
    });
});