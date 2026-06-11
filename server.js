const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // 新增：處理檔案上傳
const https = require('https');   // 新增：用來呼叫 Imgur API

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

// --- 新增：免費上傳到 Imgur 圖床的後端邏輯 ---
app.post('/api/upload', upload.single('imageFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: '沒有上傳檔案' });

    // 將圖片轉為 Imgur 接受的 Base64 格式
    const base64Image = req.file.buffer.toString('base64');
    
    const postData = JSON.stringify({ image: base64Image, type: 'base64' });

    const options = {
        hostname: 'api.imgur.com',
        path: '/3/image',
        method: 'POST',
        headers: {
            'Authorization': 'Client-ID 1c8db183f3dbcb5', // 免費匿名 Client-ID
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const imgurReq = https.request(options, (imgurRes) => {
        let body = '';
        imgurRes.on('data', (chunk) => body += chunk);
        imgurRes.on('end', () => {
            try {
                const responseData = JSON.parse(body);
                if (responseData.success) {
                    // 上傳成功，回傳 Imgur 的永久圖片網址
                    res.json({ success: true, imgUrl: responseData.data.link });
                } else {
                    res.status(500).json({ success: false, message: 'Imgur 上傳失敗' });
                }
            } catch (err) {
                res.status(500).json({ success: false, message: '解析回傳失敗' });
            }
        });
    });

    imgurReq.on('error', (e) => res.status(500).json({ success: false, message: e.message }));
    imgurReq.write(postData);
    imgurReq.end();
});

// --- 原有其他 API 保持不變 ---
app.get('/api/categories', (req, res) => res.json(readCategories()));
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

app.get('/api/dishes', (req, res) => res.json(readData()));

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
