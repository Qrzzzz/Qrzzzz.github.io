---
title: Codex 项目对话重命名
description: 按上海时区的创建日期、统一类型和实际主题整理当前 Codex 项目的对话标题，先预览并确认，再执行重命名。
collection: library
kind: prompt
published: 2026-09-04
updated: 2026-09-04
status: maintained
tags:
  - Codex
  - 对话管理
  - 命名规范
featured: false
lang: zh-CN
---

# Codex 项目对话重命名

<p class="lead">这份提示词用于把当前 Codex 项目的对话标题整理为「日期｜类型｜主题」，以便在侧栏快速辨认任务；所有改名都先列出前后对照，等待确认后执行。</p>

## 提示词简介

日期取自对话的创建时间，并转换为上海时区。类型默认使用英文代码，也可按要求统一使用中文标签；主题依据对话的实际内容概括，不重复项目名。执行范围仅限对话标题，项目名、对话内容、所属项目、顺序、置顶和归档状态均保持不变。无法可靠判断主题或读取创建时间时，保留原标题。

### 适用情境

- 当前项目积累了较多对话，需要用短而具体的标题整理侧栏。
- 希望统一功能、设计、修复、优化、发布、探索、文档与研究任务的命名方式。
- 批量改名前需要逐项核对，确认命名准确后再执行。

::: tip 使用方式
在需要整理的 Codex 项目中发送下方完整提示词。默认使用英文类型代码；如需中文标签，请一并说明。收到 `Before` / `After` 对照表后，检查日期、分类与主题，再确认执行。
:::

## 完整提示词

```md
# Rename conversations in the current Codex project

Rename the conversations in the current Codex project. Only change conversation titles. Never touch the project name.

## Title format

Use this exact format: `MMDD｜TYPE｜Topic`.

### Date

- Use the conversation's `createdAt`, converted to Asia/Shanghai, and format it as `MMDD`.
- Do not use `updatedAt`.
- If `createdAt` is unavailable, keep the original title. Do not guess or substitute another date.

### Type

TYPE must be one of the following. Use the English code by default. Use the Chinese label only if I ask for Chinese.

| English code | Chinese label | Meaning |
| --- | --- | --- |
| FEA | 功能 | feature |
| DES | 设计 | design |
| FIX | 修复 | bug fix |
| OPT | 优化 | optimization |
| REL | 发布 | release |
| EXP | 探索 | exploration |
| DOC | 文档 | docs |
| RES | 研究 | research |

Use one language for TYPE across all titles in a run. Never mix English codes and Chinese labels.

### Topic

- Summarize what the conversation is actually about, using its content and available context.
- Do not repeat the project name.
- Keep titles short and specific. They show in the sidebar.
- If you cannot tell the topic, keep the original title. Do not guess.

## Scope

Change nothing except conversation titles in the current project: not the project name, conversation content, project assignment, order, pin state, or archive state.

## Examples

### English types (default)

Before: Improve batch text display
After:  0903｜OPT｜Batch text display

Before: New feature discussion
After:  0901｜DES｜UI alignment check

### Chinese types (on request)

Before: 优化批次文字显示
After:  0903｜优化｜批次文字显示

Before: 提交代码到 GitHub
After:  0813｜发布｜提交代码到GitHub

## Preview and confirmation

Before making any change, output only a two-column Markdown table with this exact header:

| Before | After |
| --- | --- |

List the original and proposed titles in the table. For a conversation whose title must be kept, use its original title in both columns.

Wait for my confirmation. Do not rename anything before I confirm.

After confirmation, apply only the approved title changes. After renaming, report only the results.
```
