-- TSMChat PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(128) PRIMARY KEY,
  google_sub    VARCHAR(255) UNIQUE,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE,
  avatar_url    TEXT DEFAULT '',
  avatar_text   VARCHAR(10) DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub);

CREATE TABLE IF NOT EXISTS chatrooms (
  id            VARCHAR(128) PRIMARY KEY,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
  name          VARCHAR(255) NOT NULL,
  created_by    VARCHAR(128) REFERENCES users(id),
  last_message  TEXT DEFAULT '',
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatrooms_updated ON chatrooms (updated_at DESC);

CREATE TABLE IF NOT EXISTS chatroom_members (
  room_id       VARCHAR(128) REFERENCES chatrooms(id) ON DELETE CASCADE,
  user_id       VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_user ON chatroom_members (user_id);
