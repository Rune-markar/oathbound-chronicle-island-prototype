# ChatGPT提出用：酒場会話プログラム

以下のZIPを添付し、この文書の「ChatGPTへの依頼文」をメッセージとして送ってください。

## ChatGPTへの依頼文

添付したファイルは、ブラウザ戦略ゲーム「LEVIATHAN COVENANT」に実装した酒場会話プログラムです。

次の仕様を満たす実装として内容を確認してください。

1. 村へ移動して酒場へ入り、一般冒険者または固有人物を選んで会話する。
2. 初対面では「穏やか」「威圧的」「気さく」の三つから振る舞いを選ぶ。
3. 相手には候補IDから決まる性格があり、振る舞いとの相性が第一印象に影響する。
4. 主人公の魅力が第一印象の成功率、判断力が人物情報の発見率に影響する。
5. 会話を重ねると、性格、得意分野、レベル、各能力値が順番に判明する。
6. 初対面で好印象を得ると「同行を頼む」が解禁され、加入後は村生活と探索のパーティー状態へ同期される。
7. 会話回数、最初の振る舞い、第一印象ボーナス、判明情報、直前の反応はセーブ状態へ保存される。
8. 酒場は専用の施設画面と人物立ち絵付き会話モーダルを持ち、全体画面の即時ボタンにはしない。

主要な確認箇所：

- `src/adventure-system.js`
  - `NPC_GREETING_APPROACHES`
  - `NPC_PERSONALITIES`
  - `socialCandidateView()`
  - `getTavernCandidates()`
  - `interactWithNpcCandidate()`
  - `inviteTavernCandidate()`
- `src/app.js`
  - `beginNpcSocialConversation()`
  - `renderNpcSocialConversation()`
  - `renderTavernAdventureBoard()`
  - `data-npc-greeting-approach` と `data-talk-npc-candidate` のイベント処理
- `styles.css`
  - 酒場候補カードおよび会話画面の表示
- `tests/adventure-system.test.mjs`
  - 第一印象、能力値効果、情報開示、勧誘のテスト

検証済みの状態：

- `npm run check`：357テストすべて成功
- `git diff --check`：成功
- 実ブラウザで、村への移動、酒場入店、一般冒険者一覧、人物選択、会話モーダル、挨拶三択まで確認

レビューする場合は、既存の村生活、依頼、探索、パーティー状態との接続を維持し、並行する別会話システムを新設しないでください。変更案を出す場合は、対象ファイル、理由、互換性への影響、追加すべきテストを明示してください。

## ZIPの内容

- `CHATGPT_TAVERN_CONVERSATION_HANDOFF.md`：この引き継ぎ文書
- `src/adventure-system.js`：会話・人物関係・勧誘の共有ロジック
- `src/app.js`：酒場および会話UI
- `src/village-life.js`：村施設とパーティー状態
- `styles.css`：酒場・会話画面のスタイル
- `tests/adventure-system.test.mjs`：会話ロジックのテスト
- `tests/village-life.test.mjs`：村施設・村生活との統合テスト
- `package.json`：検証コマンド
