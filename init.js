import db from '#src/lib/db'
import path from "path";

await db.migration(path.join(process.cwd(),'src', 'model'));