# Heldendicht 系統架構總覽

> 這份文件整理目前整個系統的路由、資料庫、權限模型、儲存架構與共用程式碼模式,給開發者或其他 LLM 快速掌握全貌用。內容會隨系統演進而過時,發現不一致時以程式碼本身為準。

## 專案簡介

Heldendicht 是一個多世界觀(TRPG/世界觀共筆)協作平台:使用者可以建立「世界觀」,在裡面建立地點/物產/角色等「節點」內容、拉關係線、寫故事時間軸,並支援跨世界觀的角色身分展示。

**重要:資料庫 schema 不在這個 git repo 裡。** `schema.sql`、`migrations/`、`RLS_POLICIES.md`(記錄每一次資料庫設計決策的原因)存放在專案根目錄的**同層資料夾** `../database`,不進 git 版本控制,而是另外遞交管理。修改資料庫結構時,務必連同那份文件一起更新,不要只改這個 repo 裡的程式碼。

---

## 1. 技術棧

- **Next.js 16.3.5**(App Router)+ **React 19.2.8**——注意這個版本把 `middleware.ts` 改名成 `proxy.ts`,函式也從 `middleware()` 改成 `proxy()`,行為相同
- **Supabase**:`@supabase/supabase-js` + `@supabase/ssr`(cookie-based SSR 認證)。沒有 ORM,直接用型別化的 PostgREST 查詢,型別來自產生出來的 `src/lib/supabase/database.types.ts`
- **Zod v4**:所有 Server Action 的表單驗證(注意 v4 API 用 `{ error: "..." }` 而不是舊版的 `{ message: "..." }`)
- **d3-force**:純伺服器端(無 DOM)計算「故事地圖」的 force-directed graph 排版,固定跑 300 tick 後停止,靜態輸出成 SVG,不是即時互動模擬
- **Tailwind CSS v4**、**TypeScript 5**、**ESLint 9**
- `server-only` 套件標記 admin client / DAL / 部分 media helper,避免不小心被 Client Component import 進客戶端 bundle 造成 build 失敗

## 2. 路由地圖

### 公開站台(`src/app/(site)/` 群組)

| 路由 | 說明 |
|---|---|
| `/` | 行銷首頁 |
| `/login`、`/signup`、`/forgot-password`、`/reset-password` | 認證流程(signup 走邀請碼制) |
| `/rules` | 站方規則 |
| `/staff` | 站方聯絡人個人頁的穩定捷徑(依 `display_name` 查,不怕改 username) |
| `/worlds` | 公開世界觀列表 |
| `/worlds/[slug]` | 世界觀首頁(分頁式:總覽/內容目錄/搜尋/近期變更/規則) |
| `/worlds/[slug]/map` | 唯讀「故事地圖」——節點/關係線/WikiLink 的 force-graph,純 SVG |
| `/worlds/[slug]/nodes/[nodeSlug]` | 公開節點詳細頁 |
| `/worlds/[slug]/relationships/[id]` | 公開關係線詳細頁 |
| `/worlds/[slug]/story`、`/story/chapters/[chapterId]` | 公開故事時間軸 |
| `/u/[username]` | 公開個人頁 |
| `/u/[username]/personas/[personaId]` | 跨世界觀角色身分展示頁 |
| `/auth/confirm` | Supabase email/OTP 確認的 route handler |

### 後台(`src/app/dashboard/...`)

認證只靠 `src/proxy.ts` 做「樂觀導向」(未登入導去 `/login`),**真正的權限邊界一律是資料庫 RLS**,不是這層。

