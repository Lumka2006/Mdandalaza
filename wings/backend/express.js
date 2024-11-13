const express = require('express'); // Import Express library
const mysql = require('mysql2'); // Import MySQL2 library for database connection
const bodyParser = require('body-parser');
const cors = require('cors'); // Import CORS middleware for handling cross-origin requests

const app = express(); // Initialize Express app
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(bodyParser.json());

// MySQL database connection
const db = mysql.createConnection({
    host: 'localhost', // Database host
    user: 'root', // Database user
    password: 'LumkaMdandy@2006', // Database password
    database: 'wings_cafe_inventory' // Name of the database
});

db.connect((err) => {
    if (err) { // If there's an error while connecting to the database
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.'); // Success message when connected
});

// Async function to handle DB queries with Promises
const queryDatabase = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) reject(err);
            resolve(results);
        });
    });
};


// User CRUD endpoints

// GET request to fetch all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await queryDatabase('SELECT * FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST request to create a new user
app.post('/api/users', async (req, res) => {
    const { username, password } = req.body;
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    try {
        await queryDatabase(query, [username, password]);
        res.status(201).json({ message: 'User added successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: Update an existing user
app.put('/api/users/:username', (req, res) => {
    const { username } = req.params;
    const { newUsername, password } = req.body; // Expecting 'newUsername' and 'password' in the request body

    console.log("Request received to update user:", username); // Log the username being updated
    console.log("New username:", newUsername); // Log new username
    console.log("Password:", password); // Log password

    // Build query based on provided fields
    let query = 'UPDATE users SET ';
    let params = [];

    // Conditionally update username and password
    if (newUsername) {
        query += 'username = ?, ';
        params.push(newUsername); // Add new username to parameters
    }
    if (password) {
        query += 'password = ?, ';
        params.push(password); // Add password to parameters
    }

    // Remove trailing comma and space
    query = query.slice(0, -2); // Remove the last comma and space
    query += ' WHERE username = ?';
    params.push(username); // Add the original username as a filter

    console.log("Final query:", query); // Log the final query for debugging
    console.log("Query parameters:", params); // Log query parameters for debugging

    // Execute the query
    db.query(query, params, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error updating user' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User updated successfully!' });
    });
});

// Delete a user
app.delete('/api/users/:username', (req, res) => {
    const { username } = req.params;
    const sql = 'DELETE FROM users WHERE username = ?';
    db.query(sql, [username], (error, results) => {
        if (error) return res.status(500).json({ message: 'Error deleting user' });
        res.json({ message: 'User deleted successfully!' });
    });
});

// Products CRUD endpoints

// GET request to fetch all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await queryDatabase('SELECT * FROM products');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST request to add or update a product
app.post('/api/products', async (req, res) => {
    const { id, name, description, category, price, quantity } = req.body;
    let sql = '';
    let params = [name, description, category, price, quantity];

    if (id) {
        sql = 'UPDATE products SET name=?, description=?, category=?, price=?, quantity=? WHERE id=?';
        params.push(id);
    } else {
        sql = 'INSERT INTO products (name, description, category, price, quantity) VALUES (?, ?, ?, ?, ?)';
    }

    try {
        await queryDatabase(sql, params);
        res.status(201).json({ message: 'Product saved successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT request to update product quantity (Add or Deduct)
app.put('/api/products/:id/quantity', async (req, res) => {
    const { id } = req.params;
    const { quantityChange, type } = req.body;

    if (typeof quantityChange !== 'number' || quantityChange <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive number.' });
    }

    try {
        const [currentProduct] = await queryDatabase('SELECT quantity FROM products WHERE id = ?', [id]);
        
        if (!currentProduct) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        const currentQuantity = currentProduct.quantity;
        let newQuantity = 0;

        if (type === 'add') {
            newQuantity = currentQuantity + quantityChange;
        } else if (type === 'deduct') {
            if (currentQuantity < quantityChange) {
                return res.status(400).json({ error: 'Insufficient stock to deduct.' });
            }
            newQuantity = currentQuantity - quantityChange;
        } else {
            return res.status(400).json({ error: 'Invalid operation type. Use "add" or "deduct".' });
        }

        await queryDatabase('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, id]);

        await logTransaction(type, id, quantityChange);
        
        res.json({ message: 'Product quantity updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product quantity.' });
    }
});
// DELETE request to delete a product by ID
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await queryDatabase('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});



// Start server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
