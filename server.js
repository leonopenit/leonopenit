const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const DATA_PATH = path.join(__dirname, 'dishes.json');

// 輔助函式：讀取 JSON
const readData = () => {
    try {
        if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, '[]');
        const data = fs.readFileSync(DATA_PATH, 'utf8');
        return JSON.parse(data || '[]');
    } catch (e) { return []; }
};

// 輔助函式：寫入 JSON
const writeData = (data) => {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
};

// 1. 獲取所有菜品
app.get('/api/dishes', (req, res) => {
    res.json(readData());
});

// 2. 新增菜品
app.post('/api/dishes', (req, res) => {
    const dishes = readData();
    const newDish = {
        id: Date.now(),
        category: req.body.category,
        name: req.body.name,
        desc: req.body.desc,
        price: Number(req.body.price),
        img: req.body.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
    };
    dishes.push(newDish);
    writeData(dishes);
    res.send('<script>alert("菜品新增成功！"); window.location.href="/admin.html";</script>');
});

// 3. 修改菜品 (更新)
app.put('/api/dishes/:id', (req, res) => {
    const id = Number(req.params.id);
    let dishes = readData();
    const index = dishes.findIndex(d => d.id === id);
    
    if (index !== -1) {
        dishes[index] = {
            id: id,
            category: req.body.category,
            name: req.body.name,
            desc: req.body.desc,
            price: Number(req.body.price),
            img: req.body.img
        };
        writeData(dishes);
        res.json({ success: true, message: '修改成功' });
    } else {
        res.status(404).json({ success: false, message: '找不到該菜品' });
    }
});

// 4. 刪除菜品
app.delete('/api/dishes/:id', (req, res) => {
    const id = Number(req.params.id);
    let dishes = readData();
    const filtered = dishes.filter(d => d.id !== id);
    
    if (dishes.length !== filtered.length) {
        writeData(filtered);
        res.json({ success: true, message: '刪除成功' });
    } else {
        res.status(404).json({ success: false, message: '找不到該菜品' });
    }
});

app.listen(PORT, () => {
    console.log(`伺服器成功啟動於 Port: ${PORT}`);
});
