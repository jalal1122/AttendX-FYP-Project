import { afterAll, afterEach, beforeAll } from "@jest/globals";
import { clearDatabase, closeDatabase, connect } from "./db.js";

beforeAll(connect);
afterEach(clearDatabase);
afterAll(closeDatabase);