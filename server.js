const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// 允許解析前端傳來的 JSON 與表單資料
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 設定 public 資料夾為靜態網頁目錄
app.use(express.static(path.join(__dirname, 'public')));

// 讀取菜品的路徑
const DATA_PATH = path.join(__dirname, 'dishes.json');

// API 1: 讓前端獲取目前所有菜品
app.get('/api/dishes', (req, res) => {
    fs.readFile(DATA_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: '無法讀取菜品資料' });
        res.json(JSON.parse(data || '[]'));
    });
});

// API 2: 處理後台新增菜品的請求
app.post('/api/dishes', (req, res) => {
    const newDish = {
        id: Date.now(), // 用時間戳當作唯一 ID
        category: req.body.category,
        name: req.body.name,
        desc: req.body.desc,
        price: req.body.price,
        img: req.body.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
    };

    fs.readFile(DATA_PATH, 'utf8', (err, data) => {
        let dishes = [];
        if (!err && data) {
            dishes = JSON.parse(data);
        }
        dishes.push(newDish);

        fs.writeFile(DATA_PATH, JSON.stringify(dishes, null, 2), (err) => {
            if (err) return res.status(500).send('儲存菜品失敗');
            // 新增成功後，自動導回後台管理頁面
            res.send('<script>alert("菜品新增成功！"); window.location.href="/admin.html";</script>');
        });
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`峇露露後端伺服器已成功啟動！`);
    console.log(`>> 前端顧客網頁：http://localhost:${PORT}/index.html`);
    console.log(`>> 後端管理網頁：http://localhost:${PORT}/admin.html`);
});