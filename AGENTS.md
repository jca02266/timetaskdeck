# Project Information for Agents

## Deployment
このプロジェクトは、GitHub の `master` ブランチへのプッシュをトリガーとして、Netlify への自動デプロイが行われます。
`npm run deploy` などの手動デプロイスクリプトは不要です。

## Git Operations / Git操作
- **プッシュ前には必ず `npm run build` （または `npx tsc --noEmit`）を実行し、ビルドエラーがないことを確認してください。** Netlify でのデプロイ失敗を防ぐため、この工程は必須です。
