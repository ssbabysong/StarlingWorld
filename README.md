# StarlingWorld 🌏

记录你在地球上去过的地方：一个可以旋转、缩放的 3D 地球仪，把走过的国家点亮，把去过的城市和景点钉在地球上。

## 功能

- **3D 地球仪**：拖动旋转、滚轮/双指缩放，可开关自动旋转
- **点亮国家**：点击国家 → 标记为「去过」，地球上该国家会变成橙色
- **记录地点**：点击地球任意位置，或搜索城市/景点（OpenStreetMap），填写名称、日期、备注
- **自动识别国家**：添加地点时自动判断所属国家，并一起点亮
- **统计**：去过的国家/地区数、大洲数、地点数、覆盖世界比例
- **列表**：按时间排列的地点列表；按大洲分组的国家列表，点击即可飞到对应位置
- **数据**：自动保存在浏览器本地（localStorage），支持导出/导入 JSON 备份

## 开发

```bash
npm install
npm run dev      # 本地开发
npm run build    # 生产构建
npm run lint     # 代码检查
```

## 技术栈

React 19 · TypeScript · Vite · [react-globe.gl](https://github.com/vasturiano/react-globe.gl)（three.js）

地球纹理来自 [three-globe](https://github.com/vasturiano/three-globe) 示例，国家边界来自 [Natural Earth](https://www.naturalearthdata.com/)（1:110m）。
