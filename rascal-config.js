module.exports = {
    vhosts: {
        '/': {
            connection: [
                // Run on real machine
                // 'amqp://guest:guest@localhost:5672',
                // 'amqp://guest:guest@localhost:5673',
                // 'amqp://guest:guest@localhost:5674'
                // Run in docker
                'amqp://guest:guest@rabbit1:5672',
                'amqp://guest:guest@rabbit2:5672',
                'amqp://guest:guest@rabbit3:5672'
            ],
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
}