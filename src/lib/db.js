import {Db} from "sqlite-helper"
import config from "../config/db.js"


const db = new Db(config);


export default db;