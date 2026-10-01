# StarlingWorld 🌏

在 3D 地球上记录你去过的每一个地方。iOS / Android 手机 App（基于 Capacitor），同一套代码也能作为网页 / PWA 运行。

## 功能

- **夜景 3D 地球**：城市灯光纹理，去过的城市是发光的光点，按时间用光弧连成旅行路线；拉近时显示地名
- **盖章**：轻触国家 →「盖章 · 我去过」，盖下一枚墨水印章
- **旅行手账**：点阵纸上的时间线，记下地点、日期和随笔
- **我的护照**：所有印章（形状、墨色、角度各不相同），以及各大洲进度
- **搜索添加**：搜索城市 / 景点（OpenStreetMap），或直接在地球上轻点
- **备份**：数据只存在本机，可导出 / 恢复 JSON 备份
- 霞鹜文楷字体、纸张质感、悬浮胶囊菜单、触感反馈、刘海屏适配

## 在线体验

**https://ssbabysong.github.io/StarlingWorld/** —— 用手机浏览器打开，可「添加到主屏幕」像 App 一样使用。每次推送到 `main` 自动部署。

## 开发

```bash
npm install
npm run dev        # 在浏览器里开发（用手机尺寸预览效果最好）
npm run lint
npm run build
```

## 在手机上运行

**Android**（需要 [Android Studio](https://developer.android.com/studio)）：

```bash
npm run android    # 构建 → 同步 → 用 Android Studio 打开，点 ▶ 运行到手机或模拟器
```

或者不装任何东西：每次推送到 `main`，GitHub Actions 会自动构建一个调试版 APK，
在仓库的 **Actions → Android APK → Artifacts** 里下载，传到安卓手机上安装即可。

**iOS**（需要 Mac + [Xcode](https://developer.apple.com/xcode/)）：

```bash
npm run ios        # 构建 → 同步 → 用 Xcode 打开，选择你的 iPhone 点 ▶ 运行
```

首次在真机运行需要在 Xcode 的 *Signing & Capabilities* 里选择你的 Apple ID 团队。

修改网页代码后，执行 `npm run cap:sync` 把最新代码同步进原生工程。

## 项目结构

```
src/
  App.tsx              应用外壳：标签页、底部弹层、状态
  components/
    GlobeView.tsx      3D 地球（react-globe.gl / three.js）与触摸点选
    sheets.tsx         底部弹层：搜索、添加地点、国家、地点详情
    screens.tsx        「足迹」时间线与「我的世界」统计页
    Sheet.tsx          可下滑关闭的底部弹层
  geo.ts               国家数据、点在多边形内判断、地点搜索
  storage.ts           本地存储与备份
  native.ts            触感、状态栏、分享等原生能力
android/ ios/          Capacitor 原生工程
assets/                图标与启动页源文件（npx @capacitor/assets generate）
```

## 鸣谢

地球纹理来自 [three-globe](https://github.com/vasturiano/three-globe) 示例，国家边界来自 [Natural Earth](https://www.naturalearthdata.com/)（1:110m），
地点搜索由 [OpenStreetMap Nominatim](https://nominatim.org/) 提供。
