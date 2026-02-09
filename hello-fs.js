const fs = require('fs');
console.log("FS is working. CWD:", process.cwd());
try {
    const files = fs.readdirSync('.');
    console.log("Files:", files.length);
} catch (e) {
    console.error("FS Error:", e);
}
