import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

// 项目根目录
export const dbPath = "./db/data.json";

interface DB {
  users: User[];
  keys: UserKey[];
}

interface User {
  id: number;
  username: string;
  password: string;
  seededPassword: string;
}

interface UserKey {
  userId: number;
  key: string;
}

const adapter = new JSONFile<DB>(dbPath);
const db = new Low<DB>(adapter, {
  users: [],
  keys: [],
});

export default db;
