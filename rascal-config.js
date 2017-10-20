module.exports = {
    vhosts: {
        '/': {
            connection: [
                'amqp://guest:guest@localhost:5672',
                'amqp://guest:guest@localhost:5673',
                'amqp://guest:guest@localhost:5674'
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