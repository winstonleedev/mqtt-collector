# MQTT Collector

* Collects MQTT messages from RabbitMQ and save them to MongoDB, used in [mqtt-rabbitmq-cluster](https://github.com/thanhphu/mqtt-rabbitmq-cluster).
* Uses [Rascal](https://github.com/guidesmiths/rascal) to connect to the cluster, provide high availability since Rascal automatically retry connections and provide sensible defaults for connecting to RabbitMQ
* In addition to Rascal, have logic to select least connected to RabbitMQ server by querying RabbitMQ's management API (requires management module installed)
* Rascal also provide mappings inside config instead of code, providing better readability

# Usage
Prequisities (should be installed and started first)
* MongoDB
* RabbitMQ

Fast way
```
docker run -d thanhphu/mqtt-rabbitmq
```

Slow way
```
pnpm i
node index.js
```

By default, connects to RabbitMQ cluster on `localhost:5672, localhost:5673, localhost:5674` and writes to MongoDB on `localhost:32717`

## Editing config
```
vi rascal-config.js
```

```js
module.exports = {
    vhosts: {
        '/': {
            // Hosts
            connection: [ 
                'amqp://guest:guest@localhost:5672',
                'amqp://guest:guest@localhost:5673',
                'amqp://guest:guest@localhost:5674'
            ],
            // Declare exchanges and their options
            exchanges: {
                'mosca': {
                    assert: false,
                    check: false
                }
            },
            // Declare queues
            queues: ['collector'],
            // Declare bindings
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
```
# Branches
* **master** connects to RabbitMQ
* **kafka** uses Kafka instead of RabbitMQ
# License
[ISC](LICENSE.txt)