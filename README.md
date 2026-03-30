# Habit Tracker Mini Program (习惯打卡 + 轻量统计)

一个微信小程序练手项目：习惯管理、每日打卡、连续天数、周/月统计。

## 功能（MVP）
- 习惯列表：创建/编辑/删除
- 每日打卡：按天记录是否完成
- 待办事项：管理日常待办，支持标记完成/删除
- 统计：
  - 当前连续天数（streak）
  - 近 7 天完成率
  - 本月完成天数

## 技术方案
- 前端：微信小程序原生（miniprogram）
- 后端：CloudBase 云开发
- 存储：CloudBase 文档数据库（NoSQL）
- 云函数：login, sync, todos

## 云开发环境
- 环境ID: `zcsimple1-yun001-5fwuf5q0949ed7d`
- 环境: zcsimple1-yun001 (ap-shanghai)
- 数据库集合:
  - `habits`: 习惯数据（安全规则：用户只能访问自己的数据）
  - `checkins`: 打卡记录（安全规则：用户只能访问自己的数据）
  - `todos`: 待办事项（安全规则：用户只能访问自己的数据）

## 快速开始
1. 用微信开发者工具导入项目目录
2. AppID 使用: `wx980f2fed4c1f4905`
3. 点击"编译"即可在模拟器中预览
4. 点击"预览"扫码在微信中体验

## 云函数说明
- **login**: 用户登录，获取 openid
- **sync**: 同步习惯和打卡数据到云端
- **todos**: 待办事项增删改查

## 部署信息
- 部署时间: 2026-03-30
- 云函数运行时: Nodejs16.13
- 控制台: https://tcb.cloud.tencent.com/dev?envId=zcsimple1-yun001-5fwuf5q0949ed7d#/

## 目录结构
- `miniprogram/` 小程序源码
  - `pages/index/` 习惯打卡首页
  - `pages/todos/` 待办事项页面
  - `pages/stats/` 统计页面
  - `pages/habit-form/` 习惯表单
- `cloudfunctions/` 云函数
  - `login/` 登录云函数
  - `sync/` 同步云函数
  - `todos/` 待办事项云函数
- `docs/` 设计与 PRD

## Roadmap
- ✅ 云开发（登录/多端同步）
- 订阅消息提醒
- 数据导出
