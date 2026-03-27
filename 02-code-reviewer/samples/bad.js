const DB_PASSWORD = "admin123";   // hardcoded secret

async function getUser(id) {
    const query = "SELECT * FROM users WHERE id = " + id;  // SQL injection
    const result = await db.query(query);
    return result;                  // no null check
}

function processItems(items) {
    let total = 0;
    for (let i = 0; i <= items.length; i++) {   // off-by-one: <= should be 
        total = total + items[i].value;
    }
    return total;
}

const password = "supersecret";   // another hardcoded secret