| 路由 | 說明 |
|---|---|
| `/dashboard` | 後台首頁 |
| `/dashboard/profile` | 個人頁面編輯(暱稱/網址代號/自介/頭貼/橫幅/密碼/跨世界觀角色身分) |
| `/dashboard/messages`、`/messages/[userId]` | 私訊收件匣/對話串 |
| `/dashboard/worlds/new` | 建立世界觀 |
| `/dashboard/worlds/[slug]` | 世界觀管理首頁 |
| `/dashboard/worlds/[slug]/settings` | 世界觀設定(含刪除申請) |
| `/dashboard/worlds/[slug]/members` | 成員管理 |
| `/dashboard/worlds/[slug]/categories`、`/categories/[categoryId]/fields` | 內容分類 CRUD + 分類欄位設定 |
| `/dashboard/worlds/[slug]/character-template` | 角色必填欄位 + 補充區塊範本統一設定頁 |
| `/dashboard/worlds/[slug]/characters/new` | 新增角色(手動填 / 貼文字匯入) |
| `/dashboard/worlds/[slug]/nodes/new` | 新增一般節點 |
| `/dashboard/worlds/[slug]/nodes/[nodeSlug]` | 節點編輯頁——全站最大的頁面,整合編輯/審核/附件/分類欄位/角色欄位/時間軸/媒體上傳 |
| `/dashboard/worlds/[slug]/relationships/new`、`/relationships/[id]` | 關係線 CRUD(刪除走請求制) |
| `/dashboard/worlds/[slug]/story`、`/story/chapters/...` | 故事時間軸撰寫 |
| `/dashboard/worlds/[slug]/worldmap`、`/worldmap/layers` | 像素世界地圖(底圖+節點標點,跟上面的 force-graph 地圖是不同概念) |
| `/dashboard/worlds/[slug]/reports` | 檢舉列表 |
| `/dashboard/worlds/[slug]/rules` | 世界觀規則 |

**站方專用**(每頁各自再檢查一次 `is_site_admin()` RPC,不只靠 proxy):
`/dashboard/admin/invite-codes`、`/dashboard/admin/reset-password`、`/dashboard/admin/rules`、`/dashboard/admin/world-deletion-requests`

## 3. 資料庫 Schema(以領域分組)

### Enum 型別

`site_role`、`world_role`、`membership_status`、`node_type`(含 `unspecified` 給 WikiLink 自動佔位節點)、`node_status`、`edit_mode`、`character_type`、`relationship_status`、`relationship_direction`、`world_deletion_request_status`、`relationship_deletion_request_status`、`note_visibility`、`report_target_type`、`report_status`、`story_scope`、`attachment_kind`、`notification_type`、`field_input_type`

### 依領域分組的資料表

| 領域 | 表 | 重點 |
|---|---|---|
| 使用者/權限 | `profiles`、`invite_codes`、`invite_code_redemptions`、`follows` | 邀請碼註冊制;關注純社交,不影響內容可見度 |
| 世界觀核心 | `worlds`、`world_deletion_requests`、`world_memberships`、`world_map_layers` | 刪除世界觀一律走請求+站方核准,不能直接刪 |
| 分類欄位系統 | `world_content_categories`、`world_category_fields`、`category_field_values`、`world_character_fields`、`character_field_values`、`world_section_templates`、`site_rule_fields`、`world_rule_fields` | 兩層分類階層;必填/選填欄位;簡答/下拉選單/橫條拉桿三種輸入類型 |
| 節點與內容 | `nodes`(核心多型表)、`node_revisions`、`node_attachments`、`node_sections`、`wikilinks` | `wikilinks` 全自動 trigger 維護,含自動建立紅字佔位節點 |
| 角色系統 | `characters`(1:1 掛在 `nodes` 上,`node_type='character'`)、`character_personas`(跨世界觀身分)、`character_timeline_events` | persona 刪除只解除連結,不刪節點 |
| 關係與社交圖 | `relationships`、`relationship_deletion_requests` | 硬刪除也要走請求+核准 |
| 故事時間軸 | `story_chapters`(`scope` 區分官方/角色個人)、`story_steps` | |
| 個人筆記 | `notes` | 結構上完全隔離,`private` 筆記連 staff/site_admin 都看不到 |
| 社交/通知 | `notifications`、`direct_messages` | 通知只由 trigger 寫入;「待審核數量」用即時 RPC 算,不用通知表 |
| 檢舉/審核 | `reports`、`nodes` 上的審核欄位(`status`/`reviewed_by`/`reviewed_at`/`review_note`) | staff 只能核准/駁回會員節點,不能直接改內容 |

## 4. 權限模型

### 角色概念

- **`site_role`**(`profiles.site_role`):全站層級,`site_admin` / `user`。site_admin 幾乎在每條 policy 都是萬用覆蓋
- **`world_role`**(`world_memberships.role`):世界觀層級,`admin`(主辦)/ `editor`(編輯)/ `member`(一般成員)。程式碼裡「staff」= admin ∪ editor
- **`membership_status`**:`active` / `banned`,被封鎖的成員資格在所有角色檢查裡都會被排除

### 核心 helper functions

都是 `SECURITY DEFINER` + `stable`,並用 `coalesce(..., false)` 包起來避免 NULL 在 guard trigger 裡被誤判成通過:

