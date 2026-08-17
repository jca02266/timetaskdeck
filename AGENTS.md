# Project Information for Agents

## Deployment
このプロジェクトは、GitHub の `master` ブランチへのプッシュをトリガーとして、Netlify への自動デプロイが行われます。
`npm run deploy` などの手動デプロイスクリプトは不要です。

Netlifyへ反映する変更では、デプロイ前に `package.json` と `package-lock.json` のバージョンを更新してください。
Settings画面は `package.json` のバージョンを表示するため、両ファイルの値を一致させてください。
通常の変更ではパッチバージョンを一つ上げ、互換性を壊す変更や機能追加ではSemantic Versioningに従って更新区分を判断してください。

## Git Operations / Git操作
- **プッシュ前には必ず `npm run build` （または `npx tsc --noEmit`）を実行し、ビルドエラーがないことを確認してください。** Netlify でのデプロイ失敗を防ぐため、この工程は必須です。
