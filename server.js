const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // 處理檔案上傳
const https = require('https');   // 用來呼叫 duk.tw API

const app = express();
const PORT = process.env.PORT || 3000;

// 設定 Multer 記憶體暫存
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const DATA_PATH = path.join(__dirname, 'dishes.json');
const CAT_PATH = path.join(__dirname, 'categories.json');

const readData = () => {
    try {
        if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, '[]');
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8') || '[]');
    } catch (e) { return []; }
};

const writeData = (data) => fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

const readCategories = () => {
    try {
        if (!fs.existsSync(CAT_PATH)) {
            const defaultCats = ["主廚推薦主食", "人氣特調飲品", "歡聚分享點心"];
            fs.writeFileSync(CAT_PATH, JSON.stringify(defaultCats, null, 2));
            return defaultCats;
        }
        return JSON.parse(fs.readFileSync(CAT_PATH, 'utf8') || '[]');
    } catch (e) { return []; }
};

const writeCategories = (data) => fs.writeFileSync(CAT_PATH, JSON.stringify(data, null, 2));

// --- 1. 改用 duk.tw (叮咚圖床) 免費上傳邏輯 ---
app.post('/api/upload', upload.single('imageFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: '沒有上傳檔案' });

    // 將圖片轉為 duk.tw 接收的 Base64 格式
    const base64Image = req.file.buffer.toString('base64');
    const postData = JSON.stringify({ 
        image: base64Image,
        type: 'base64'
    });

    const options = {
        hostname: 'duk.tw',
        path: '/api/v1/upload',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const dukReq = https.request(options, (dukRes) => {
        let body = '';
        dukRes.on('data', (chunk) => body += chunk);
        dukRes.on('end', () => {
            try {
                const responseData = JSON.parse(body);
                // duk.tw 成功時會回傳 status: true，圖片網址在 data.url
                if (responseData.status && responseData.data && responseData.data.url) {
                    res.json({ success: true, imgUrl: responseData.data.url });
                } else {
                    res.status(500).json({ success: false, message: 'duk.tw 上傳失敗' });
                }
            } catch (err) {
                res.status(500).json({ success: false, message: '解析 duk.tw 回傳失敗' });
            }
        });
    });

    dukReq.on('error', (e) => res.status(500).json({ success: false, message: e.message }));
    dukReq.write(postData);
    dukReq.end();
});

// --- 2. 獲取所有分類 ---
app.get('/api/categories', (req, res) => {
    res.json(readCategories());
});

// --- 3. 新增自訂分類 ---
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

// --- 4. 獲取所有菜品 ---
app.get('/api/dishes', (req, res) => {
    res.json(readData());
});

// --- 5. 新增菜品 ---
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

// --- 6. 修改菜品 ---
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
    } else { res.status(404).json({ success: false, message: '找不到該菜品' }); }
});

// --- 7. 刪除菜品 ---
app.delete('/api/dishes/:id', (req, res) => {
    const id = Number(req.params.id);
    let dishes = readData();
    const filtered = dishes.filter(d => d.id !== id);
    if (dishes.length !== filtered.length) {
        writeData(filtered);
        res.json({ success: true, message: '刪除成功' });
    } else { res.status(404).json({ success: false, message: '找不到該菜品' }); }
});

app.listen(PORT, () => console.log(`伺服器成功啟動於 Port: ${PORT}`));