| 函式 | 用途 |
|---|---|
| `is_site_admin()` | 是否為全站管理員 |
| `world_role(world_id)` | 目前使用者在該世界觀的角色 |
| `is_world_member/staff/admin(world_id)` | 是否為成員/staff/admin |
| `world_is_public(world_id)` | 世界觀是否公開 |
| `can_view_world_content(world_id)` | 內容可見度總閘門:公開世界觀 OR 成員 OR site_admin |
| `can_edit_node(node_id)` | 共用的「能不能編輯這個節點」邏輯——staff/site_admin、建立者本人、或(collaborative 模式下的世界觀成員);被附件/區塊/時間軸/欄位值等一大票子資源複用 |
| `owns_character(node_id)` | 是否擁有這隻角色(給角色個人時間軸用) |
| `creator_is_world_staff(creator_id, world_id)` | 節點的「建立者」是不是 staff(不是呼叫者)——決定 staff 能不能直接改動另一個 staff 建的節點 |
| `public_world_memberships(user_id)` | 給公開個人頁「參加的世界觀」用,只回傳公開世界觀(或關注者也能看到私人世界觀)的有效成員資格 |
| `staff_review_summary()` | 即時算出待審核節點數+未結檢舉數,給後台角標用,不是存起來的通知 |

### RLS 慣例

- 每張表都開 RLS,policy 命名 `<table>_<動詞>[_限定詞]`
- **SELECT**:內容類表通常是「(未拒絕 AND 可見世界觀) OR 建立者本人 OR staff OR site_admin」;子資源表(附件/區塊/時間軸/欄位值)用 `EXISTS (SELECT 1 FROM nodes WHERE ...)` 子查詢對應到節點的可見度,不重複寫一次判斷邏輯
- **INSERT**:`with check` 要求 `creator_id`/`uploader_id`/`author_id = auth.uid()`,加上角色檢查
- **UPDATE**:內容編輯多半用 `can_edit_node()`;結構性/設定類表用角色判斷;`node_revisions`、`wikilinks` 等表故意不開 UPDATE policy(只能新增)
- **DELETE**:持續收斂——世界觀、關係線的硬刪除已經拿掉,只留請求+核准制,直接 DELETE policy 幾乎不存在
- **RLS 顆粒度不夠時用 trigger 補**:例如 staff 只能改節點的 `status`/`review_note`、不能碰 `title`/`content`(`guard_node_content_by_staff`);世界地圖座標鎖死只有 staff 能動(`guard_node_map_position`);私訊只有 `read_at` 能被收件者改
- **Storage bucket 是唯一不靠 RLS 把關的地方**:私有 bucket 完全沒開 `storage.objects` RLS policy,存取權限寫在 Server Action 裡——先用一般 client 查權限,通過才用 `service_role` client 操作(細節見第 6 節)

## 5. 關鍵設計決策演進

完整版在 `../database/RLS_POLICIES.md`(25 條編號決策,含每次修改的原因跟已驗證情境)。近期比較重要的幾條:

- **#19 權限總體檢**(migration 020):世界觀/關係線刪除都改成請求+核准制;staff 改會員節點只能審核不能直接改內容;staff 不能直接動別人的 PC/NPC
- **#20 分類預設欄位**(舊機制,已被 #24 取代):建立節點自動帶入 `node_sections` 草稿,純預填不驗證
- **#22** 補上「未分類節點」漏洞:一般節點(不含角色)不能建立成未分類
- **#23 角色卡範例值**:整併必填欄位+補充區塊範本成一個後台頁,加範例值做「複製範本」功能
- **#24 分類欄位結構化**:從「自動帶入草稿」整個換成結構化必填/選填欄位(`category_field_values` 表),取代 #20,套用範圍涵蓋所有節點類型(含角色)
- **#25 欄位輸入類型**:兩套欄位系統(分類欄位、角色欄位)統一支援簡答/下拉選單/橫條拉桿三種輸入類型,`field_input_type` enum + CHECK constraint 在 DB 層擋不合理設定,驗證邏輯集中在 `src/lib/fieldTypeConfig.ts`/`src/lib/fieldValueValidation.ts` 共用

## 6. 媒體/儲存架構

### Storage Buckets

