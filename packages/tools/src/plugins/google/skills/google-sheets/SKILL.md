---
name: google-sheets
description: Inspect Google Sheets exports and prepare spreadsheet analysis or edits with explicit tab, formula and native-feature coverage.
---

# Google 表格

The gateway base is `{skillGatewayUrl}/api/skill-gateway/google`. Read [access and coverage](references/access.md) before choosing a retrieval or output route.

## Workflow

Resolve the spreadsheet file and requested tabs/ranges before analysis. CSV export may cover only one sheet and loses formulas, formatting, charts and validation. Never infer that it represents the full workbook. Use a supplied XLSX/native structured read when formulas, multiple tabs or native cell types matter. Preserve numeric/date/identifier types, units and distinctions between missing values and zero. For local workbook work use the spreadsheets Skill when enabled, with independent expected results and actual recalculation. Do not claim formula/native-feature verification from a CSV or that a local XLSX was uploaded.

Read [preservation and delivery](references/preservation.md) for editing and template requests. Use the supplied facts and current project instructions; ask only for information that materially blocks the requested task.
