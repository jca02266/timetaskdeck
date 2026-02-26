# Project Information for Agents

## Deployment
このプロジェクトは、GitHub の `master` ブランチへのプッシュをトリガーとして、Netlify への自動デプロイが行われます。
`npm run deploy` などの手動デプロイスクリプトは不要です。

## Browser Automation / 自動ブラウザ操作
ブラウザの自動操作（browser_subagentなど）は実行に時間がかかるため、ユーザーから明示的な指示がない限り**勝手に行わない**でください。テストなどはユーザーに確認してから実施するようにしてください。
## Git Operations / Git操作
【最重要要件】いかなる理由・いかなる文脈であっても、AI自身が自律的に（ツールを使って） `git commit` や `git push` を実行することは**絶対に禁止**します。
- 作業が完了した場合は、ユーザーに「コミット・プッシュしてよいか」を常に確認してください。
- **プッシュ前には必ず `npm run build` （または `npx tsc --noEmit`）を実行し、ビルドエラーがないことを確認してください。** Netlify でのデプロイ失敗を防ぐため、この工程は必須です。
