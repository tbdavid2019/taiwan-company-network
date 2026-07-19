# 臺灣公司關係網路

以 Vite、React、Tailwind CSS 與 shadcn/ui 建置的臺灣公司關係探索器。本版本是在原始專案基礎上進行的現代化改版。

感謝原作者 [voidful](https://github.com/voidful) 建立原始專案與整理資料；本 repository 由 [tbdavid2019](https://github.com/tbdavid2019) 維護後續的 Vite、UI 與部署調整。

## 本機開發

需要 Node.js 22 或更新版本：

```bash
npm install
npm run dev
```

正式建置：

```bash
npm run build
```

產物位於 `dist/`。若使用 `gh-pages` 套件部署到 GitHub Pages：

```bash
npm run deploy
```

預設網址為：
`https://tbdavid2019.github.io/taiwan-company-network/`

## 資料與圖表說明

目前資料放在 `public/data/`，前端會依 GitHub Pages 的 base path 載入。圖表顯示的是資料來源中的法人／公司關係索引；在資料來源的關係語意尚未完全驗證前，畫面不將每條邊直接解讀為持股或投資。

## 資料來源

臺灣公司資料來自經濟部商業司及財政部營業稅籍資料，包含公司狀況、公司名稱、資本總額、代表人、所在地、設立日期、變更日期及董監事等欄位。

資料來源：<http://gcis.nat.g0v.tw/>

## 致謝

- 原始專案：<https://github.com/voidful/taiwan-company-network>
- UI template：Creative Tim Argon Dashboard React。

## 授權

本專案新增與修改的程式碼以 GNU Affero General Public License v3.0 或更新版本（AGPL-3.0-or-later）發布，詳見 [LICENSE](LICENSE)。原始 Creative Tim／Argon 程式碼保留其 MIT 授權與著作權聲明，詳見 [LICENSE-MIT](LICENSE-MIT)。

本專案為網路應用程式；若你部署修改版本，請同時提供對應原始碼。頁面 footer 的 Source code 連結會指向本 repository。

## 相關名詞

- 自然人：每個生物學意義上的人。
- 法人：依法律所創設的權利義務主體。
- 公法人、私法人：法人分類中的兩種主要類型。
