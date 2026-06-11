import cassandra from "cassandra-driver";

const keyspace = process.env.CASSANDRA_KEYSPACE || "tsmchat";

const initClient = new cassandra.Client({
  contactPoints: (process.env.CASSANDRA_HOSTS || "localhost").split(","),
  localDataCenter: process.env.CASSANDRA_DATACENTER || "datacenter1",
  protocolOptions: {
    port: parseInt(process.env.CASSANDRA_PORT || "9042")
  }
});

const client = new cassandra.Client({
  contactPoints: (process.env.CASSANDRA_HOSTS || "localhost").split(","),
  localDataCenter: process.env.CASSANDRA_DATACENTER || "datacenter1",
  keyspace,
  protocolOptions: {
    port: parseInt(process.env.CASSANDRA_PORT || "9042")
  },
  queryOptions: {
    consistency: cassandra.types.consistencies.localOne,
    prepare: true
  }
});

export async function initCassandra() {
  try {
    await initClient.connect();

    await initClient.execute(`
      CREATE KEYSPACE IF NOT EXISTS ${keyspace}
      WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 1
      }
    `);

    await initClient.execute(`
      CREATE TABLE IF NOT EXISTS ${keyspace}.messages (
        room_id       TEXT,
        created_at    TIMESTAMP,
        message_id    TIMEUUID,
        sender_id     TEXT,
        sender_name   TEXT,
        sender_avatar_text TEXT,
        sender_avatar_url  TEXT,
        text          TEXT,
        PRIMARY KEY (room_id, created_at, message_id)
      ) WITH CLUSTERING ORDER BY (created_at DESC, message_id DESC)
    `);

    await initClient.shutdown();

    await client.connect();
    console.log("Cassandra connected (keyspace and tables ready)");
  } catch (err) {
    console.error("Cassandra connection failed:", err.message);
    console.warn("Continuing without Cassandra — will retry on queries");
  }
}

export default client;