| Bucket | 公開? | 內容 | 存取方式 |
|---|---|---|---|
| `world-maps` | 私有 | 世界地圖底圖 | 無 storage RLS,Server Action + service_role |
| `node-attachments` | 私有 | 節點圖片/PDF 附件 | metadata 先過 RLS 篩過可見度,才簽 600 秒 URL |
| `profile-media` | **公開** | 頭貼/橫幅/跨世界觀角色身分頭貼 | 純字串組公開網址,不用簽 URL |
| `world-media` | 私有 | 世界觀橫幅/Icon | 同 world-maps 模式 |
| `node-media` | 私有 | 節點代表圖、角色頭貼/立繪、時間軸事件圖片 | 同 node-attachments 模式,簽 300 秒 URL |

### 兩種上傳模式

1. **兩段式簽名上傳**(現在幾乎所有實際檔案上傳都用這套):
   Server Action 驗證檔案大小/類型/權限 → 呼叫 `service_role` 的 `createSignedUploadUrl()` 簽發上傳票券 `{path, token}` → **瀏覽器直接把檔案傳到 Supabase Storage,完全不經過我們自己的 server** → 上傳成功後再呼叫一次 Server Action(`finalize*Upload`)把路徑寫回資料庫、刪舊檔、`revalidatePath`。
   採用這套的理由:單一 Server Action 直接收檔案內容當 request body 會撞到 Vercel serverless function 的 request body 大小限制,大圖片/PDF 很容易整個上傳失敗——這是這個 session 修過的實際 bug(個人頭貼/角色身分頭貼上傳失敗),根因跟節點附件/世界地圖底圖當初改用這套的原因一樣。
2. **單步直接上傳**(只用在不需要把檔案本身存成 blob 的場合):GeoJSON 地圖資料匯入、貼上文字匯入角色——整份內容當一般表單欄位送進 Server Action,解析完直接寫進資料表,沒有 Storage bucket 涉及。

上傳前會用 `src/lib/imageResize.ts` 的 `downscaleImageIfNeeded()` 在瀏覽器端把過大的圖片(手機拍照常見)用 canvas 縮小到最大邊長 2400px,PNG/WebP 保持原格式無損,其他格式才轉 JPEG——純效能優化,不是權限機制。

## 7. 共用程式碼模式

| 檔案 | 用途 |
|---|---|
| `src/lib/supabase/{client,server,admin}.ts` | 三種 Supabase client;`admin.ts`(service_role,略過所有 RLS)明確限定只給邀請碼註冊+私有 bucket 存取用,不該拿來查一般業務表 |
| `src/lib/dal.ts` | `requireUser()`/`getCurrentUser()`——明確只是 UX 導向(未登入導去登入頁),不是安全邊界,真正權限一律靠 RLS |
| `src/lib/unwrapRelation.ts` | `unwrapRelation()`/`toRelationArray()`,統一處理 PostgREST embed 關聯的陣列/物件不一致問題,全站大量檔案在用 |
| `src/lib/orderedList.ts` | `moveOrderedItem()`,9 種不同的「可排序清單」功能(世界規則、分類欄位、角色欄位、章節段落、地圖圖層……)共用同一套上移/下移邏輯 |
| `src/lib/fieldTypeConfig.ts`、`src/lib/fieldValueValidation.ts` | 分類欄位、角色欄位兩套系統共用的欄位類型解析+驗證邏輯 |
| `src/lib/storymap-layout.ts` | d3-force 排版邏輯,公開故事地圖跟後台 `StoryMapGraph` 共用同一份 |
| `src/lib/characterTemplate.ts`、`src/lib/textImport.ts` | 純函式(無 I/O),同時給伺服器端驗證跟前端即時預覽用;純 regex 解析,沒有用到 AI/LLM |
| `src/components/DynamicFieldInput.tsx`、`src/components/FieldTypeConfigFields.tsx` | 欄位類型的填答輸入元件 / 後台設定元件,分類欄位跟角色欄位共用 |

### 認證流程重點

- `src/proxy.ts`(Next.js 16 把 `middleware.ts` 改名)只做「未登入導去 `/login`」的樂觀檢查,明確不是安全邊界
- 註冊是自訂的 4 步流程(不能只靠 Supabase 內建的公開註冊 API,那樣邀請碼擋不住):驗證邀請碼(不消耗)→ `service_role` 建立帳號 → 用 anon client 登入拿 session → 呼叫 `redeem_invite_code()` RPC 真正消耗邀請碼(row lock 避免超賣);最後一步失敗會刪掉剛建立的帳號,避免留下沒消耗有效邀請碼的帳號
- 改密碼會先用 `signInWithPassword()` 重新驗證目前密碼,才呼叫 `updateUser()`——避免共用電腦上的 session 被拿來直接改密碼
