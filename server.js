const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const DATA_PATH = path.join(__dirname, 'dishes.json');
const CAT_PATH = path.join(__dirname, 'categories.json'); // 新增：分類儲存路徑

// 輔助函式：讀取菜品 JSON
const readData = () => {
    try {
        if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, '[]');
        const data = fs.readFileSync(DATA_PATH, 'utf8');
        return JSON.parse(data || '[]');
    } catch (e) { return []; }
};

// 輔助函式：寫入菜品 JSON
const writeData = (data) => {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
};

// 新增：輔助函式 - 讀取分類 JSON
const readCategories = () => {
    try {
        if (!fs.existsSync(CAT_PATH)) {
            // 預設給三個初始分類
            const defaultCats = ["主廚推薦主食", "人氣特調飲品", "歡聚分享點心"];
            fs.writeFileSync(CAT_PATH, JSON.stringify(defaultCats, null, 2));
            return defaultCats;
        }
        const data = fs.readFileSync(CAT_PATH, 'utf8');
        return JSON.parse(data || '[]');
    } catch (e) { return []; }
};

// 新增：輔助函式 - 寫入分類 JSON
const writeCategories = (data) => {
    fs.writeFileSync(CAT_PATH, JSON.stringify(data, null, 2));
};

// --- API 路由 ---

// 1. 獲取所有分類
app.get('/api/categories', (req, res) => {
    res.json(readCategories());
});

// 2. 新增自訂分類
app.post('/api/categories', (req, res) => {
    const categories = readCategories();
    const newCat = req.body.newCategory ? req.body.newCategory.trim() : "";
    
    if (newCat && !categories.includes(newCat)) {
        categories.push(newCat);
        writeCategories(categories);
        res.send('<script>alert("新分類新增成功！"); window.location.href="/admin.html";</script>');
    } else {
        res.send('<script>alert("分類名稱空白或已存在！"); window.location.href="/admin.html";</script>');
    }
});

// 3. 獲取所有菜品
app.get('/api/dishes', (req, res) => {
    res.json(readData());
});

// 4. 新增菜品
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

// 5. 修改菜品
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

// 6. 刪除菜品
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
